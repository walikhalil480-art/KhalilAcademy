import axios from 'axios';
import { prisma } from '../config/database';
import bcrypt from 'bcryptjs';

async function testPaystackWithNewStudent() {
  const baseURL = 'http://localhost:5001/api';

  // 1. Create a test student who is NOT enrolled
  const email = `student_${Date.now()}@khalilacademy.com`;
  const password = 'Password123!';
  const passwordHash = await bcrypt.hash(password, 10);

  const student = await prisma.user.create({
    data: {
      name: 'Paystack Test Student',
      email,
      passwordHash,
      role: 'STUDENT',
      status: 'ACTIVE',
      emailVerified: true,
    },
  });

  console.log(`Created new test student: ${student.email}`);

  // 2. Login
  const loginRes = await axios.post(`${baseURL}/auth/login`, { email, password });
  const token = loginRes.data.accessToken;
  const headers = { Authorization: `Bearer ${token}` };

  // 3. Find paid course
  const coursesRes = await axios.get(`${baseURL}/courses`);
  const course = coursesRes.data.courses.find((c: any) => c.price > 0);

  console.log(`Enrolling in paid course: "${course.title}" (${course.currency} ${course.price})...`);

  // 4. Initialize Paystack payment
  const initRes = await axios.post(
    `${baseURL}/payments/initialize`,
    { courseId: course.id },
    { headers }
  );

  console.log('\n--- PAYSTACK CHECKOUT GENERATION RESULT ---');
  console.log('HTTP Status:        ', initRes.status);
  console.log('Success:            ', initRes.data.success);
  console.log('Authorization URL:  ', initRes.data.authorization_url);
  console.log('Access Code:        ', initRes.data.access_code);
  console.log('Transaction Ref:    ', initRes.data.reference);
  console.log('Order Number:       ', initRes.data.orderNumber);
  console.log('Amount (KES):       ', initRes.data.amount);
}

testPaystackWithNewStudent().catch(console.error);
