import request from 'supertest';
import { app } from '../app';
import { generateAccessToken } from '../utils/jwt';

describe('Role-Based Access Control (RBAC) Security Tests', () => {
  const studentToken = generateAccessToken({
    userId: 'student-id-123',
    email: 'student@example.com',
    role: 'STUDENT',
  });

  const instructorToken = generateAccessToken({
    userId: 'instructor-id-123',
    email: 'instructor@example.com',
    role: 'INSTRUCTOR',
  });

  const adminToken = generateAccessToken({
    userId: 'admin-id-123',
    email: 'admin@example.com',
    role: 'ADMIN',
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
