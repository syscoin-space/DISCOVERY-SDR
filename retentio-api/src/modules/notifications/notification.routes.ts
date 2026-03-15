import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { asyncHandler } from '../../middlewares';
import { authGuard } from '../../middlewares/auth';

export const notificationRouter = Router();

// ── Public: VAPID key (no auth needed) ──
notificationRouter.get(
  '/vapid-public-key',
  (_req, res) => {
    res.json({ publicKey: env.VAPID_PUBLIC_KEY });
  },
);

// ── All routes below require auth ──
notificationRouter.use(authGuard);

// ── Subscribe push ──
notificationRouter.post(
  '/subscribe',
  asyncHandler(async (req, res) => {
    const userId = req.user!.sub;
    const { endpoint, keys } = req.body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'Missing subscription data' });
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        user_id: userId,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_agent: req.headers['user-agent'] || null,
      },
      create: {
        user_id: userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_agent: req.headers['user-agent'] || null,
      },
    });

    res.json({ success: true });
  }),
);

// ── Unsubscribe push ──
notificationRouter.delete(
  '/unsubscribe',
  asyncHandler(async (req, res) => {
    const userId = req.user!.sub;
    const { endpoint } = req.body;

    if (endpoint) {
      await prisma.pushSubscription.deleteMany({
        where: { user_id: userId, endpoint },
      });
    } else {
      await prisma.pushSubscription.deleteMany({
        where: { user_id: userId },
      });
    }

    res.json({ success: true });
  }),
);

// ── Unread count ──
notificationRouter.get(
  '/unread-count',
  asyncHandler(async (req, res) => {
    const count = await prisma.notification.count({
      where: { user_id: req.user!.sub, lida: false },
    });
    res.json({ count });
  }),
);

// ── List notifications (with filters + pagination) ──
notificationRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.user!.sub;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { user_id: userId };

    // Filter by read status
    if (req.query.lida === 'false') where.lida = false;
    if (req.query.lida === 'true') where.lida = true;

    // Filter by category
    const tipoFilter = req.query.tipo as string | undefined;
    if (tipoFilter === 'leads') {
      where.tipo = { in: ['tier_a_parado', 'proximo_contato', 'bloqueio'] };
    } else if (tipoFilter === 'cadencias') {
      where.tipo = { in: ['step_atrasado'] };
    } else if (tipoFilter === 'gestor') {
      where.tipo = { in: ['meta_batida', 'ritmo_ruim', 'sdr_destaque'] };
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { enviada_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    res.json({
      data: notifications,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  }),
);

// ── Mark one as read ──
notificationRouter.patch(
  '/:id/read',
  asyncHandler(async (req, res) => {
    const userId = req.user!.sub;

    await prisma.notification.updateMany({
      where: { id: req.params.id as string, user_id: userId },
      data: { lida: true },
    });

    res.json({ success: true });
  }),
);

// ── Mark all as read ──
notificationRouter.patch(
  '/read-all',
  asyncHandler(async (_req, res) => {
    const userId = _req.user!.sub;

    await prisma.notification.updateMany({
      where: { user_id: userId, lida: false },
      data: { lida: true },
    });

    res.json({ success: true });
  }),
);
