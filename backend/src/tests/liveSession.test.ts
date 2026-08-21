import request from 'supertest';
import { app } from '../app';
import { prisma } from '../config/database';
import { generateAccessToken } from '../utils/jwt';
import bcrypt from 'bcryptjs';

describe('Live Classes & Virtual Classroom Test Suite', () => {
  let instructorUser: any;
  let studentA: any;
  let studentB: any;
  let instructorToken: string;
  let studentAToken: string;
  let studentBToken: string;

  let testCourse: any;
  let testCategory: any;
  let createdSessionId: string;
  let createdQuestionId: string;

  beforeAll(async () => {
    const pwdHash = await bcrypt.hash('Password123!', 10);

    // 1. Create Instructor & Students
    instructorUser = await prisma.user.create({
      data: {
        email: `instructor_live_${Date.now()}@khalilacademy.com`,
        name: 'Khalil Instructor',
        passwordHash: pwdHash,
        role: 'INSTRUCTOR',
        status: 'ACTIVE',
      },
    });

    studentA = await prisma.user.create({
      data: {
        email: `student_live_a_${Date.now()}@khalilacademy.com`,
        name: 'Alice Student',
        passwordHash: pwdHash,
        role: 'STUDENT',
        status: 'ACTIVE',
      },
    });

    studentB = await prisma.user.create({
      data: {
        email: `student_live_b_${Date.now()}@khalilacademy.com`,
        name: 'Bob Student',
        passwordHash: pwdHash,
        role: 'STUDENT',
        status: 'ACTIVE',
      },
    });

    instructorToken = generateAccessToken({
      userId: instructorUser.id,
      role: instructorUser.role,
      email: instructorUser.email,
    });
    studentAToken = generateAccessToken({
      userId: studentA.id,
      role: studentA.role,
      email: studentA.email,
    });
    studentBToken = generateAccessToken({
      userId: studentB.id,
      role: studentB.role,
      email: studentB.email,
    });

    // 2. Create Category and Course
    testCategory = await prisma.category.create({
      data: {
        name: `Cloud Architecture ${Date.now()}`,
        slug: `cloud-arch-${Date.now()}`,
      },
    });

    testCourse = await prisma.course.create({
      data: {
        title: 'AWS Production Deployment Workshop',
        slug: `aws-prod-deploy-${Date.now()}`,
        description: 'Master AWS ECS, EKS, and Terraform in live interactive sessions.',
        instructorId: instructorUser.id,
        categoryId: testCategory.id,
        isFree: true,
        status: 'PUBLISHED',
      },
    });
  });

  afterAll(async () => {
    // Cleanup in order
    await prisma.liveSessionQuestion.deleteMany({
      where: { session: { courseId: testCourse.id } },
    });
    await prisma.liveSessionAttendance.deleteMany({
      where: { session: { courseId: testCourse.id } },
    });
    await prisma.liveSessionRegistration.deleteMany({
      where: { session: { courseId: testCourse.id } },
    });
    await prisma.liveSession.deleteMany({ where: { courseId: testCourse.id } });
    await prisma.course.deleteMany({ where: { id: testCourse.id } });
    await prisma.category.deleteMany({ where: { id: testCategory.id } });
    await prisma.user.deleteMany({
      where: { id: { in: [instructorUser.id, studentA.id, studentB.id] } },
    });
    await prisma.$disconnect();
  });

  describe('Session Creation & Validation', () => {
    it('should reject session creation if end time is before start time', async () => {
      const now = new Date();
      const res = await request(app)
        .post('/api/live-sessions')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: 'Invalid Time Session',
          courseId: testCourse.id,
          startTime: new Date(now.getTime() + 2 * 3600 * 1000).toISOString(),
          endTime: new Date(now.getTime() + 1 * 3600 * 1000).toISOString(), // earlier
          maxParticipants: 10,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should allow an instructor to create a live class session', async () => {
      const start = new Date(Date.now() + 24 * 3600 * 1000);
      const end = new Date(Date.now() + 26 * 3600 * 1000);

      const res = await request(app)
        .post('/api/live-sessions')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: 'AWS Live Workshop: Microservices on ECS',
          description: 'Hands-on deployment session covering Docker and AWS ECS Fargate.',
          courseId: testCourse.id,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          timezone: 'Africa/Nairobi',
          maxParticipants: 2, // Low capacity for testing capacity limits
          meetingProvider: 'GOOGLE_MEET',
          meetingUrl: 'https://meet.google.com/abc-defg-hij',
          meetingPasscode: 'KHALIL2026',
          attendanceThresholdPercent: 70,
          joinBufferMinutes: 15,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.session.id).toBeDefined();
      expect(res.body.session.title).toContain('AWS Live Workshop');
      expect(res.body.session.dynamicStatus).toBe('SCHEDULED');
      expect(res.body.session.maxParticipants).toBe(2);
      createdSessionId = res.body.session.id;
    });
  });

  describe('Discovery & Access Control', () => {
    it('should list live sessions with capacity and dynamic status', async () => {
      const res = await request(app).get('/api/live-sessions');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.sessions)).toBe(true);

      const target = res.body.sessions.find((s: any) => s.id === createdSessionId);
      expect(target).toBeDefined();
      expect(target.registeredCount).toBe(0);
      expect(target.availableSeats).toBe(2);
      expect(target.isFull).toBe(false);
      // Unauthenticated / non-registered users must not see the private meeting URL
      expect(target.meetingUrl).toBeUndefined();
    });

    it('should fetch single session details and protect meeting credentials', async () => {
      const res = await request(app).get(`/api/live-sessions/${createdSessionId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.session.title).toContain('AWS Live Workshop');
      expect(res.body.session.meetingUrl).toBeNull();
    });
  });

  describe('Session Registration & Capacity Limits', () => {
    it('should allow Student A to register for the live session', async () => {
      const res = await request(app)
        .post(`/api/live-sessions/${createdSessionId}/register`)
        .set('Authorization', `Bearer ${studentAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.registration).toBeDefined();
    });

    it('should prevent Student A from registering twice for the same session', async () => {
      const res = await request(app)
        .post(`/api/live-sessions/${createdSessionId}/register`)
        .set('Authorization', `Bearer ${studentAToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already registered');
    });

    it('should show the session in Student A personal list', async () => {
      const res = await request(app)
        .get('/api/live-sessions/my')
        .set('Authorization', `Bearer ${studentAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.upcoming.length).toBeGreaterThanOrEqual(1);
      const found = res.body.upcoming.find((s: any) => s.id === createdSessionId);
      expect(found).toBeDefined();
    });

    it('should allow Student B to take the final seat (capacity = 2)', async () => {
      const res = await request(app)
        .post(`/api/live-sessions/${createdSessionId}/register`)
        .set('Authorization', `Bearer ${studentBToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject a 3rd student registration when session is full', async () => {
      // Create Student C
      const pwdHash = await bcrypt.hash('Password123!', 10);
      const studentC = await prisma.user.create({
        data: {
          email: `student_c_${Date.now()}@khalilacademy.com`,
          name: 'Charlie Student',
          passwordHash: pwdHash,
          role: 'STUDENT',
          status: 'ACTIVE',
        },
      });
      const tokenC = generateAccessToken({
        userId: studentC.id,
        role: studentC.role,
        email: studentC.email,
      });

      const res = await request(app)
        .post(`/api/live-sessions/${createdSessionId}/register`)
        .set('Authorization', `Bearer ${tokenC}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('maximum capacity');

      await prisma.user.delete({ where: { id: studentC.id } });
    });
  });

  describe('Joining & Attendance Tracking', () => {
    it('should reject join request if user is not registered and not privileged', async () => {
      // Create Unregistered Student D
      const pwdHash = await bcrypt.hash('Password123!', 10);
      const studentD = await prisma.user.create({
        data: {
          email: `student_d_${Date.now()}@khalilacademy.com`,
          name: 'David Student',
          passwordHash: pwdHash,
          role: 'STUDENT',
          status: 'ACTIVE',
        },
      });
      const tokenD = generateAccessToken({
        userId: studentD.id,
        role: studentD.role,
        email: studentD.email,
      });

      const res = await request(app)
        .post(`/api/live-sessions/${createdSessionId}/join`)
        .set('Authorization', `Bearer ${tokenD}`);

      expect(res.status).toBe(403);

      await prisma.user.delete({ where: { id: studentD.id } });
    });

    it('should allow Instructor to join session and receive meeting details', async () => {
      const res = await request(app)
        .post(`/api/live-sessions/${createdSessionId}/join`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.meetingUrl).toBe('https://meet.google.com/abc-defg-hij');
      expect(res.body.meetingPasscode).toBe('KHALIL2026');
    });

    it('should allow Instructor to fetch participant list and attendance', async () => {
      const partRes = await request(app)
        .get(`/api/live-sessions/${createdSessionId}/participants`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(partRes.status).toBe(200);
      expect(partRes.body.participants.length).toBe(2);

      const attRes = await request(app)
        .get(`/api/live-sessions/${createdSessionId}/attendance`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(attRes.status).toBe(200);
      expect(Array.isArray(attRes.body.attendances)).toBe(true);
    });

    it('should allow Instructor to manually update student attendance status', async () => {
      const res = await request(app)
        .patch(`/api/live-sessions/${createdSessionId}/attendance/${studentA.id}`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          status: 'PRESENT',
          durationMinutes: 110,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.attendance.status).toBe('PRESENT');
      expect(res.body.attendance.durationMinutes).toBe(110);
    });
  });

  describe('Session Q&A', () => {
    it('should allow Student A to ask a question in the live session', async () => {
      const res = await request(app)
        .post(`/api/live-sessions/${createdSessionId}/questions`)
        .set('Authorization', `Bearer ${studentAToken}`)
        .send({
          question: 'How do we handle blue-green deployments on ECS Fargate without downtime?',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.question.id).toBeDefined();
      expect(res.body.question.question).toContain('blue-green');
      createdQuestionId = res.body.question.id;
    });

    it('should allow Student B to upvote Student A question', async () => {
      const res = await request(app)
        .post(`/api/live-sessions/${createdSessionId}/questions/${createdQuestionId}/upvote`)
        .set('Authorization', `Bearer ${studentBToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.question.upvotes).toBe(1);
    });

    it('should allow Instructor to answer and pin the question', async () => {
      const ansRes = await request(app)
        .post(`/api/live-sessions/${createdSessionId}/questions/${createdQuestionId}/answer`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          answer:
            'Use AWS CodeDeploy with Application Load Balancer target group swapping. We will demonstrate this live today!',
        });

      expect(ansRes.status).toBe(200);
      expect(ansRes.body.question.isAnswered).toBe(true);
      expect(ansRes.body.question.answer).toContain('CodeDeploy');

      const pinRes = await request(app)
        .patch(`/api/live-sessions/${createdSessionId}/questions/${createdQuestionId}/pin`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(pinRes.status).toBe(200);
      expect(pinRes.body.question.isPinned).toBe(true);
    });
  });

  describe('Recording & Calendar Exports', () => {
    it('should allow Instructor to attach session recording', async () => {
      const res = await request(app)
        .post(`/api/live-sessions/${createdSessionId}/recording`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          recordingUrl: 'https://cdn.khalilacademy.com/recordings/aws-live-workshop-01.mp4',
          recordingTitle: 'AWS Live Workshop 01 - Full Recording & Labs',
          durationMinutes: 120,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.session.recordingUrl).toBeTruthy();
    });

    it('should export single session ICS calendar file with valid RFC 5545 headers', async () => {
      const res = await request(app).get(`/api/live-sessions/${createdSessionId}/calendar.ics`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/calendar');
      expect(res.text).toContain('BEGIN:VCALENDAR');
      expect(res.text).toContain('BEGIN:VEVENT');
      expect(res.text).toContain('AWS Live Workshop');
      expect(res.text).toContain('END:VCALENDAR');
    });

    it('should export user personal ICS calendar feed', async () => {
      const res = await request(app)
        .get('/api/live-sessions/calendar.ics')
        .set('Authorization', `Bearer ${studentAToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/calendar');
      expect(res.text).toContain('BEGIN:VCALENDAR');
      expect(res.text).toContain('AWS Live Workshop');
    });
  });
});
