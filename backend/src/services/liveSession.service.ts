import { prisma } from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { createNotification } from './notification.service';
import { sendEmail } from './email.service';
import {
  LiveSessionStatus,
  LiveMeetingProvider,
  LiveAttendanceStatus,
  NotificationType,
} from '@prisma/client';
import { appEventBus, AcademyEvent } from '../events/eventBus';

export interface CreateLiveSessionDTO {
  title: string;
  description?: string;
  courseId: string;
  instructorId?: string; // If admin, can assign instructor; else defaults to req.user.id
  startTime: Date | string;
  endTime: Date | string;
  timezone?: string;
  maxParticipants?: number;
  meetingProvider?: LiveMeetingProvider;
  meetingUrl?: string;
  meetingId?: string;
  meetingPasscode?: string;
  attendanceThresholdPercent?: number;
  joinBufferMinutes?: number;
}

export interface UpdateLiveSessionDTO {
  title?: string;
  description?: string;
  courseId?: string;
  instructorId?: string;
  startTime?: Date | string;
  endTime?: Date | string;
  timezone?: string;
  maxParticipants?: number;
  meetingProvider?: LiveMeetingProvider;
  meetingUrl?: string;
  meetingId?: string;
  meetingPasscode?: string;
  status?: LiveSessionStatus;
  attendanceThresholdPercent?: number;
  joinBufferMinutes?: number;
  recordingUrl?: string;
  recordingTitle?: string;
  recordingDurationMinutes?: number;
}

export class LiveSessionService {
  /**
   * Dynamically compute current status based on server date/time and database status
   */
  public static computeDynamicStatus(session: {
    status: LiveSessionStatus;
    startTime: Date;
    endTime: Date;
  }): LiveSessionStatus {
    if (session.status === LiveSessionStatus.CANCELLED) {
      return LiveSessionStatus.CANCELLED;
    }
    if (session.status === LiveSessionStatus.COMPLETED) {
      return LiveSessionStatus.COMPLETED;
    }
    const now = new Date();
    const start = new Date(session.startTime);
    const end = new Date(session.endTime);

    if (now < start) {
      return LiveSessionStatus.SCHEDULED;
    } else if (now >= start && now <= end) {
      return LiveSessionStatus.LIVE;
    } else {
      return LiveSessionStatus.COMPLETED;
    }
  }

  /**
   * Check if a live session is currently joinable by students/instructors
   */
  public static isSessionJoinable(session: {
    status: LiveSessionStatus;
    startTime: Date;
    endTime: Date;
    joinBufferMinutes: number;
  }): boolean {
    if (session.status === LiveSessionStatus.CANCELLED || session.status === LiveSessionStatus.COMPLETED) {
      return false;
    }

    const now = new Date().getTime();
    const bufferMs = (session.joinBufferMinutes || 15) * 60 * 1000;
    const startWindow = new Date(session.startTime).getTime() - bufferMs;
    const endWindow = new Date(session.endTime).getTime() + 30 * 60 * 1000; // 30 min grace period after end

    return now >= startWindow && now <= endWindow;
  }

  /**
   * Create a new Live Class session (Instructors / Admins)
   */
  public static async createSession(data: CreateLiveSessionDTO, userId: string, userRole: string) {
    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      throw new AppError('Invalid start or end date/time format.', 400);
    }

    if (endTime <= startTime) {
      throw new AppError('End time must be after start time.', 400);
    }

    // Verify course exists
    const course = await prisma.course.findUnique({
      where: { id: data.courseId },
    });
    if (!course) {
      throw new AppError('Course not found.', 404);
    }

