import { prisma } from '../config/database';
import { NotificationType } from '@prisma/client';

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  linkUrl?: string;
}

export const createNotification = async (params: CreateNotificationParams) => {
  return prisma.notification.create({
    data: {
      userId: params.userId,
      title: params.title,
      message: params.message,
      type: params.type,
      linkUrl: params.linkUrl,
    },
  });
};
