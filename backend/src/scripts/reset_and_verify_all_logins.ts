import { prisma } from '../config/database';
import { hashPassword } from '../utils/hash';
import axios from 'axios';

async function main() {
  console.log('--- Setting and Verifying Passwords for All Users ---');

  const defaultPassword = 'Password123!';
  const hashedPassword = await hashPassword(defaultPassword);

  const users = await prisma.user.findMany();
  for (const u of users) {
    await prisma.user.update({
      where: { id: u.id },
      data: {
        passwordHash: hashedPassword,
        failedLoginAttempts: 0,
        lockUntil: null,
        emailVerified: true,
        status: 'ACTIVE',
      },
    });
    console.log(`✓ User ${u.name} (${u.email}) [${u.role}]: Password set to "${defaultPassword}" and account unlocked & verified.`);
  }

  console.log('\n--- Testing HTTP Login via Port 5000 ---');
  for (const u of users) {
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', {
        email: u.email,
        password: defaultPassword,
      });
      console.log(`  ✓ LOGIN SUCCESS for ${u.email}: Status = ${res.status}, User = ${res.data.user.name}, Token = ${!!res.data.accessToken}`);
    } catch (e: any) {
      console.error(`  ✗ LOGIN FAILED for ${u.email}:`, e.response?.status, e.response?.data || e.message);
    }
  }

  console.log('\n--- Testing HTTP GET /api/courses ---');
  try {
    const res = await axios.get('http://localhost:5000/api/courses');
    console.log(`  ✓ GET /api/courses SUCCESS: Status = ${res.status}, Total Courses = ${res.data.courses.length}`);
    for (const c of res.data.courses) {
      console.log(`    - "${c.title}" (slug: ${c.slug}, duration: ${c.durationHours}h, modules: ${c.moduleCount})`);
    }
  } catch (e: any) {
    console.error('  ✗ GET /api/courses FAILED:', e.response?.status, e.response?.data || e.message);
  }
}

main().catch(console.error);
