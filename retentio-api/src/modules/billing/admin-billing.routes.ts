import { Router } from 'express';
import { asyncHandler, authGuard, roleGuard } from '../../middlewares';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { Role } from '@prisma/client';
import axios from 'axios';

export const adminBillingRouter = Router();

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  ADMIN BILLING ROUTES — Financeiro Global do SaaS           ║
 * ║  Exclusivo para Role.ADMIN (dono da plataforma)             ║
 * ║  Não é billing do tenant. É gestão financeira do SaaS.      ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Fonte de dados:
 * - Banco interno (Prisma): Plan, Subscription, Tenant
 * - Gateway externo (Asaas API): via ASAAS_API_KEY (config global da plataforma)
 */

// ── Guard: apenas ADMIN global ──

adminBillingRouter.use(authGuard);
adminBillingRouter.use(roleGuard(Role.ADMIN));

// ── Helpers ──

function getAsaasClient() {
  const baseUrl = env.ASAAS_BASE_URL || 'https://sandbox.asaas.com/api/v3';
  return axios.create({
    baseURL: baseUrl,
    headers: { access_token: env.ASAAS_API_KEY },
    timeout: 15000,
  });
}

// ═══════════════════════════════════════════════════════════════
// BLOCO 1 — STATUS REAL DA INTEGRAÇÃO
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/admin/billing/status
 *
 * Retorna status seguro da integração Asaas.
 * Dados 100% reais — lê config do ambiente e valida no Asaas.
 * Nunca expõe a chave completa.
 */
adminBillingRouter.get(
  '/status',
  asyncHandler(async (_req, res) => {
    const hasKey = !!env.ASAAS_API_KEY && env.ASAAS_API_KEY.length > 0;
    const baseUrl = env.ASAAS_BASE_URL || 'https://sandbox.asaas.com/api/v3';
    const isSandbox = baseUrl.includes('sandbox');

    // Verifica se a integração está operacional (chama o Asaas real)
    let operational = false;
    let gateway_customers = 0;

    if (hasKey) {
      try {
        const asaas = getAsaasClient();
        const response = await asaas.get('/customers?limit=1');
        operational = response.status === 200;
        gateway_customers = response.data.totalCount ?? 0;
      } catch {
        operational = false;
      }
    }

    // Conta quantas assinaturas internas têm vínculo com gateway
    const linkedCount = await prisma.subscription.count({
      where: { gateway_subscription_id: { not: null } },
    });

    const totalSubs = await prisma.subscription.count();

    res.json({
      // Config
      configured: hasKey,
      environment: isSandbox ? 'sandbox' : 'production',
      base_url: baseUrl,
      key_preview: hasKey ? `${env.ASAAS_API_KEY.slice(0, 8)}...${env.ASAAS_API_KEY.slice(-4)}` : null,

      // Operacional
      operational,
      gateway_customers,

      // Vínculo interno
      subscriptions_total: totalSubs,
      subscriptions_linked_to_gateway: linkedCount,
      subscriptions_without_gateway: totalSubs - linkedCount,

      // Fonte dos dados
      data_source: 'Dados lidos de env.ASAAS_API_KEY (config global da plataforma) + banco interno',
    });
  })
);

// ═══════════════════════════════════════════════════════════════
// BLOCO 1.5 — CONTROLE MANUAL DE TRIAL
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/admin/billing/trial/adjust
 * 
 * Permite ao admin do SaaS alterar a data limite do Trial (current_period_end)
 * ou até estender o prazo de um cliente específico.
 * 
 * Payload: { tenant_id: string, new_end_date: string (ISO) }
 */
adminBillingRouter.post(
  '/trial/adjust',
  asyncHandler(async (req, res) => {
    const { tenant_id, new_end_date } = req.body;

    if (!tenant_id || !new_end_date) {
      return res.status(400).json({ error: 'tenant_id e new_end_date são obrigatórios' });
    }

    const newDate = new Date(new_end_date);
    if (isNaN(newDate.getTime())) {
      return res.status(400).json({ error: 'new_end_date inválida' });
    }

    // Atualiza a assinatura vinculada a este tenant
    const updatedSub = await prisma.subscription.update({
      where: { tenant_id },
      data: {
        current_period_end: newDate
      }
    });

    res.json({
      message: 'Período de trial atualizado com sucesso.',
      subscription: updatedSub
    });
  })
);

// ═══════════════════════════════════════════════════════════════
// BLOCO 2 — TESTE DE CONEXÃO REAL
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/admin/billing/test-connection
 *
 * Faz uma chamada real ao Asaas para validar autenticação.
 * Chama GET /customers?limit=1 e GET /subscriptions?limit=1.
 * Dados 100% reais.
 */
