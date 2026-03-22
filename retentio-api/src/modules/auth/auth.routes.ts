import { Router } from 'express';
import { compare, hash } from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { asyncHandler, validate, authGuard, type JwtPayload } from '../../middlewares';
import { AppError } from '../../shared/types';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const refreshSchema = z.object({
  refresh_token: z.string().optional(),
  refreshToken: z.string().optional(),
}).refine(data => data.refresh_token || data.refreshToken, {
  message: 'Token de atualização é obrigatório',
});

/**
 * V2: JWT agora inclui tenant_id e membership_id.
 * Se o user pertence a mais de um tenant, o login retorna o primeiro ativo.
 * (Futuramente pode ter seleção de tenant no frontend)
 */
function signTokens(payload: Omit<JwtPayload, 'iat' | 'exp'>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const access_token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as any });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const refresh_token = jwt.sign({ sub: payload.sub, membership_id: payload.membership_id, tenant_id: payload.tenant_id }, env.REFRESH_TOKEN_SECRET, { expiresIn: env.REFRESH_TOKEN_EXPIRES_IN as any });
  return { access_token, refresh_token };
}

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  company_name: z.string().min(2),
});

// GET /auth/check-slug/:slug
authRouter.get(
  '/check-slug/:slug',
  asyncHandler(async (req, res) => {
    const slug = (req.params.slug as string)
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-');

    if (slug.length < 3) {
      return res.json({ available: false, message: 'Slug muito curto' });
    }

    const reserved = ['admin', 'api', 'saas', 'support', 'billing', 'config', 'auth', 'login', 'register'];
    if (reserved.includes(slug)) {
      return res.json({ available: false, message: 'Palavra reservada' });
    }

    const existing = await prisma.tenant.findUnique({ where: { slug } });
    res.json({ available: !existing });
  })
);

// POST /auth/register (Self-Service Signup Atômico)
authRouter.post(
  '/register',
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, password, name, company_name } = req.body;

    // 1. Validações Prévias
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new AppError(400, 'Este e-mail já está em uso.', 'USER_EXISTS');
    }

    const slug = company_name.toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-');
    
    const existingTenant = await prisma.tenant.findUnique({ where: { slug } });
    if (existingTenant) {
      throw new AppError(400, 'Este nome de empresa já está em uso para o endereço da conta.', 'SLUG_EXISTS');
    }

    const passwordHash = await hash(password, 10);

    // 2. Transação Atômica (User -> Tenant -> Membership -> Subscription -> Onboarding)
    const result = await prisma.$transaction(async (tx) => {
      // Cria Usuário
      const user = await tx.user.create({
        data: { email, password_hash: passwordHash, name },
      });

      // Cria Tenant (Com Onboarding PENDING)
      const tenant = await tx.tenant.create({
        data: {
          name: company_name,
          slug,
          onboarding_status: 'PENDING',
          onboarding_step: 0,
        },
      });

      // Cria Membership (Role: OWNER)
      const membership = await tx.membership.create({
        data: {
          user_id: user.id,
          tenant_id: tenant.id,
          role: 'OWNER',
        },
      });

      // Cria Subscription TRIAL (14 dias)
      const trialPlan = await tx.plan.findFirst({ where: { key: 'TRIAL' } }) 
                       || await tx.plan.findFirst({ where: { key: 'FREE' } });

      if (trialPlan) {
        await tx.tenant.update({
          where: { id: tenant.id },
          data: { plan_id: trialPlan.id }
        });

        await tx.subscription.create({
          data: {
            tenant_id: tenant.id,
            plan_id: trialPlan.id,
            status: 'TRIAL',
            current_period_start: new Date(),
            current_period_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), 
          }
        });
      }

      // Cria Estado de Onboarding Explícito
      await tx.onboardingState.create({
        data: {
          tenant_id: tenant.id,
          tasks_completed: { 
            company_setup: false, 
            team_added: false, 
            ai_setup: false 
          },
        },
      });

      // Log de Auditoria Inicial
      await tx.auditLog.create({
        data: {
          tenant_id: tenant.id,
          user_id: user.id,
          action: 'TENANT_SIGNUP',
          entity_type: 'TENANT',
          entity_id: tenant.id,
          new_value: { slug, plan: trialPlan?.key }
        }
      });

      return { user, tenant, membership };
    });

    const tokens = signTokens({
      sub: result.user.id,
      membership_id: result.membership.id,
      tenant_id: result.tenant.id,
      email: result.user.email,
      name: result.user.name,
      role: result.membership.role,
    });

    res.status(201).json({
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.membership.role,
        membership_id: result.membership.id,
        tenant_id: result.tenant.id,
        tenant: result.tenant,
      },
      token: tokens.access_token,
      refreshToken: tokens.refresh_token,
    });
  }),
);

