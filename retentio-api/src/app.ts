import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { errorHandler } from './middlewares';
import { authRouter } from './modules/auth/auth.routes';
import { leadRouter } from './modules/leads/lead.routes';
import { interactionRouter } from './modules/leads/interaction.routes';
import { prrRouter } from './modules/prr/prr.routes';
import { cadenceRouter } from './modules/cadences/cadence.routes';
import { templateRouter } from './modules/cadences/template.routes';
import { resendRouter } from './modules/cadences/resend.routes';
import { handoffRouter } from './modules/handoffs/handoff.routes';
import { dashboardRouter } from './modules/dashboard/dashboard.routes';
import { icpRouter } from './modules/icp/icp.routes';
import { todayRouter } from './modules/today/today.routes';
import { gestorRouter } from './modules/gestor/gestor.routes';
import { notificationRouter } from './modules/notifications/notification.routes';
import { brandRouter } from './modules/brand/brand.routes';
import { authGuard, roleGuard } from './middlewares/auth';

export const app = express();

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

// ── Routes ──
app.use('/api/auth', authRouter);
app.use('/api/leads', leadRouter);
app.use('/api/leads/:leadId/interactions', interactionRouter);
app.use('/api/prr', prrRouter);
app.use('/api/cadences', cadenceRouter);
app.use('/api/templates', templateRouter);
app.use('/api/resend', resendRouter);
app.use('/api/handoffs', handoffRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/icp-criteria', icpRouter);
app.use('/api/today', todayRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/gestor', authGuard, roleGuard('GESTOR'), gestorRouter);
app.use('/api/brand', brandRouter);

// ── Error Handler (must be last) ──
app.use(errorHandler);
