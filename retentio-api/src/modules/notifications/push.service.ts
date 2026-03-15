import webpush from 'web-push';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

// ── Configure VAPID ──
if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    env.VAPID_SUBJECT,
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY,
  );
}

interface PushPayload {
  titulo: string;
  corpo: string;
  url?: string;
  tipo: string;
  icon?: string;
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { user_id: userId },
  });

  if (subscriptions.length === 0) return;

  // Save notification to DB
  await prisma.notification.create({
    data: {
      user_id: userId,
      tipo: payload.tipo,
      titulo: payload.titulo,
      corpo: payload.corpo,
      url: payload.url,
    },
  });

  const pushData = JSON.stringify({
    titulo: payload.titulo,
    corpo: payload.corpo,
    url: payload.url,
    tipo: payload.tipo,
    icon: payload.icon || '/icon-192.png',
  });

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          pushData,
        );
      } catch (err: any) {
        // 410 Gone or 404 — subscription expired, remove it
        if (err.statusCode === 410 || err.statusCode === 404) {
          logger.info(`Removing expired push subscription ${sub.id}`);
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        } else {
          logger.error(`Push send failed for sub ${sub.id}:`, err);
        }
      }
    }),
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  logger.info(`Push sent to ${sent}/${subscriptions.length} devices for user ${userId}`);
}

export async function sendPushToRole(role: string, payload: PushPayload) {
  const users = await prisma.user.findMany({
    where: { role: role as any, active: true },
    select: { id: true },
  });

  await Promise.allSettled(
    users.map((u) => sendPushToUser(u.id, payload)),
  );
}
