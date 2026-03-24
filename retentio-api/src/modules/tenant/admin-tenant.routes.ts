import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { asyncHandler, authGuard, roleGuard } from '../../middlewares';
import { Role } from '@prisma/client';
import { z } from 'zod';

export const adminTenantRouter = Router();

// ── Guard: apenas ADMIN global ──
adminTenantRouter.use(authGuard);
adminTenantRouter.use(roleGuard(Role.ADMIN));

const querySchema = z.object({
  search: z.string().optional(),
  plan: z.string().optional(),
  status: z.string().optional(), // active/inactive
  subscriptionStatus: z.string().optional(),
  onboardingStatus: z.string().optional(),
  discoveryEnabled: z.enum(['true', 'false']).optional(),
});

/**
 * GET /api/admin/tenants
 * Lista global de clientes para o admin do SaaS.
 */
adminTenantRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { search, plan, status, subscriptionStatus, onboardingStatus, discoveryEnabled } = querySchema.parse(req.query);

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (plan) {
      where.plan = { key: plan };
    }

    if (status) {
      where.active = status === 'active';
    }

    if (subscriptionStatus) {
      where.subscription = { status: subscriptionStatus };
    }

    if (onboardingStatus) {
      where.onboarding_status = onboardingStatus;
    }

    if (discoveryEnabled) {
      where.discovery_enabled = discoveryEnabled === 'true';
    }

    const tenants = await prisma.tenant.findMany({
      where,
      include: {
        plan: { select: { name: true, key: true } },
        subscription: { select: { status: true, current_period_end: true } },
        memberships: {
          include: {
            user: { select: { name: true, email: true } }
          }
        },
        ai_settings: { select: { ai_enabled: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    const mapped = tenants.map((t) => {
      const owner = t.memberships.find((m) => m.role === 'OWNER') || t.memberships[0];
      const brandingConfigured = t.branding && Object.keys(t.branding as object).length > 0;
      
      return {
        id: t.id,
        name: t.name,
        slug: t.slug,
        active: t.active,
        created_at: t.created_at,
        updated_at: t.updated_at,
        discovery_enabled: t.discovery_enabled,
        onboarding_status: t.onboarding_status,
        onboarding_step: t.onboarding_step,
        
        // Subscription & Plan
        plan: t.plan?.name || 'Sem plano',
        plan_key: t.plan?.key,
        subscription_status: t.subscription?.status || 'INACTIVE',
        subscription_end: t.subscription?.current_period_end,

        // Owner & Team
        owner_name: owner?.user.name || 'Sem owner',
        owner_email: owner?.user.email,
        user_count: t.memberships.length,

        // Health Indicators
        health: {
          onboarding_completed: t.onboarding_status === 'COMPLETED',
          branding_configured: !!brandingConfigured,
          ai_configured: t.ai_settings?.ai_enabled || false,
        }
      };
    });

    res.json(mapped);
  })
);

/**
 * GET /api/admin/tenants/:id
 * Detalhe de um cliente específico.
 */
adminTenantRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params as { id: string };

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        plan: true,
        subscription: true,
        memberships: {
          include: { user: { select: { id: true, name: true, email: true, avatar_url: true } } }
        },
        ai_settings: true,
        ai_providers: true,
        onboarding: true,
      },
    });

    if (!tenant) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }

    // Calcular algumas métricas rápidas de uso se necessário (ex: leads, cadências)
    const [leadsCount, cadencesCount] = await Promise.all([
      prisma.lead.count({ where: { tenant_id: id } }),
      prisma.cadence.count({ where: { tenant_id: id } }),
    ]);

    res.json({
      ...tenant,
      stats: {
        total_leads: leadsCount,
        total_cadences: cadencesCount,
      }
    });
  })
);