    // Determine instructor: if admin, can specify; otherwise instructor creates for themselves
    let instructorId = userId;
    if ((userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && data.instructorId) {
      instructorId = data.instructorId;
    } else if (userRole === 'INSTRUCTOR') {
      // If course has specific instructor, verify ownership
      if (course.instructorId !== userId) {
        throw new AppError('You can only schedule live classes for courses you instruct.', 403);
      }
      instructorId = userId;
    }

    // Verify instructor exists
    const instructor = await prisma.user.findUnique({
      where: { id: instructorId },
    });
    if (!instructor) {
      throw new AppError('Instructor not found.', 404);
    }

    const session = await prisma.liveSession.create({
      data: {
        title: data.title.trim(),
        description: data.description?.trim(),
        courseId: data.courseId,
        instructorId,
        startTime,
        endTime,
        timezone: data.timezone || 'UTC',
        maxParticipants: data.maxParticipants || 50,
        meetingProvider: data.meetingProvider || LiveMeetingProvider.EXTERNAL,
        meetingUrl: data.meetingUrl?.trim() || null,
        meetingId: data.meetingId?.trim() || null,
        meetingPasscode: data.meetingPasscode?.trim() || null,
        status: LiveSessionStatus.SCHEDULED,
        attendanceThresholdPercent: data.attendanceThresholdPercent || 70,
        joinBufferMinutes: data.joinBufferMinutes || 15,
      },
      include: {
        course: { select: { id: true, title: true, slug: true } },
        instructor: { select: { id: true, name: true, avatar: true, email: true } },
      },
    });

    return {
      ...session,
      dynamicStatus: this.computeDynamicStatus(session),
      isJoinable: this.isSessionJoinable(session),
    };
  }

  /**
   * Get Live Sessions with optional filters for discovery and catalog
   */
  public static async getSessions(
    query: {
      courseId?: string;
      instructorId?: string;
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
    userId?: string,
    userRole?: string
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.courseId) where.courseId = query.courseId;
    if (query.instructorId) where.instructorId = query.instructorId;

    if (query.status) {
      const s = query.status.toUpperCase();
      if (['SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED'].includes(s)) {
        where.status = s as LiveSessionStatus;
      }
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { course: { title: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [total, rawSessions] = await Promise.all([
      prisma.liveSession.count({ where }),
      prisma.liveSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startTime: 'asc' },
        include: {
          course: { select: { id: true, title: true, slug: true, isFree: true, price: true } },
          instructor: { select: { id: true, name: true, avatar: true } },
          _count: {
            select: {
              registrations: true,
              questions: true,
              attendances: true,
            },
          },
          registrations: userId
            ? {
                where: { userId },
                select: { id: true, registeredAt: true, status: true },
              }
            : false,
        },
      }),
    ]);

    const sessions = rawSessions.map((session) => {
      const dynamicStatus = this.computeDynamicStatus(session);
      const isJoinable = this.isSessionJoinable(session);
      const registeredCount = session._count.registrations;
      const isRegistered = Boolean(session.registrations && session.registrations.length > 0);
      const isFull = registeredCount >= session.maxParticipants;
      const availableSeats = Math.max(0, session.maxParticipants - registeredCount);

      const isPrivileged =
        userId &&
        (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || session.instructorId === userId);

      // Mask sensitive meeting URLs unless privileged or authorized
      const sanitized: any = {
        ...session,
        dynamicStatus,
        isJoinable,
        registeredCount,
        availableSeats,
        isFull,
        isRegistered,
        meetingUrl: isPrivileged || (isRegistered && isJoinable) ? session.meetingUrl : undefined,
        meetingPasscode:
          isPrivileged || (isRegistered && isJoinable) ? session.meetingPasscode : undefined,
      };
      delete sanitized.registrations;
      return sanitized;
    });

    return {
      sessions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single session details with full context
   */
  public static async getSessionById(sessionId: string, userId?: string, userRole?: string) {
    const session = await prisma.liveSession.findUnique({
      where: { id: sessionId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            thumbnail: true,
            isFree: true,
            price: true,
          },
        },
        instructor: { select: { id: true, name: true, avatar: true, bio: true, email: true } },
        _count: {
          select: {
            registrations: true,
            questions: true,
            attendances: true,
          },
        },
      },
    });

    if (!session) {
      throw new AppError('Live session not found.', 404);
    }

    let isRegistered = false;
    let userAttendance: any = null;

    if (userId) {
      const [reg, att] = await Promise.all([
        prisma.liveSessionRegistration.findUnique({
          where: { sessionId_userId: { sessionId, userId } },
        }),
        prisma.liveSessionAttendance.findUnique({
          where: { sessionId_userId: { sessionId, userId } },
        }),
      ]);
      isRegistered = Boolean(reg);
      userAttendance = att;
    }

    const dynamicStatus = this.computeDynamicStatus(session);
    const isJoinable = this.isSessionJoinable(session);
    const registeredCount = session._count.registrations;
    const isFull = registeredCount >= session.maxParticipants;
    const availableSeats = Math.max(0, session.maxParticipants - registeredCount);

    const isPrivileged =
      userId &&
      (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || session.instructorId === userId);

    const isAuthorizedForMeeting = isPrivileged || (isRegistered && isJoinable);

    return {
      ...session,
      dynamicStatus,
      isJoinable,
      registeredCount,
      availableSeats,
      isFull,
      isRegistered,
      userAttendance,
      // Mask meeting credentials if unauthorized
      meetingUrl: isAuthorizedForMeeting ? session.meetingUrl : null,
      meetingPasscode: isAuthorizedForMeeting ? session.meetingPasscode : null,
      meetingId: isAuthorizedForMeeting ? session.meetingId : null,
      hasRecording: Boolean(session.recordingUrl),
    };
  }

