import { prisma } from '../config/database';
import { comparePassword, hashPassword } from '../utils/hash';

async function main() {
  console.log('--- Checking and Unlocking All Users ---');
  const users = await prisma.user.findMany();
  for (const u of users) {
    console.log(`User: ${u.email} | Name: ${u.name} | Role: ${u.role} | Verified: ${u.emailVerified} | FailedAttempts: ${u.failedLoginAttempts} | LockUntil: ${u.lockUntil}`);
    // Unlock and reset failed attempts
    await prisma.user.update({
      where: { id: u.id },
      data: {
        failedLoginAttempts: 0,
        lockUntil: null,
        emailVerified: true,
      },
    });
  }
  console.log('All user accounts unlocked and verified!');
}

main().catch(console.error);
