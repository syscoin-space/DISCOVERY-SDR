import { Router } from "express";
import { asyncHandler, authGuard } from "../../middlewares";
import { getTenantId } from "../../middlewares/auth";
import { planService } from "./plan.service";
import { subscriptionService } from "./subscription.service";
import { prisma } from "../../config/prisma";

export const billingRouter = Router();

// Todos os endpoints de billing requerem autenticação e normalmente Role OWNER ou MANAGER
billingRouter.use(authGuard);

// GET /api/billing/plan
billingRouter.get(
  "/plan",
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const sub = await prisma.subscription.findUnique({
      where: { tenant_id: tenantId },
      include: {
        plan: true
      }
    });

    if (!sub) {
      return res.json({
        plan: null,
        status: 'INACTIVE',
        message: 'Assinatura não encontrada para este tenant'
      });
    }

    const usage = await planService.getUsageSummary(tenantId);

    res.json({
      plan: sub.plan,
      status: sub.status,
      current_period_end: sub.current_period_end,
      next_billing_at: sub.current_period_end, // Fallback para data de expiração
      gateway_subscription_id: sub.gateway_subscription_id,
      usage
    });
  })
);

// GET /api/billing/plans
billingRouter.get(
  "/plans",
  asyncHandler(async (req, res) => {
    const plans = await prisma.plan.findMany({
      where: { is_active: true },
      orderBy: { price_monthly: "asc" }
    });
    res.json(plans);
  })
);

billingRouter.post('/subscribe', authGuard, asyncHandler(async (req, res) => {
  const tenantId = getTenantId(req);
  const { planKey, paymentMethod } = req.body;
  
  const result = await subscriptionService.createSubscription(tenantId, planKey, paymentMethod);
  
  res.json(result);
}));