  /**
   * Get student's registered live classes grouped into tabs
   */
  public static async getMySessions(userId: string) {
    const registrations = await prisma.liveSessionRegistration.findMany({
      where: { userId },
      include: {
        session: {
          include: {
            course: { select: { id: true, title: true, slug: true, thumbnail: true } },
            instructor: { select: { id: true, name: true, avatar: true } },
            _count: { select: { registrations: true, questions: true } },
          },
        },
      },
      orderBy: { session: { startTime: 'asc' } },
    });

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const mapped = registrations.map((r) => {
      const s = r.session;
      const dynamicStatus = this.computeDynamicStatus(s);
      const isJoinable = this.isSessionJoinable(s);
      const isToday = s.startTime >= todayStart && s.startTime <= todayEnd;

      return {
        registrationId: r.id,
        registeredAt: r.registeredAt,
        ...s,
        dynamicStatus,
        isJoinable,
        isToday,
        registeredCount: s._count.registrations,
        meetingUrl: isJoinable ? s.meetingUrl : undefined,
        meetingPasscode: isJoinable ? s.meetingPasscode : undefined,
      };
    });

    const upcoming = mapped.filter(
      (m) => m.dynamicStatus === LiveSessionStatus.SCHEDULED && !m.isToday
    );
    const today = mapped.filter(
      (m) => m.isToday && m.dynamicStatus !== LiveSessionStatus.CANCELLED
    );
    const live = mapped.filter((m) => m.dynamicStatus === LiveSessionStatus.LIVE);
    const completed = mapped.filter((m) => m.dynamicStatus === LiveSessionStatus.COMPLETED);
    const cancelled = mapped.filter((m) => m.dynamicStatus === LiveSessionStatus.CANCELLED);

    return {
      all: mapped,
      upcoming,
      today,
      live,
      completed,
      cancelled,
    };
  }

  /**
   * Update session details (Instructors / Admins)
   */
  public static async updateSession(
    sessionId: string,
    data: UpdateLiveSessionDTO,
    userId: string,
    userRole: string
  ) {
    const session = await prisma.liveSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      throw new AppError('Live session not found.', 404);
    }

