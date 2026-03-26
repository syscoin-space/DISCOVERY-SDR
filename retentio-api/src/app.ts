import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { errorHandler } from './middlewares';
import { authRouter } from './modules/auth/auth.routes';
import { invitationRouter } from './modules/auth/invitation.routes';
import { leadRouter } from './modules/leads/lead.routes';
import { handoffRouter } from './modules/handoffs/handoff.routes';
import { dashboardRouter } from './modules/dashboard/dashboard.routes';
import { todayRouter } from './modules/today/today.routes';
import { gestorRouter } from './modules/gestor/gestor.routes';
import { notificationRouter } from './modules/notifications/notification.routes';
import { googleRouter } from './modules/google/google.routes';
import { agendaRouter } from './modules/agenda/agenda.routes';
import { cadenceRouter } from './modules/cadences/cadence.routes';
import { discoveryRouter } from './modules/leads/discovery.routes';
import { onboardingRouter } from './modules/onboarding/onboarding.routes';
import { billingRouter } from './modules/billing/billing.routes';
import { billingWebhookRouter } from './modules/billing/billing-webhook.routes';
import { brandRouter } from './modules/brand/brand.routes';
import { templateRouter } from './modules/cadences/template.routes';
import { emailWebhookRouter } from './modules/email/webhook.routes';
import { emailMetricsRouter } from './modules/email/email-metrics.routes';
import { emailHealthRouter } from './modules/email/email-health.routes';
import { authGuard, roleGuard } from './middlewares/auth';
import { Role } from '@prisma/client';

export const app = express();

// ── Global Middlewares ──
app.set('trust proxy', true);
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rate Limiter ──
app.use(rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many requests', code: 'RATE_LIMITED' } },
}));

// ── Health ──
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

import { aiSettingsRouter } from './modules/ai/ai-settings.routes';
import { dashboardV2Router } from './modules/dashboard/dashboard.v2.routes';
import { tenantRouter } from './modules/tenant/tenant.routes';
import { membershipRouter } from './modules/tenant/membership.routes';
import { emailConfigRouter } from './modules/tenant/email-config.routes';

// ── V2 Routes ──
app.use('/api/brand', brandRouter); // Público
app.use('/api/auth', authRouter);
app.use('/api/invitations', invitationRouter);
app.use('/api/leads', authGuard, leadRouter);
app.use('/api/handoffs', authGuard, handoffRouter);
app.use('/api/dashboard/v2', authGuard, dashboardV2Router);
app.use('/api/dashboard', authGuard, dashboardRouter);
app.use('/api/today', authGuard, todayRouter);
app.use('/api/notifications', authGuard, notificationRouter);
app.use('/api/gestor', authGuard, roleGuard(Role.ADMIN, Role.OWNER, Role.MANAGER), gestorRouter);
app.use('/api/google', authGuard, googleRouter);
app.use('/api/agenda', authGuard, agendaRouter);
app.use('/api/cadences', authGuard, cadenceRouter);
app.use('/api/discovery', authGuard, discoveryRouter);
app.use('/api/ai-settings', authGuard, aiSettingsRouter);
app.use('/api/onboarding', authGuard, roleGuard(Role.ADMIN, Role.OWNER), onboardingRouter);
app.use('/api/tenant/email-config', authGuard, emailConfigRouter);
app.use('/api/tenant/email-health', authGuard, emailHealthRouter);
app.use('/api/tenant/email-metrics', authGuard, emailMetricsRouter);
app.use('/api/tenant', authGuard, tenantRouter);
app.use('/api/memberships', authGuard, membershipRouter);
app.use('/api/templates', authGuard, templateRouter);
app.use('/api/billing', billingRouter);
app.use('/api/webhooks', billingWebhookRouter); // Rota pública para gateways
app.use('/api/webhooks/email', emailWebhookRouter); // Rota pública para tracking de e-mail

// ── Admin Routes (SaaS Owner Only) ──
import { adminBillingRouter } from './modules/billing/admin-billing.routes';
import { adminTenantRouter } from './modules/tenant/admin-tenant.routes';
import { adminBrandRouter } from './modules/brand/admin-brand.routes';
app.use('/api/admin/billing', authGuard, roleGuard(Role.ADMIN), adminBillingRouter);
app.use('/api/admin/tenants', authGuard, roleGuard(Role.ADMIN), adminTenantRouter);
app.use('/api/admin/brand', authGuard, roleGuard(Role.ADMIN), adminBrandRouter);

// ── Error Handler (must be last) ──
app.use(errorHandler);
