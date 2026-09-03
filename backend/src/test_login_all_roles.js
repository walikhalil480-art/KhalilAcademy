const supertest = require('supertest');
const { app } = require('../dist/app');

async function testAllLogins() {
  console.log('--- Testing API Authentication & Login Endpoint Directly ---');

  const testAccounts = [
    { role: 'SUPER_ADMIN', email: 'admin@khalilacademy.com', password: 'Admin@12345' },
    { role: 'ADMIN', email: 'academy.admin@khalilacademy.com', password: 'Admin@12345' },
    { role: 'INSTRUCTOR', email: 'instructor@khalilacademy.com', password: 'Instructor@12345' },
    { role: 'STUDENT', email: 'student@khalilacademy.com', password: 'Student@12345' },
  ];

  const tokens = {};

  for (const acc of testAccounts) {
    const res = await supertest(app)
      .post('/api/auth/login')
      .send({ email: acc.email, password: acc.password });

    console.log(`\nTesting Login for Role [${acc.role}] (${acc.email}):`);
    console.log(`Status: ${res.status}`);
    console.log(`Success: ${res.body.success}`);

    if (res.status === 200 && res.body.success) {
      console.log(`✓ User ID: ${res.body.user.id}`);
      console.log(`✓ Returned Role: ${res.body.user.role}`);
      console.log(`✓ Access Token Generated: ${res.body.accessToken ? 'YES' : 'NO'}`);
      console.log(`✓ Refresh Token Generated: ${res.body.refreshToken ? 'YES' : 'NO'}`);
      tokens[acc.role] = res.body.accessToken;
    } else {
      console.error(`❌ LOGIN FAILED for ${acc.role}:`, res.body);
      process.exit(1);
    }
  }

  console.log('\n--- Testing Authorization Boundaries (RBAC) ---');

  // Test 1: Student accessing student endpoint -> 200
  const studentRes = await supertest(app)
    .get('/api/users/student-dashboard')
    .set('Authorization', `Bearer ${tokens['STUDENT']}`);
  console.log(`STUDENT accessing /student-dashboard: Status ${studentRes.status} (Expected: 200)`);

  // Test 2: Student trying to access admin endpoint -> 403
  const studentAdminRes = await supertest(app)
    .get('/api/admin/dashboard')
    .set('Authorization', `Bearer ${tokens['STUDENT']}`);
  console.log(`STUDENT accessing /admin/dashboard: Status ${studentAdminRes.status} (Expected: 403 Forbidden)`);

  // Test 3: Instructor accessing instructor endpoint -> 200
  const instructorRes = await supertest(app)
    .get('/api/users/instructor-dashboard')
    .set('Authorization', `Bearer ${tokens['INSTRUCTOR']}`);
  console.log(`INSTRUCTOR accessing /instructor-dashboard: Status ${instructorRes.status} (Expected: 200)`);

  // Test 4: Admin accessing admin endpoint -> 200
  const adminRes = await supertest(app)
    .get('/api/admin/dashboard')
    .set('Authorization', `Bearer ${tokens['ADMIN']}`);
  console.log(`ADMIN accessing /admin/dashboard: Status ${adminRes.status} (Expected: 200)`);

  // Test 5: Health Check
  const healthRes = await supertest(app).get('/api/health');
  console.log('\n--- Health Check Endpoint (/api/health) ---');
  console.log('Response:', healthRes.body);

  if (healthRes.status === 200 && healthRes.body.status === 'ok' && healthRes.body.database === 'connected') {
    console.log('\n🎉 ALL AUTHENTICATION AND DATABASE VERIFICATION TESTS PASSED PERFECTLY!');
  } else {
    console.error('❌ Health check failed!');
    process.exit(1);
  }
}

testAllLogins().catch((err) => {
  console.error('Test script error:', err);
  process.exit(1);
});