    if (session.instructorId !== userId && userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      throw new AppError('You do not have permission to modify this live session.', 403);
    }

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.description !== undefined) updateData.description = data.description?.trim();
    if (data.startTime !== undefined) updateData.startTime = new Date(data.startTime);
    if (data.endTime !== undefined) updateData.endTime = new Date(data.endTime);
    if (data.timezone !== undefined) updateData.timezone = data.timezone;
    if (data.maxParticipants !== undefined) updateData.maxParticipants = data.maxParticipants;
    if (data.meetingProvider !== undefined) updateData.meetingProvider = data.meetingProvider;
    if (data.meetingUrl !== undefined) updateData.meetingUrl = data.meetingUrl?.trim() || null;
    if (data.meetingId !== undefined) updateData.meetingId = data.meetingId?.trim() || null;
    if (data.meetingPasscode !== undefined)
      updateData.meetingPasscode = data.meetingPasscode?.trim() || null;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.attendanceThresholdPercent !== undefined)
      updateData.attendanceThresholdPercent = data.attendanceThresholdPercent;
    if (data.joinBufferMinutes !== undefined)
      updateData.joinBufferMinutes = data.joinBufferMinutes;
    if (data.recordingUrl !== undefined) {
      updateData.recordingUrl = data.recordingUrl?.trim() || null;
      updateData.recordingTitle = data.recordingTitle?.trim() || 'Session Recording';
      updateData.recordingDurationMinutes = data.recordingDurationMinutes || null;
      updateData.recordingUploadedAt = data.recordingUrl ? new Date() : null;
    }

    if (updateData.startTime && updateData.endTime && updateData.endTime <= updateData.startTime) {
      throw new AppError('End time must be after start time.', 400);
    }

    const updated = await prisma.liveSession.update({
      where: { id: sessionId },
      data: updateData,
      include: {
        course: { select: { id: true, title: true, slug: true } },
        instructor: { select: { id: true, name: true, avatar: true } },
      },
    });

    // If recording was added, notify registered students
    if (data.recordingUrl && !session.recordingUrl) {
      this.notifyRecordingAvailable(updated);
    }

    return {
      ...updated,
      dynamicStatus: this.computeDynamicStatus(updated),
      isJoinable: this.isSessionJoinable(updated),
    };
  }

  /**
   * Cancel a session (Instructors / Admins)
   */
  public static async cancelSession(sessionId: string, userId: string, userRole: string) {
    const session = await prisma.liveSession.findUnique({
      where: { id: sessionId },
      include: {
        registrations: { include: { user: true } },
        course: true,
      },
    });
    if (!session) {
      throw new AppError('Live session not found.', 404);
    }

    if (session.instructorId !== userId && userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      throw new AppError('You do not have permission to cancel this live session.', 403);
    }

    const updated = await prisma.liveSession.update({
      where: { id: sessionId },
      data: { status: LiveSessionStatus.CANCELLED },
    });

    // Notify registered students of cancellation
    for (const reg of session.registrations) {
      createNotification({
        userId: reg.userId,
        title: `Live Class Cancelled: ${session.title}`,
        message: `The live class "${session.title}" for ${session.course.title} has been cancelled.`,
        type: NotificationType.LIVE_CLASS_CANCELLED,
        linkUrl: `/live-classes/${sessionId}`,
      }).catch(() => {});

      if (reg.user?.email) {
        sendEmail({
          to: reg.user.email,
          subject: `Cancellation: ${session.title} Live Class`,
          html: `<p>Dear ${reg.user.name},</p><p>Please note that the live session <strong>${session.title}</strong> has been cancelled by the instructor.</p>`,
        }).catch(() => {});
      }
    }

    return updated;
  }

  /**
   * End a live session (Instructors / Admins)
   */
  public static async endSession(sessionId: string, userId: string, userRole: string) {
    const session = await prisma.liveSession.findUnique({
      where: { id: sessionId },
      include: {
        attendances: { where: { leftAt: null } },
        course: { select: { id: true, title: true, slug: true } },
        instructor: { select: { id: true, name: true, avatar: true } },
      },
    });
    if (!session) {
      throw new AppError('Live session not found.', 404);
    }

    if (session.instructorId !== userId && userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      throw new AppError('You do not have permission to end this live session.', 403);
    }

    const now = new Date();

    // Close any currently active attendee tracking records
    for (const att of session.attendances) {
      const duration = Math.max(1, Math.round((now.getTime() - new Date(att.joinedAt).getTime()) / (60 * 1000)));
      const scheduledDuration = Math.max(1, Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / (60 * 1000)));
      const threshold = session.attendanceThresholdPercent || 70;
      const attendedPercent = (duration / scheduledDuration) * 100;
      const newStatus = attendedPercent >= threshold ? LiveAttendanceStatus.PRESENT : (duration > 5 ? LiveAttendanceStatus.PARTIAL : att.status);

      await prisma.liveSessionAttendance.update({
        where: { id: att.id },
        data: {
          leftAt: now,
          durationMinutes: duration,
          status: newStatus,
        },
      });
    }

    // Update session status to COMPLETED and adjust endTime if ended earlier
    const updated = await prisma.liveSession.update({
      where: { id: sessionId },
      data: {
        status: LiveSessionStatus.COMPLETED,
        endTime: session.endTime > now ? now : session.endTime,
      },
      include: {
        course: { select: { id: true, title: true, slug: true } },
        instructor: { select: { id: true, name: true, avatar: true } },
      },
    });

    return {
      ...updated,
      dynamicStatus: LiveSessionStatus.COMPLETED,
      isJoinable: false,
    };
  }

  /**
   * Delete a session (Instructors / Admins)
   */
  public static async deleteSession(sessionId: string, userId: string, userRole: string) {
    const session = await prisma.liveSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      throw new AppError('Live session not found.', 404);
    }

    if (session.instructorId !== userId && userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      throw new AppError('You do not have permission to delete this live session.', 403);
    }

    await prisma.liveSession.delete({
      where: { id: sessionId },
    });

    return { message: 'Live session deleted successfully.' };
  }

  /**
   * Register for a live session with race-condition safety & capacity enforcement
   */
  public static async registerForSession(sessionId: string, userId: string) {
    // 1. Check user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found.', 404);
    }

    // 2. Atomic registration using transaction
    return await prisma.$transaction(async (tx) => {
      const session = await tx.liveSession.findUnique({
        where: { id: sessionId },
        include: {
          course: true,
          _count: { select: { registrations: true } },
        },
      });

      if (!session) {
        throw new AppError('Live class session not found.', 404);
      }

      if (session.status === LiveSessionStatus.CANCELLED) {
        throw new AppError('This live class session has been cancelled.', 400);
      }

      const dynamicStatus = this.computeDynamicStatus(session);
      if (dynamicStatus === LiveSessionStatus.COMPLETED) {
        throw new AppError('This live class session has already ended.', 400);
      }

      // Check course access if course is paid
      if (!session.course.isFree) {
        const enrollment = await tx.enrollment.findUnique({
          where: { userId_courseId: { userId, courseId: session.courseId } },
        });
        if (!enrollment || enrollment.status === 'CANCELLED') {
          throw new AppError(
            'You must be enrolled in the course to register for this live session.',
            403
          );
        }
      }

      // Check if already registered
      const existing = await tx.liveSessionRegistration.findUnique({
        where: { sessionId_userId: { sessionId, userId } },
      });
      if (existing) {
        throw new AppError('You are already registered for this live session.', 400);
      }

      // Check capacity
      if (session._count.registrations >= session.maxParticipants) {
        throw new AppError('This session has reached maximum capacity.', 400);
      }

      // Create registration
      const registration = await tx.liveSessionRegistration.create({
        data: {
          sessionId,
          userId,
          status: 'REGISTERED',
        },
        include: {
          session: {
            include: {
              course: { select: { title: true } },
              instructor: { select: { name: true } },
            },
          },
        },
      });

      // Send confirmation notification
      createNotification({
        userId,
        title: `Registered: ${session.title}`,
        message: `You are registered for "${session.title}". Class starts on ${new Date(
          session.startTime
        ).toLocaleDateString()}.`,
        type: NotificationType.LIVE_CLASS_REMINDER_24H,
        linkUrl: `/live-classes/${sessionId}`,
      }).catch(() => {});

      if (user.email) {
        sendEmail({
          to: user.email,
          subject: `Registration Confirmed: ${session.title}`,
          html: `<div style="font-family: sans-serif; color: #1e293b;">
            <h2>Live Class Registration Confirmed</h2>
            <p>Hi ${user.name},</p>
            <p>You have successfully registered for <strong>${session.title}</strong> (${session.course.title}).</p>
            <p><strong>Date & Time:</strong> ${new Date(session.startTime).toUTCString()}</p>
            <p>You can join the class from your dashboard 15 minutes before start time.</p>
            <p><a href="http://localhost:5173/live-classes/${sessionId}" style="display:inline-block;padding:10px 20px;background:#0284c7;color:#fff;text-decoration:none;border-radius:6px;">View Session Details</a></p>
          </div>`,
        }).catch(() => {});
      }

      return {
        message: 'Successfully registered for live class.',
        registration,
      };
    });
  }

  /**
   * Unregister from a live session
   */
  public static async unregisterFromSession(sessionId: string, userId: string) {
    const registration = await prisma.liveSessionRegistration.findUnique({
      where: { sessionId_userId: { sessionId, userId } },
    });

    if (!registration) {
      throw new AppError('You are not registered for this live session.', 400);
    }

    await prisma.liveSessionRegistration.delete({
      where: { id: registration.id },
    });

    return { message: 'Successfully unregistered from live session.' };
  }

  /**
   * Join a live session securely & log initial attendance
   */
  public static async joinSession(sessionId: string, userId: string, userRole: string) {
    const session = await prisma.liveSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new AppError('Live session not found.', 404);
    }

    const isPrivileged =
      userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || session.instructorId === userId;

    if (!isPrivileged) {
      const registration = await prisma.liveSessionRegistration.findUnique({
        where: { sessionId_userId: { sessionId, userId } },
      });
      if (!registration) {
        throw new AppError('You must register for this session before joining.', 403);
      }
    }

    if (!this.isSessionJoinable(session) && !isPrivileged) {
      throw new AppError(
        `Join button is available ${session.joinBufferMinutes || 15} minutes before class starts.`,
        400
      );
    }

    if (session.status === LiveSessionStatus.CANCELLED) {
      throw new AppError('This live class has been cancelled.', 400);
    }

    // Record attendance join timestamp
    const now = new Date();
    await prisma.liveSessionAttendance.upsert({
      where: { sessionId_userId: { sessionId, userId } },
      create: {
        sessionId,
        userId,
        joinedAt: now,
        status: LiveAttendanceStatus.PRESENT,
        markedBy: 'SYSTEM',
      },
      update: {
        // If rejoining, update status to PRESENT
        status: LiveAttendanceStatus.PRESENT,
      },
    });

    return {
      meetingUrl: session.meetingUrl,
      meetingProvider: session.meetingProvider,
      meetingId: session.meetingId,
      meetingPasscode: session.meetingPasscode,
      title: session.title,
      isExternal: session.meetingProvider === LiveMeetingProvider.EXTERNAL,
    };
  }

  /**
   * Record student leave time and compute attendance duration & threshold status
   */
  public static async leaveSession(sessionId: string, userId: string) {
    const attendance = await prisma.liveSessionAttendance.findUnique({
      where: { sessionId_userId: { sessionId, userId } },
      include: { session: true },
    });

    if (!attendance) return null;

    const leftAt = new Date();
    const joinedAt = attendance.joinedAt;
    const durationMinutes = Math.max(
      attendance.durationMinutes,
      Math.round((leftAt.getTime() - joinedAt.getTime()) / (60 * 1000))
    );

    const sessionDurationMinutes = Math.max(
      1,
      Math.round(
        (attendance.session.endTime.getTime() - attendance.session.startTime.getTime()) / (60 * 1000)
      )
    );

    const attendancePercent = (durationMinutes / sessionDurationMinutes) * 100;
    const threshold = attendance.session.attendanceThresholdPercent || 70;

    let status: LiveAttendanceStatus = LiveAttendanceStatus.PRESENT;
    if (attendancePercent < threshold && attendancePercent >= 20) {
      status = LiveAttendanceStatus.PARTIAL;
    } else if (attendancePercent < 20) {
      status = LiveAttendanceStatus.ABSENT;
    }

    const updated = await prisma.liveSessionAttendance.update({
      where: { id: attendance.id },
      data: {
        leftAt,
        durationMinutes,
        status,
      },
    });

    return updated;
  }

  /**
   * Get participants for a session (Instructors / Admins)
   */
  public static async getParticipants(sessionId: string, userId: string, userRole: string) {
    const session = await prisma.liveSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new AppError('Session not found.', 404);

    if (session.instructorId !== userId && userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      throw new AppError('Unauthorized.', 403);
    }

    const registrations = await prisma.liveSessionRegistration.findMany({
      where: { sessionId },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
      },
      orderBy: { registeredAt: 'asc' },
    });

    return registrations;
  }

  /**
   * Get attendance list (Instructors / Admins)
   */
  public static async getAttendance(sessionId: string, userId: string, userRole: string) {
    const session = await prisma.liveSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new AppError('Session not found.', 404);

    if (session.instructorId !== userId && userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      throw new AppError('Unauthorized.', 403);
    }

    const attendances = await prisma.liveSessionAttendance.findMany({
      where: { sessionId },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return attendances;
  }

  /**
   * Manual attendance override (Instructors / Admins)
   */
  public static async updateAttendance(
    sessionId: string,
    targetUserId: string,
    status: LiveAttendanceStatus,
    durationMinutes?: number,
    instructorUserId?: string,
    userRole?: string
  ) {
    const session = await prisma.liveSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new AppError('Session not found.', 404);

    if (
      session.instructorId !== instructorUserId &&
      userRole !== 'ADMIN' &&
      userRole !== 'SUPER_ADMIN'
    ) {
      throw new AppError('Unauthorized.', 403);
    }

    const updated = await prisma.liveSessionAttendance.upsert({
      where: { sessionId_userId: { sessionId, userId: targetUserId } },
      create: {
        sessionId,
        userId: targetUserId,
        status,
        durationMinutes: durationMinutes || 0,
        markedBy: instructorUserId || 'INSTRUCTOR',
      },
      update: {
        status,
        durationMinutes: durationMinutes !== undefined ? durationMinutes : undefined,
        markedBy: instructorUserId || 'INSTRUCTOR',
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });

    return updated;
  }

  /**
   * Q&A: Get questions for a session
   */
  public static async getQuestions(sessionId: string, userId?: string) {
    const questions = await prisma.liveSessionQuestion.findMany({
      where: { sessionId },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { upvotes: 'desc' }, { createdAt: 'desc' }],
    });

    return questions.map((q) => ({
      ...q,
      hasUpvoted: userId ? q.upvotedUserIds.includes(userId) : false,
    }));
  }

  /**
   * Q&A: Post a question
   */
  public static async askQuestion(sessionId: string, userId: string, questionText: string) {
    const session = await prisma.liveSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new AppError('Live session not found.', 404);

    if (!questionText || questionText.trim().length < 3) {
      throw new AppError('Question text must be at least 3 characters long.', 400);
    }

    const question = await prisma.liveSessionQuestion.create({
      data: {
        sessionId,
        userId,
        question: questionText.trim(),
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    });

    return question;
  }

  /**
   * Q&A: Answer a question (Instructor / Admin)
   */
  public static async answerQuestion(
    sessionId: string,
    questionId: string,
    answer: string,
    instructorUserId: string,
    userRole: string
  ) {
    const session = await prisma.liveSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new AppError('Live session not found.', 404);

    if (
      session.instructorId !== instructorUserId &&
      userRole !== 'ADMIN' &&
      userRole !== 'SUPER_ADMIN'
    ) {
      throw new AppError('Only the instructor or admin can answer questions.', 403);
    }

    const instructor = await prisma.user.findUnique({ where: { id: instructorUserId } });

    const updated = await prisma.liveSessionQuestion.update({
      where: { id: questionId },
      data: {
        answer: answer.trim(),
        answeredBy: instructor?.name || 'Instructor',
        answeredAt: new Date(),
        isAnswered: true,
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    });

    return updated;
  }

  /**
   * Q&A: Upvote toggle
   */
  public static async upvoteQuestion(sessionId: string, questionId: string, userId: string) {
    const question = await prisma.liveSessionQuestion.findUnique({ where: { id: questionId } });
    if (!question) throw new AppError('Question not found.', 404);

    const hasUpvoted = question.upvotedUserIds.includes(userId);
    let updatedUpvotedUserIds = [...question.upvotedUserIds];
    let newUpvotes = question.upvotes;

    if (hasUpvoted) {
      updatedUpvotedUserIds = updatedUpvotedUserIds.filter((id) => id !== userId);
      newUpvotes = Math.max(0, newUpvotes - 1);
    } else {
      updatedUpvotedUserIds.push(userId);
      newUpvotes += 1;
    }

    const updated = await prisma.liveSessionQuestion.update({
      where: { id: questionId },
      data: {
        upvotes: newUpvotes,
        upvotedUserIds: updatedUpvotedUserIds,
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    });

    return {
      ...updated,
      hasUpvoted: !hasUpvoted,
    };
  }

  /**
   * Q&A: Pin/Unpin question
   */
  public static async pinQuestion(
    sessionId: string,
    questionId: string,
    instructorUserId: string,
    userRole: string
  ) {
    const session = await prisma.liveSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new AppError('Live session not found.', 404);

    if (
      session.instructorId !== instructorUserId &&
      userRole !== 'ADMIN' &&
      userRole !== 'SUPER_ADMIN'
    ) {
      throw new AppError('Unauthorized.', 403);
    }

    const question = await prisma.liveSessionQuestion.findUnique({ where: { id: questionId } });
    if (!question) throw new AppError('Question not found.', 404);

    const updated = await prisma.liveSessionQuestion.update({
      where: { id: questionId },
      data: { isPinned: !question.isPinned },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    });

    return updated;
  }

  /**
   * Q&A: Delete question
   */
  public static async deleteQuestion(
    sessionId: string,
    questionId: string,
    userId: string,
    userRole: string
  ) {
    const question = await prisma.liveSessionQuestion.findUnique({
      where: { id: questionId },
      include: { session: true },
    });
    if (!question) throw new AppError('Question not found.', 404);

    const isOwner = question.userId === userId;
    const isInstructor = question.session.instructorId === userId;
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

    if (!isOwner && !isInstructor && !isAdmin) {
      throw new AppError('You do not have permission to delete this question.', 403);
    }

    await prisma.liveSessionQuestion.delete({ where: { id: questionId } });
    return { message: 'Question deleted successfully.' };
  }

  /**
   * Attach / Update Session Recording
   */
  public static async attachRecording(
    sessionId: string,
    recordingData: { recordingUrl: string; recordingTitle?: string; durationMinutes?: number },
    userId: string,
    userRole: string
  ) {
    const session = await prisma.liveSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new AppError('Session not found.', 404);

    if (session.instructorId !== userId && userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      throw new AppError('Unauthorized.', 403);
    }

    const updated = await prisma.liveSession.update({
      where: { id: sessionId },
      data: {
        recordingUrl: recordingData.recordingUrl.trim(),
        recordingTitle: recordingData.recordingTitle?.trim() || `${session.title} - Recording`,
        recordingDurationMinutes: recordingData.durationMinutes || null,
        recordingUploadedAt: new Date(),
        status: LiveSessionStatus.COMPLETED,
      },
      include: { course: true },
    });

    this.notifyRecordingAvailable(updated);

    return updated;
  }

  /**
   * Notify registered students when recording is attached
   */
  private static async notifyRecordingAvailable(session: any) {
    try {
      const registrations = await prisma.liveSessionRegistration.findMany({
        where: { sessionId: session.id },
        include: { user: true },
      });

      for (const reg of registrations) {
        createNotification({
          userId: reg.userId,
          title: `Recording Available: ${session.title}`,
          message: `The recording for "${session.title}" is now available to watch.`,
          type: NotificationType.LIVE_CLASS_RECORDING_AVAILABLE,
          linkUrl: `/live-classes/${session.id}`,
        }).catch(() => {});

        if (reg.user?.email) {
          appEventBus.emitEvent(AcademyEvent.LIVE_CLASS_MISSED, {
            userId: reg.userId,
            email: reg.user.email,
            name: reg.user.name,
            sessionId: session.id,
            sessionTitle: session.title,
            courseTitle: session.course?.title || 'Live Session',
            recordingUrl: session.recordingUrl || undefined,
          });
        }
      }
    } catch (e) {}
  }

  /**
   * Generate RFC 5545 standard .ics calendar file for a single session
   */
  public static async generateSessionIcs(sessionId: string): Promise<string> {
    const session = await prisma.liveSession.findUnique({
      where: { id: sessionId },
      include: {
        course: { select: { title: true } },
        instructor: { select: { name: true, email: true } },
      },
    });

    if (!session) throw new AppError('Session not found.', 404);

    const formatIcsDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const start = formatIcsDate(session.startTime);
    const end = formatIcsDate(session.endTime);
    const now = formatIcsDate(new Date());

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Khalil Academy//Live Classes//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:live-session-${session.id}@khalilacademy.com`,
      `DTSTAMP:${now}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${session.title} - ${session.course.title}`,
      `DESCRIPTION:${session.description || 'Khalil Academy Live Interactive Class'} (Instructor: ${session.instructor.name})`,
      `ORGANIZER;CN=${session.instructor.name}:MAILTO:${session.instructor.email}`,
      `URL:http://localhost:5173/live-classes/${session.id}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    return icsContent;
  }

  /**
   * Generate RFC 5545 calendar feed for all registered sessions of a student
   */
  public static async generateUserIcs(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found.', 404);

    const registrations = await prisma.liveSessionRegistration.findMany({
      where: { userId },
      include: {
        session: {
          include: {
            course: { select: { title: true } },
            instructor: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { session: { startTime: 'asc' } },
    });

    const formatIcsDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const now = formatIcsDate(new Date());

    const events = registrations.map((r) => {
      const s = r.session;
      const start = formatIcsDate(s.startTime);
      const end = formatIcsDate(s.endTime);

      return [
        'BEGIN:VEVENT',
        `UID:live-session-${s.id}-${userId}@khalilacademy.com`,
        `DTSTAMP:${now}`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `SUMMARY:${s.title} (${s.course.title})`,
        `DESCRIPTION:${s.description || 'Khalil Academy Live Class'} | Instructor: ${s.instructor.name}`,
        `ORGANIZER;CN=${s.instructor.name}:MAILTO:${s.instructor.email}`,
        `URL:http://localhost:5173/live-classes/${s.id}`,
        'STATUS:CONFIRMED',
        'END:VEVENT',
      ].join('\r\n');
    });

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      `PRODID:-//Khalil Academy//${user.name} Live Schedule//EN`,
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:Khalil Academy - ${user.name}'s Live Classes`,
      ...events,
      'END:VCALENDAR',
    ].join('\r\n');

    return icsContent;
  }
}
