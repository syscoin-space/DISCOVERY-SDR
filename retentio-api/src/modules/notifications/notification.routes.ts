import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { asyncHandler, getTenantId, getMembershipId, authGuard } from '../../middlewares';

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
    const membershipId = getMembershipId(req);
    const { endpoint, keys } = req.body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'Missing subscription data' });
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        membership_id: membershipId,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_agent: req.headers['user-agent'] as string || null,
      },
      create: {
        membership_id: membershipId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_agent: req.headers['user-agent'] as string || null,
      },
    });

    res.json({ success: true });
  }),
);

// ── Unsubscribe push ──
notificationRouter.delete(
  '/unsubscribe',
  asyncHandler(async (req, res) => {
    const membershipId = getMembershipId(req);
    const { endpoint } = req.body;

    if (endpoint) {
      await prisma.pushSubscription.deleteMany({
        where: { membership_id: membershipId, endpoint },
      });
    } else {
      await prisma.pushSubscription.deleteMany({
        where: { membership_id: membershipId },
      });
    }

    res.json({ success: true });
  }),
);

// ── Unread count ──
notificationRouter.get(
  '/unread-count',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const membershipId = getMembershipId(req);
    
    const count = await prisma.notification.count({
      where: { tenant_id: tenantId, user_id: membershipId, read: false },
    });
    res.json({ count });
  }),
);

// ── List notifications ──
notificationRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const membershipId = getMembershipId(req);
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where: any = { 
      tenant_id: tenantId,
      user_id: membershipId 
    };

    if (req.query.read === 'false') where.read = false;
    if (req.query.read === 'true') where.read = true;

    const category = req.query.category as string | undefined;
    if (category) where.category = category;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { sent_at: 'desc' },
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
    const tenantId = getTenantId(req);
    const membershipId = getMembershipId(req);

    await prisma.notification.updateMany({
      where: { id: req.params.id as string, tenant_id: tenantId },
      data: { read: true },
    });

    res.json({ success: true });
  }),
);

// ── Mark all as read ──
notificationRouter.patch(
  '/read-all',
  asyncHandler(async (req, res) => {
    const tenantId = getTenantId(req);
    const membershipId = getMembershipId(req);

    await prisma.notification.updateMany({
      where: { tenant_id: tenantId, user_id: membershipId, read: false },
      data: { read: true },
    });

    res.json({ success: true });
  }),
);
