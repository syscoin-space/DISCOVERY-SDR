import { prisma } from '../../config/prisma';

export interface CreateNotificationDTO {
  tenant_id: string;
  user_id: string; // membership_id
  title: string;
  body: string;
  category: string;
  link?: string;
  lead_id?: string;
}

export class NotificationService {
  /**
   * Idempotency check: find a notification for the same user, category and lead
   * created in the last 60 seconds.
   */
  async findRecentNotification(userId: string, category: string, leadId?: string) {
    const oneMinuteAgo = new Date(Date.now() - 60000);
    return prisma.notification.findFirst({
      where: {
        user_id: userId,
        category,
        lead_id: leadId || null,
        sent_at: { gte: oneMinuteAgo },
      },
    });
  }

  async createNotification(data: CreateNotificationDTO) {
    return prisma.notification.create({
      data: {
        tenant_id: data.tenant_id,
        user_id: data.user_id,
        title: data.title,
        body: data.body,
        category: data.category,
        url: data.link,
        lead_id: data.lead_id,
        sent_at: new Date(),
        read: false,
      },
    });
  }
}

export const notificationService = new NotificationService();
