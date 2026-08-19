import request from 'supertest';
import { app } from '../app';
import { prisma } from '../config/database';
import bcrypt from 'bcryptjs';

describe('Authentication & User Management API Tests', () => {
  const testEmail = `testuser_${Date.now()}@example.com`;
  const testPassword = 'Password123!';

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: 'testuser_' } } });
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new student account successfully', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Test Student',
        email: testEmail,
        password: testPassword,
        confirmPassword: testPassword,
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.email).toBe(testEmail.toLowerCase());
      expect(res.body.user.role).toBe('STUDENT');
    });

    it('should reject registration with duplicate email', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Test Student Duplicate',
        email: testEmail,
        password: testPassword,
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });

    it('should reject registration when passwords do not match', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Test Student Mismatch',
        email: `mismatch_${Date.now()}@example.com`,
        password: testPassword,
        confirmPassword: 'DifferentPassword123!',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should authenticate user and return access & refresh tokens', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: testEmail,
        password: testPassword,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.user.email).toBe(testEmail.toLowerCase());
    });

    it('should reject login with wrong password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: testEmail,
        password: 'WrongPassword!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
