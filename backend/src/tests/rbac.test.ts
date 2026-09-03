import request from 'supertest';
import { app } from '../app';
import { prisma } from '../config/database';
import { generateAccessToken } from '../utils/jwt';

describe('Role-Based Access Control (RBAC) Security Tests', () => {
  const timestamp = Date.now();
  const studentId = `student_rbac_${timestamp}`;
  const instructorId = `instructor_rbac_${timestamp}`;
  const adminId = `admin_rbac_${timestamp}`;

  let studentToken: string;
  let instructorToken: string;
  let adminToken: string;

  beforeAll(async () => {
    await prisma.user.createMany({
      data: [
        {
          id: studentId,
          email: `student_${timestamp}@khalilacademy.com`,
          name: 'Student RBAC User',
          passwordHash: '$2a$10$abcdefghijklmnopqrstuv',
          role: 'STUDENT',
          status: 'ACTIVE',
        },
        {
          id: instructorId,
          email: `instructor_${timestamp}@khalilacademy.com`,
          name: 'Instructor RBAC User',
          passwordHash: '$2a$10$abcdefghijklmnopqrstuv',
          role: 'INSTRUCTOR',
          status: 'ACTIVE',
        },
        {
          id: adminId,
          email: `admin_${timestamp}@khalilacademy.com`,
          name: 'Admin RBAC User',
          passwordHash: '$2a$10$abcdefghijklmnopqrstuv',
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      ],
      skipDuplicates: true,
    });

    studentToken = generateAccessToken({
      userId: studentId,
      email: `student_${timestamp}@khalilacademy.com`,
      role: 'STUDENT',
    });

    instructorToken = generateAccessToken({
      userId: instructorId,
      email: `instructor_${timestamp}@khalilacademy.com`,
      role: 'INSTRUCTOR',
    });

    adminToken = generateAccessToken({
      userId: adminId,
      email: `admin_${timestamp}@khalilacademy.com`,
      role: 'ADMIN',
    });
  });

  afterAll(async () => {
    await prisma.course.deleteMany({
      where: { instructorId },
    });
    await prisma.user.deleteMany({
      where: {
        id: { in: [studentId, instructorId, adminId] },
      },
    });
    await prisma.$disconnect();
  });

  it('should block unauthenticated access to protected routes', async () => {
    const res = await request(app).get('/api/admin/dashboard');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should prevent STUDENT role from accessing admin dashboard endpoints', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Access denied');
  });

  it('should prevent STUDENT role from creating courses', async () => {
    const res = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ title: 'Unauthorized Course' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should allow INSTRUCTOR role to access course creation routes', async () => {
    // Will fail validation or database connection if unseeded, but passes RBAC check (returns non-403 error if data invalid)
    const res = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ title: 'New Tech Course' });

    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(401);
  });

  it('should allow ADMIN role to access admin dashboard endpoints', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(401);
  });
});