adminBillingRouter.post(
  '/test-connection',
  asyncHandler(async (_req, res) => {
    if (!env.ASAAS_API_KEY) {
      return res.json({
        success: false,
        error: 'ASAAS_API_KEY não configurada no ambiente',
        auth_valid: false,
      });
    }

    const asaas = getAsaasClient();

    try {
      // Teste 1: Autenticação + Clientes
      const customersRes = await asaas.get('/customers?limit=1');
      const customersOk = customersRes.status === 200;
      const totalCustomers = customersRes.data.totalCount ?? 0;

      // Teste 2: Assinaturas no gateway
      let totalGatewaySubscriptions = 0;
      try {
        const subsRes = await asaas.get('/subscriptions?limit=1');
        totalGatewaySubscriptions = subsRes.data.totalCount ?? 0;
      } catch {
        // Não crítico se falhar (pode não ter assinaturas)
      }

      res.json({
        success: customersOk,
        auth_valid: true,
        message: 'Conexão com Asaas estabelecida com sucesso',
        environment: env.ASAAS_BASE_URL?.includes('sandbox') ? 'sandbox' : 'production',
        gateway_data: {
          customers: totalCustomers,
          subscriptions: totalGatewaySubscriptions,
        },
        response_code: customersRes.status,
      });
    } catch (error: any) {
      const statusCode = error.response?.status;
      const isAuthError = statusCode === 401 || statusCode === 403;

      res.json({
        success: false,
        auth_valid: !isAuthError,
        error: error.response?.data?.errors?.[0]?.description
          || error.message
          || 'Falha ao conectar com Asaas',
        response_code: statusCode || null,
        hint: isAuthError
          ? 'A chave API do Asaas parece inválida ou expirada. Verifique ASAAS_API_KEY nas variáveis de ambiente.'
          : 'Verifique a conectividade de rede e ASAAS_BASE_URL.',
      });
    }
  })
);

// ═══════════════════════════════════════════════════════════════
// BLOCO 3 — MÉTRICAS GLOBAIS REAIS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/admin/billing/metrics
 *
 * Consolida métricas financeiras globais do SaaS.
 *
 * Fonte dos dados:
 * - MRR: banco interno (subscription.price || plan.price_monthly)
 * - Contagens: banco interno (subscriptions + tenants)
 * - Tudo cross-tenant (sem filtro de tenant_id)
 */
adminBillingRouter.get(
  '/metrics',
  asyncHandler(async (_req, res) => {
    const [
      activeCount,
      trialCount,
      pastDueCount,
      canceledCount,
      subsWithPlans,
      totalTenants,
      tenantsWithSub,
    ] = await Promise.all([
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.subscription.count({ where: { status: 'TRIAL' } }),
      prisma.subscription.count({ where: { status: 'PAST_DUE' } }),
      prisma.subscription.count({ where: { status: 'CANCELED' } }),
      // Busca price da assinatura E price_monthly do plano como fallback
      prisma.subscription.findMany({
        where: { status: { in: ['ACTIVE', 'TRIAL'] } },
        select: {
          price: true,
          status: true,
          plan: { select: { price_monthly: true } },
        },
      }),
      prisma.tenant.count({ where: { active: true } }),
      prisma.tenant.count({
        where: {
          active: true,
          subscription: { isNot: null },
        },
      }),
    ]);

    // MRR = soma do valor efetivo de assinaturas ACTIVE
    // Prioridade: subscription.price > plan.price_monthly > 0
    const mrr = subsWithPlans
      .filter((s) => s.status === 'ACTIVE')
      .reduce((sum, s) => {
        const effectivePrice = s.price ?? s.plan.price_monthly ?? 0;
        return sum + effectivePrice;
      }, 0);

    // Receita potencial (trials que podem converter)
    const trialPotential = subsWithPlans
      .filter((s) => s.status === 'TRIAL')
      .reduce((sum, s) => {
        const effectivePrice = s.price ?? s.plan.price_monthly ?? 0;
        return sum + effectivePrice;
      }, 0);

    const totalSubscriptions = activeCount + trialCount + pastDueCount + canceledCount;

    res.json({
      // Financeiro
      mrr,
      trial_potential: trialPotential,
      currency: 'BRL',

      // Contagens
      total_tenants: totalTenants,
      tenants_with_subscription: tenantsWithSub,
      active: activeCount,
      trial: trialCount,
      past_due: pastDueCount,
      canceled: canceledCount,
      total_subscriptions: totalSubscriptions,

      // Composição
      data_sources: {
        mrr: 'Banco interno: subscription.price ?? plan.price_monthly (cross-tenant)',
        counts: 'Banco interno: prisma.subscription.count (cross-tenant)',
        note: 'Nenhum dado mockado. Todos os valores vêm do banco real.',
      },
    });
  })
);

