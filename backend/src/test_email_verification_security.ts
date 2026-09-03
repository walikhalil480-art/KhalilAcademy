import supertest from 'supertest';
import { app } from './app';
import { prisma } from './config/database';

const request = supertest(app);

async function runEmailVerificationSecurityTests() {
  console.log('===========================================================');
  console.log(' RUNNING EMAIL VERIFICATION & LOGIN SECURITY TEST SUITE    ');
  console.log('===========================================================\n');

  try {
    const timestamp = Date.now();
    const testEmail = `mohamed.ibrahim.${timestamp}@khalilacademy.org`;
    const testName = 'Mohamed Ibrahim';
    const testPassword = 'Password@12345';

    // 1. Test Registration with Fake Placeholder Names
    console.log('Test 1: Rejecting obvious placeholder names...');
    const fakeNameRes = await request.post('/api/auth/register').send({
      name: 'Test User',
      email: `valid.${timestamp}@khalilacademy.org`,
      password: testPassword,
    });
    console.log(`Fake name status: ${fakeNameRes.status} | message: ${fakeNameRes.body.message}`);
    if (fakeNameRes.status === 400 && fakeNameRes.body.message.includes('real legal/professional name')) {
      console.log('✓ PASS: Placeholder name correctly rejected.\n');
    } else {
      console.log('❌ FAIL: Failed to reject placeholder name.\n');
      process.exit(1);
    }

    // 2. Test Registration with Fake/Disposable Email Domains
    console.log('Test 2: Rejecting disposable/fake email domains...');
    const fakeEmailRes = await request.post('/api/auth/register').send({
      name: 'Ahmed Hassan',
      email: 'test@example.com',
      password: testPassword,
    });
    console.log(`Fake email status: ${fakeEmailRes.status} | message: ${fakeEmailRes.body.message}`);
    if (fakeEmailRes.status === 400 && fakeEmailRes.body.message.includes('real, accessible email address')) {
      console.log('✓ PASS: Fake email domain correctly rejected.\n');
    } else {
      console.log('❌ FAIL: Failed to reject fake email domain.\n');
      process.exit(1);
    }

    // 3. Test Valid User Registration
    console.log(`Test 3: Registering real user: ${testName} <${testEmail}>...`);
    const regRes = await request.post('/api/auth/register').send({
      name: testName,
      email: testEmail,
      password: testPassword,
      confirmPassword: testPassword,
    });
    console.log(`Registration status: ${regRes.status} | user id: ${regRes.body.user?.id}`);
    if (regRes.status === 201 && regRes.body.user?.emailVerified === false) {
      console.log('✓ PASS: Account created with emailVerified = false.\n');
    } else {
      console.log('❌ FAIL: Registration failed or marked user verified prematurely.\n');
      process.exit(1);
    }

    // 4. Test Login Blocking for Unverified User
    console.log('Test 4: Attempting login before email verification...');
    const unverifiedLoginRes = await request.post('/api/auth/login').send({
      email: testEmail,
      password: testPassword,
    });
    console.log(`Unverified login status: ${unverifiedLoginRes.status} | code: ${unverifiedLoginRes.body.code}`);
    if (unverifiedLoginRes.status === 403 && unverifiedLoginRes.body.code === 'EMAIL_NOT_VERIFIED') {
      console.log('✓ PASS: Login blocked with 403 Forbidden & EMAIL_NOT_VERIFIED.\n');
    } else {
      console.log('❌ FAIL: Unverified user was not blocked from logging in.\n');
      process.exit(1);
    }

    // 5. Test Resend Verification Email
    console.log('Test 5: Requesting resend of verification email...');
    const resendRes = await request.post('/api/auth/resend-verification').send({
      email: testEmail,
    });
    console.log(`Resend status: ${resendRes.status} | message: ${resendRes.body.message}`);
    if (resendRes.status === 200 && resendRes.body.success) {
      console.log('✓ PASS: Verification email resent successfully.\n');
    } else {
      console.log('❌ FAIL: Resend verification failed.\n');
      process.exit(1);
    }

    // 6. Fetch verification token from database and verify email
    console.log('Test 6: Verifying email with token...');
    const createdUser = await prisma.user.findUnique({ where: { email: testEmail } });
    if (!createdUser || !createdUser.verificationToken) {
      console.log('❌ FAIL: Verification token not found in database.\n');
      process.exit(1);
    }

    const verifyRes = await request.post(`/api/auth/verify-email?token=${createdUser.verificationToken}`);
    console.log(`Verify token status: ${verifyRes.status} | message: ${verifyRes.body.message}`);
    if (verifyRes.status === 200 && verifyRes.body.success) {
      console.log('✓ PASS: Email verified successfully.\n');
    } else {
      console.log('❌ FAIL: Token verification failed.\n');
      process.exit(1);
    }

    // 7. Test Login for Verified User
    console.log('Test 7: Attempting login after email verification...');
    const verifiedLoginRes = await request.post('/api/auth/login').send({
      email: testEmail,
      password: testPassword,
    });
    console.log(`Verified login status: ${verifiedLoginRes.status} | accessToken present: ${!!verifiedLoginRes.body.accessToken}`);
    if (verifiedLoginRes.status === 200 && verifiedLoginRes.body.accessToken && verifiedLoginRes.body.user?.emailVerified === true) {
      console.log('✓ PASS: Verified user logged in successfully and received JWT!\n');
    } else {
      console.log('❌ FAIL: Verified user failed to log in.\n');
      process.exit(1);
    }

    // 8. Test Invalid/Used Verification Token Handling
    console.log('Test 8: Testing re-use of expired/already verified token...');
    const reusedVerifyRes = await request.post(`/api/auth/verify-email?token=${createdUser.verificationToken}`);
    console.log(`Re-use status: ${reusedVerifyRes.status} | message: ${reusedVerifyRes.body.message}`);
    if (reusedVerifyRes.status === 400) {
      console.log('✓ PASS: Invalid/re-used token rejected cleanly with 400.\n');
    } else {
      console.log('❌ FAIL: Re-used token was not rejected.\n');
      process.exit(1);
    }

    // Clean up test user
    await prisma.refreshToken.deleteMany({ where: { userId: createdUser.id } });
    await prisma.user.delete({ where: { id: createdUser.id } });
    console.log('✓ Cleaned up test user records.\n');

    console.log('===========================================================');
    console.log(' 🎉 ALL 8 EMAIL VERIFICATION & AUTH SECURITY TESTS PASSED! ');
    console.log('===========================================================');

  } catch (error: any) {
    console.error('Test execution error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runEmailVerificationSecurityTests();
