import { loginUser } from '../services/auth.service';
import { prisma } from '../config/database';
import { hashPassword } from '../utils/hash';

async function testLogins() {
  const users = await prisma.user.findMany({ select: { id: true, email: true, name: true, role: true } });
  console.log('Testing login for users in database:');

  const candidatePasswords = ['Admin@123456', 'Password123!', 'Instructor@123456', 'Student@123456', 'admin123', 'khalil123', 'admin', '12345678', 'Wali@123456', 'Yahya@123456'];

  for (const u of users) {
    console.log(`\nUser: ${u.name} (${u.email}) [${u.role}]`);
    let found = false;
    for (const pwd of candidatePasswords) {
      try {
        const res = await loginUser({ email: u.email, password: pwd });
        console.log(`  ✓ Password matched: "${pwd}"`);
        found = true;
        break;
      } catch (e: any) {
        // failed
      }
    }
    if (!found) {
      console.log(`  ✗ None of candidate passwords matched for ${u.email}`);
    }
  }
}

testLogins().catch(console.error);
