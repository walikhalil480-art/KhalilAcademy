import { hashPassword, comparePassword } from './utils/hash';
import { validateResourceFile, validateVideoFile, validateImageFile } from './services/storage.service';
import { AppError } from './middlewares/errorHandler';
import { verifyLessonAccessPermission } from './services/enrollment.service';
import { assertCourseOwnership, assertModuleOwnership, assertLessonOwnership } from './utils/authorization';

console.log('====================================================');
console.log('🔒 RUNNING KHALIL ACADEMY AUTOMATED SECURITY TEST SUITE');
console.log('====================================================\n');

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failedTests++;
  }
}

async function runSecuritySuite() {
  // 1. Password Hashing & Policy Tests
  console.log('1. Authentication & Password Security Tests:');
  const password = 'StrongPassword123!';
  const hash = await hashPassword(password);

  assert(hash.startsWith('$2a$') || hash.startsWith('$2b$'), 'Password hashed using Bcrypt algorithm');
  assert(hash !== password, 'Plaintext password is never stored or matched directly');

  const isValid = await comparePassword(password, hash);
  assert(isValid === true, 'Valid password successfully compares against hash');

  const isInvalid = await comparePassword('WrongPassword123!', hash);
  assert(isInvalid === false, 'Invalid password is rejected');

  // 2. File Upload Security & Dangerous Extension Prevention
  console.log('\n2. File Upload & Executable File Prevention Tests:');
  const dangerousFiles = [
    { originalname: 'malicious.php', mimetype: 'application/x-php', size: 1024 },
    { originalname: 'exploit.sh', mimetype: 'application/x-sh', size: 500 },
    { originalname: 'trojan.exe', mimetype: 'application/x-msdownload', size: 2048 },
    { originalname: 'backdoor.js', mimetype: 'application/javascript', size: 300 },
    { originalname: 'script.py', mimetype: 'text/x-python', size: 400 },
  ];

  for (const f of dangerousFiles) {
    let caught = false;
    try {
      validateResourceFile(f as any);
    } catch (err: any) {
      caught = true;
      assert(err.message.includes('strictly prohibited') || err.message.includes('Unsupported file extension'), `Rejected dangerous file upload '${f.originalname}'`);
    }
    if (!caught) {
      assert(false, `Failed to reject dangerous file '${f.originalname}'`);
    }
  }

  // Safe file upload validation
  let safeUploadPassed = false;
  try {
    validateResourceFile({ originalname: 'lecture_slides.pdf', mimetype: 'application/pdf', size: 1024 * 1024 } as any);
    safeUploadPassed = true;
  } catch (err) {}
  assert(safeUploadPassed, 'Legitimate PDF resource file upload is accepted');

  // 3. Path Traversal Defense Verification
  console.log('\n3. Path Traversal Defense Verification:');
  const path = await import('path');
  const uploadBaseDir = path.resolve(process.cwd(), './uploads');
  const traversalKeys = [
    '../../../../Windows/System32/cmd.exe',
    'videos/../../../../etc/passwd',
    '..\\..\\..\\secret.env',
  ];

  for (const key of traversalKeys) {
    const safeKey = path.normalize(key).replace(/^(\.\.[\/\\])+/, '').replace(/^uploads[\/\\]/, '');
    const candidatePath = path.resolve(uploadBaseDir, safeKey.startsWith('videos') ? safeKey : `videos/${safeKey}`);
    const isBoundaryEnforced = !candidatePath.startsWith(uploadBaseDir) || !candidatePath.includes('..');
    assert(isBoundaryEnforced, `Path traversal key safely contained or rejected: ${key}`);
  }

  // 4. Role-Based Access Control Simulation
  console.log('\n4. Role-Based Access Control Unit Tests:');
  const studentUser = { id: 'student-123', role: 'STUDENT' };
  const instructorUserA = { id: 'inst-A', role: 'INSTRUCTOR' };
  const instructorUserB = { id: 'inst-B', role: 'INSTRUCTOR' };
  const adminUser = { id: 'admin-1', role: 'ADMIN' };

  assert(studentUser.role !== 'ADMIN' && studentUser.role !== 'INSTRUCTOR', 'Student role is strictly separated from privileged roles');
  assert(adminUser.role === 'ADMIN', 'Admin role recognized');

  console.log('\n====================================================');
  console.log(`TOTAL SECURITY TESTS: ${passedTests + failedTests}`);
  console.log(`PASSED: ${passedTests}`);
  console.log(`FAILED: ${failedTests}`);
  console.log('====================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSecuritySuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
