import { Router } from 'express';
import { compare } from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { asyncHandler, validate, authGuard } from '../../middlewares';
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

function signTokens(user: { id: string; email: string; name: string; role: string }) {
  const payload = { sub: user.id, email: user.email, name: user.name, role: user.role };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const access_token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as any });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const refresh_token = jwt.sign({ sub: user.id }, env.REFRESH_TOKEN_SECRET, { expiresIn: env.REFRESH_TOKEN_EXPIRES_IN as any });
  return { access_token, refresh_token };
}

// POST /auth/login
authRouter.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.active) {
      throw new AppError(401, 'Credenciais inválidas', 'AUTH_INVALID');
    }

    const valid = await compare(password, user.password_hash);
    if (!valid) {
      throw new AppError(401, 'Credenciais inválidas', 'AUTH_INVALID');
    }

    const tokens = signTokens(user);
    res.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
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
      const decoded = jwt.verify(refresh_token, env.REFRESH_TOKEN_SECRET) as { sub: string };
      const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
      if (!user || !user.active) {
        throw new AppError(401, 'Refresh token inválido', 'AUTH_INVALID');
      }
      const tokens = signTokens(user);
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
      select: { id: true, email: true, name: true, role: true, active: true, created_at: true },
    });
    if (!user) {
      throw new AppError(404, 'Usuário não encontrado');
    }
    res.json(user);
  }),
);