// POST /auth/login
authRouter.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          where: { active: true },
          include: {
            tenant: { select: { id: true, name: true, slug: true, active: true, branding: true, discovery_enabled: true, onboarding_status: true, onboarding_step: true } },
          },
          take: 1,
        },
      },
    });

    if (!user || !user.active) {
      throw new AppError(401, 'Credenciais inválidas', 'AUTH_INVALID');
    }

    const valid = await compare(password, user.password_hash);
    if (!valid) {
      throw new AppError(401, 'Credenciais inválidas', 'AUTH_INVALID');
    }

    // Pega o primeiro membership ativo
    const membership = user.memberships[0];
    if (!membership || !membership.tenant.active) {
      throw new AppError(403, 'Sem acesso a nenhum tenant ativo', 'NO_TENANT');
    }

    const tokens = signTokens({
      sub: user.id,
      membership_id: membership.id,
      tenant_id: membership.tenant_id,
      email: user.email,
      name: user.name,
      role: membership.role,
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        role: membership.role,
        membership_id: membership.id,
        tenant_id: membership.tenant_id,
        tenant: membership.tenant,
        capacity: membership.capacity,
      },
      token: tokens.access_token,
      refreshToken: tokens.refresh_token,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });
  }),
);

// POST /auth/refresh
authRouter.post(
  '/refresh',
  validate(refreshSchema),
  asyncHandler(async (req, res) => {
    const refresh_token = req.body.refresh_token || req.body.refreshToken;
    try {
      const decoded = jwt.verify(refresh_token, env.REFRESH_TOKEN_SECRET) as { sub: string; membership_id: string; tenant_id: string };
      const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
      if (!user || !user.active) {
        throw new AppError(401, 'Refresh token inválido', 'AUTH_INVALID');
      }

      const membership = await prisma.membership.findUnique({
        where: { id: decoded.membership_id },
        include: { tenant: { select: { id: true, name: true, slug: true, active: true, onboarding_status: true, onboarding_step: true } } },
      });
      if (!membership || !membership.active || !membership.tenant.active) {
        throw new AppError(401, 'Membership inativo', 'AUTH_INVALID');
      }

      const tokens = signTokens({
        sub: user.id,
        membership_id: membership.id,
        tenant_id: membership.tenant_id,
        email: user.email,
        name: user.name,
        role: membership.role,
      });

      res.json({
        token: tokens.access_token,
        refreshToken: tokens.refresh_token,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      });
    } catch {
      throw new AppError(401, 'Refresh token inválido ou expirado', 'AUTH_INVALID');
    }
  }),
);

// GET /auth/me
authRouter.get(
  '/me',
  authGuard,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: { id: true, email: true, name: true, avatar_url: true, active: true, created_at: true },
    });
    if (!user) {
      throw new AppError(404, 'Usuário não encontrado');
    }

    const membership = await prisma.membership.findUnique({
      where: { id: req.user!.membership_id },
      include: {
        tenant: { select: { id: true, name: true, slug: true, active: true, branding: true, discovery_enabled: true, onboarding_status: true, onboarding_step: true } },
        team: { select: { id: true, name: true } },
      },
    });

    res.json({
      ...user,
      role: membership?.role,
      membership_id: membership?.id,
      tenant_id: membership?.tenant_id,
      tenant: membership?.tenant,
      team: membership?.team,
      capacity: membership?.capacity,
    });
  }),
);

// POST /auth/avatar — upload profile photo
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new AppError(400, 'Apenas imagens são aceitas', 'INVALID_FILE_TYPE'));
    }
  },
});

authRouter.post(
  '/avatar',
  authGuard,
  avatarUpload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new AppError(400, 'Arquivo ausente', 'FILE_MISSING');
    }
    const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const user = await prisma.user.update({
      where: { id: req.user!.sub },
      data: { avatar_url: dataUri },
      select: { id: true, email: true, name: true, avatar_url: true },
    });
    res.json(user);
  }),
);

// DELETE /auth/avatar — remove profile photo
authRouter.delete(
  '/avatar',
  authGuard,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.update({
      where: { id: req.user!.sub },
      data: { avatar_url: null },
      select: { id: true, email: true, name: true, avatar_url: true },
    });
    res.json(user);
  }),
);