// ═══════════════════════════════════════════════════════════════
// BLOCO 4 — LISTA GLOBAL DE ASSINATURAS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/admin/billing/subscriptions
 *
 * Lista global de assinaturas com vínculo completo:
 * Subscription ↔ Plan ↔ Tenant ↔ Gateway
 *
 * Fonte: banco interno (Prisma) — cross-tenant
 * Gateway Ref: preenchido quando assinatura foi criada via Asaas
 */
adminBillingRouter.get(
  '/subscriptions',
  asyncHandler(async (_req, res) => {
    const subscriptions = await prisma.subscription.findMany({
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            active: true,
            created_at: true,
          },
        },
        plan: {
          select: {
            id: true,
            name: true,
            key: true,
            price_monthly: true,
            limits: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const mapped = subscriptions.map((sub) => {
      const effectivePrice = sub.price ?? sub.plan.price_monthly ?? 0;
      const hasGatewayLink = !!(sub.gateway_customer_id || sub.gateway_subscription_id);

      return {
        // Identificação
        id: sub.id,
        tenant_id: sub.tenant_id,
        plan_id: sub.plan_id,

        // Tenant
        tenant_name: sub.tenant.name,
        tenant_slug: sub.tenant.slug,
        tenant_active: sub.tenant.active,
        tenant_created_at: sub.tenant.created_at,

        // Plano
        plan_name: sub.plan.name,
        plan_key: sub.plan.key,
        plan_price: sub.plan.price_monthly,
        plan_limits: sub.plan.limits,

        // Assinatura
        status: sub.status,
        price: sub.price,
        effective_price: effectivePrice,
        currency: sub.currency || 'BRL',
        current_period_start: sub.current_period_start,
        current_period_end: sub.current_period_end,
        cancel_at_period_end: sub.cancel_at_period_end,
        canceled_at: sub.canceled_at,

        // Gateway (Asaas)
        has_gateway_link: hasGatewayLink,
        gateway_customer_id: sub.gateway_customer_id,
        gateway_subscription_id: sub.gateway_subscription_id,
        last_webhook_at: sub.last_webhook_at,

        // Metadata
        created_at: sub.created_at,
        updated_at: sub.updated_at,
      };
    });

    res.json({
      total: mapped.length,
      subscriptions: mapped,
      data_source: 'Banco interno (cross-tenant). Gateway Ref preenchido quando assinatura vinculada ao Asaas.',
    });
  })
);

// ═══════════════════════════════════════════════════════════════
// BLOCO 6 — GESTÃO DE PLANOS (CRUD)
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/admin/billing/plans
 * Cria um novo plano no banco
 */
adminBillingRouter.post(
  '/plans',
  asyncHandler(async (req, res) => {
    const { name, key, description, price_monthly, trial_days, limits, features, is_active } = req.body;

    const newPlan = await prisma.plan.create({
      data: {
        name,
        key: key || name.toUpperCase().replace(/\s+/g, '_'),
        description,
        price_monthly: price_monthly ? Number(price_monthly) : null,
        trial_days: trial_days ? Number(trial_days) : 7,
        limits: limits || { sdr: 1, leads_monthly: 100 },
        features: features || {},
        is_active: is_active ?? true,
      }
    });

    res.json(newPlan);
  })
);

/**
 * PUT /api/admin/billing/plans/:id
 * Atualiza um plano existente
 */
adminBillingRouter.put(
  '/plans/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    const { name, key, description, price_monthly, trial_days, limits, features, is_active } = req.body;

    const updatedPlan = await prisma.plan.update({
      where: { id },
      data: {
        name,
        key,
        description,
        price_monthly: price_monthly !== undefined ? Number(price_monthly) : null,
        trial_days: trial_days !== undefined ? Number(trial_days) : 7,
        limits: limits || undefined,
        features: features || undefined,
        is_active,
      }
    });

    res.json(updatedPlan);
  })
);

/**
 * DELETE /api/admin/billing/plans/:id
 */
adminBillingRouter.delete(
  '/plans/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    await prisma.plan.delete({ where: { id } });
    res.json({ message: "Plano deletado com sucesso" });
  })
);
