import { Router } from 'express';
import { asyncHandler, authGuard, roleGuard } from '../../middlewares';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { Role } from '@prisma/client';
import axios from 'axios';

export const adminBillingRouter = Router();

// Todas as rotas são exclusivas do ADMIN global do SaaS
adminBillingRouter.use(authGuard);
adminBillingRouter.use(roleGuard(Role.ADMIN));

/**
 * GET /api/admin/billing/status
 * Status da integração Asaas (chave configurada, ambiente, conexão)
 */
adminBillingRouter.get(
  '/status',
  asyncHandler(async (_req, res) => {
    const hasKey = !!env.ASAAS_API_KEY && env.ASAAS_API_KEY.length > 0;
    const baseUrl = env.ASAAS_BASE_URL || 'https://sandbox.asaas.com/api/v3';
    const isSandbox = baseUrl.includes('sandbox');

    res.json({
      configured: hasKey,
      environment: isSandbox ? 'sandbox' : 'production',
      base_url: baseUrl,
      key_preview: hasKey ? `${env.ASAAS_API_KEY.slice(0, 8)}...${env.ASAAS_API_KEY.slice(-4)}` : null,
    });
  })
);

/**
 * POST /api/admin/billing/test-connection
 * Testa a conexão com o Asaas chamando GET /customers?limit=1
 */
adminBillingRouter.post(
  '/test-connection',
  asyncHandler(async (_req, res) => {
    if (!env.ASAAS_API_KEY) {
      return res.json({ success: false, error: 'ASAAS_API_KEY não configurada' });
    }

    try {
      const baseUrl = env.ASAAS_BASE_URL || 'https://sandbox.asaas.com/api/v3';
      const response = await axios.get(`${baseUrl}/customers?limit=1`, {
        headers: { access_token: env.ASAAS_API_KEY },
        timeout: 10000,
      });

      res.json({
        success: true,
        message: 'Conexão com Asaas estabelecida com sucesso',
        customers_found: response.data.totalCount ?? 0,
      });
    } catch (error: any) {
      res.json({
        success: false,
        error: error.response?.data?.errors?.[0]?.description || error.message || 'Falha ao conectar',
        status_code: error.response?.status,
      });
    }
  })
);

/**
 * GET /api/admin/billing/metrics
 * Métricas financeiras globais do SaaS
 */
adminBillingRouter.get(
  '/metrics',
  asyncHandler(async (_req, res) => {
    const [
      activeCount,
      trialCount,
      pastDueCount,
      canceledCount,
      activeSubs,
      totalTenants,
    ] = await Promise.all([
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.subscription.count({ where: { status: 'TRIAL' } }),
      prisma.subscription.count({ where: { status: 'PAST_DUE' } }),
      prisma.subscription.count({ where: { status: 'CANCELED' } }),
      prisma.subscription.findMany({
        where: { status: 'ACTIVE' },
        select: { price: true },
      }),
      prisma.tenant.count({ where: { active: true } }),
    ]);

    // MRR = soma de price das assinaturas ACTIVE
    const mrr = activeSubs.reduce((sum, s) => sum + (s.price || 0), 0);

    res.json({
      mrr,
      total_tenants: totalTenants,
      active: activeCount,
      trial: trialCount,
      past_due: pastDueCount,
      canceled: canceledCount,
      total_subscriptions: activeCount + trialCount + pastDueCount + canceledCount,
    });
  })
);

/**
 * GET /api/admin/billing/subscriptions
 * Lista global de assinaturas com tenant, plano, status, valor
 */
adminBillingRouter.get(
  '/subscriptions',
  asyncHandler(async (_req, res) => {
    const subscriptions = await prisma.subscription.findMany({
      include: {
        tenant: { select: { id: true, name: true, slug: true, active: true } },
        plan: { select: { id: true, name: true, key: true, price_monthly: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    const mapped = subscriptions.map((sub) => ({
      id: sub.id,
      tenant_id: sub.tenant_id,
      tenant_name: sub.tenant.name,
      tenant_slug: sub.tenant.slug,
      tenant_active: sub.tenant.active,
      plan_name: sub.plan.name,
      plan_key: sub.plan.key,
      plan_price: sub.plan.price_monthly,
      status: sub.status,
      price: sub.price,
      currency: sub.currency,
      current_period_end: sub.current_period_end,
      gateway_customer_id: sub.gateway_customer_id,
      gateway_subscription_id: sub.gateway_subscription_id,
      created_at: sub.created_at,
      updated_at: sub.updated_at,
    }));

    res.json(mapped);
  })
);
