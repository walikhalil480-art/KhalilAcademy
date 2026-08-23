import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { createNotification } from './notification.service';
import { sendEmail } from './email.service';
import { NotificationType, LiveSessionStatus } from '@prisma/client';
import { appEventBus, AcademyEvent } from '../events/eventBus';

export class LiveSessionReminderService {
  private static timer: NodeJS.Timeout | null = null;

  /**
   * Process all upcoming live class reminders idempotently
   */
  public static async processReminders() {
    try {
      const now = new Date();

      // 1. 24 Hours Reminder (Sessions starting in 23h - 25h)
      const in23h = new Date(now.getTime() + 23 * 60 * 60 * 1000);
      const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

      const reg24h = await prisma.liveSessionRegistration.findMany({
        where: {
          reminder24hSent: false,
          session: {
            status: LiveSessionStatus.SCHEDULED,
            startTime: { gte: in23h, lte: in25h },
          },
        },
        include: {
          user: true,
          session: { include: { course: true, instructor: true } },
        },
      });

      for (const reg of reg24h) {
        try {
          await createNotification({
            userId: reg.userId,
            title: `Reminder: ${reg.session.title} is tomorrow`,
            message: `Your live class "${reg.session.title}" starts tomorrow at ${new Date(
              reg.session.startTime
            ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
            type: NotificationType.LIVE_CLASS_REMINDER_24H,
            linkUrl: `/live-classes/${reg.sessionId}`,
          });

          if (reg.user?.email) {
            appEventBus.emitEvent(AcademyEvent.LIVE_CLASS_REMINDER_24H, {
              userId: reg.userId,
              email: reg.user.email,
              name: reg.user.name,
              sessionId: reg.sessionId,
              sessionTitle: reg.session.title,
              courseTitle: reg.session.course?.title || 'Khalil Academy Live Course',
              startTime: reg.session.startTime,
            });
          }

          await prisma.liveSessionRegistration.update({
            where: { id: reg.id },
            data: { reminder24hSent: true },
          });
        } catch (e: any) {
          logger.error(`Error sending 24h reminder for reg ${reg.id}: ${e.message}`);
        }
      }

      // 2. 1 Hour Reminder (Sessions starting in 45m - 75m)
      const in45m = new Date(now.getTime() + 45 * 60 * 1000);
      const in75m = new Date(now.getTime() + 75 * 60 * 1000);

      const reg1h = await prisma.liveSessionRegistration.findMany({
        where: {
          reminder1hSent: false,
          session: {
            status: LiveSessionStatus.SCHEDULED,
            startTime: { gte: in45m, lte: in75m },
          },
        },
        include: {
          user: true,
          session: { include: { course: true, instructor: true } },
        },
      });

      for (const reg of reg1h) {
        try {
          await createNotification({
            userId: reg.userId,
            title: `Starting in 1 hour: ${reg.session.title}`,
            message: `Get ready! Your live class "${reg.session.title}" starts in 1 hour.`,
            type: NotificationType.LIVE_CLASS_REMINDER_1H,
            linkUrl: `/live-classes/${reg.sessionId}`,
          });

          if (reg.user?.email) {
            await sendEmail({
              to: reg.user.email,
              subject: `Starting in 1 Hour: ${reg.session.title}`,
              html: `<p>Hi ${reg.user.name},</p><p>Your live session <strong>${reg.session.title}</strong> is starting in 1 hour.</p><p><a href="http://localhost:5173/live-classes/${reg.sessionId}">Join Session</a></p>`,
            });
          }

          await prisma.liveSessionRegistration.update({
            where: { id: reg.id },
            data: { reminder1hSent: true },
          });
        } catch (e: any) {
          logger.error(`Error sending 1h reminder for reg ${reg.id}: ${e.message}`);
        }
      }

      // 3. Class Starting Now Reminder (Sessions starting in -5m to 15m)
      const minus5m = new Date(now.getTime() - 5 * 60 * 1000);
      const in15m = new Date(now.getTime() + 15 * 60 * 1000);

      const regStarting = await prisma.liveSessionRegistration.findMany({
        where: {
          reminderStartingSent: false,
          session: {
            status: { in: [LiveSessionStatus.SCHEDULED, LiveSessionStatus.LIVE] },
            startTime: { gte: minus5m, lte: in15m },
          },
        },
        include: {
          user: true,
          session: { include: { course: true, instructor: true } },
        },
      });

      for (const reg of regStarting) {
        try {
          await createNotification({
            userId: reg.userId,
            title: `Live Class Starting Now: ${reg.session.title}`,
            message: `"${reg.session.title}" is starting now. Click to join the virtual classroom!`,
            type: NotificationType.LIVE_CLASS_STARTING,
            linkUrl: `/live-classes/${reg.sessionId}`,
          });

          if (reg.user?.email) {
            appEventBus.emitEvent(AcademyEvent.LIVE_CLASS_STARTING_SOON, {
              userId: reg.userId,
              email: reg.user.email,
              name: reg.user.name,
              sessionId: reg.sessionId,
              sessionTitle: reg.session.title,
              courseTitle: reg.session.course?.title || 'Khalil Academy Live Course',
              startTime: reg.session.startTime,
            });
          }

          await prisma.liveSessionRegistration.update({
            where: { id: reg.id },
            data: { reminderStartingSent: true },
          });
        } catch (e: any) {
          logger.error(`Error sending starting reminder for reg ${reg.id}: ${e.message}`);
        }
      }
    } catch (error: any) {
      logger.error(`LiveSessionReminderService Error: ${error.message}`);
    }
  }

  /**
   * Start recurring reminder worker (runs every 5 minutes)
   */
  public static startScheduler(intervalMs = 5 * 60 * 1000) {
    if (this.timer) return;
    this.processReminders();
    this.timer = setInterval(() => {
      this.processReminders();
    }, intervalMs);
    logger.info('[LiveSessionReminderService] Background reminder worker active.');
  }

  /**
   * Stop recurring scheduler
   */
  public static stopScheduler() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
