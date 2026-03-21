import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { Role } from '@prisma/client';
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
import { authGuard, roleGuard } from './middlewares/auth';

export const app = express();

app.set('trust proxy', 1);

// ── Global Middlewares ──
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

// ── V2 Routes ──
app.use('/api/auth', authRouter);
app.use('/api/invitations', invitationRouter);
app.use('/api/leads', leadRouter);
app.use('/api/handoffs', handoffRouter);
app.use('/api/dashboard/v2', dashboardV2Router);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/today', todayRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/gestor', authGuard, roleGuard(Role.OWNER, Role.MANAGER), gestorRouter);
app.use('/api/google', googleRouter);
app.use('/api/agenda', authGuard, agendaRouter);
app.use('/api/cadences', authGuard, cadenceRouter);
app.use('/api/discovery', authGuard, discoveryRouter);
app.use('/api/ai-settings', authGuard, aiSettingsRouter);
app.use('/api/onboarding', onboardingRouter);
app.use('/api/billing', billingRouter);
app.use('/api/brand', brandRouter);
app.use('/api/webhooks', billingWebhookRouter); // Rota pública para gateways

// ── Error Handler (must be last) ──
app.use(errorHandler);
