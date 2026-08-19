import axios from 'axios';

async function testStudentDashboard() {
  const baseURL = 'http://localhost:5001/api';
  console.log('Logging in as student (tcusub777@gmail.com)...');
  const loginRes = await axios.post(`${baseURL}/auth/login`, {
    email: 'tcusub777@gmail.com',
    password: 'Password123!',
  });
  const token = loginRes.data.accessToken;
  console.log('Login successful! AccessToken:', token ? 'YES' : 'NO');

  const headers = { Authorization: `Bearer ${token}` };

  console.log('\nFetching /api/progress/my-learning...');
  const learnRes = await axios.get(`${baseURL}/progress/my-learning`, { headers });
  console.log('My Learning Status:', learnRes.status, 'Courses:', learnRes.data.courses?.length);
  for (const c of learnRes.data.courses || []) {
    console.log(`  - "${c.title}" (${c.slug}) -> Progress: ${c.progressPercent}%, Status: ${c.status}`);
  }

  console.log('\nFetching /api/certificates/my-certificates...');
  const certRes = await axios.get(`${baseURL}/certificates/my-certificates`, { headers });
  console.log('My Certificates Status:', certRes.status, 'Certificates:', certRes.data.certificates?.length);
  for (const cert of certRes.data.certificates || []) {
    console.log(`  - Cert #${cert.certificateNumber}: "${cert.courseTitle}" (Issued: ${cert.issueDate})`);
  }

  console.log('\nFetching /api/courses (Public Catalog)...');
  const catalogRes = await axios.get(`${baseURL}/courses`);
  console.log('Catalog Status:', catalogRes.status, 'Total Courses:', catalogRes.data.courses?.length);
  for (const c of catalogRes.data.courses || []) {
    console.log(`  - "${c.title}" (${c.slug}) | Level: ${c.level} | Enrolled: ${c.studentCount}`);
  }
}

testStudentDashboard().catch(console.error);
