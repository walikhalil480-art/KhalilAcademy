import axios from 'axios';

async function testApi() {
  const baseURL = 'http://localhost:5000/api';
  console.log('Testing GET /api/courses...');
  try {
    const res = await axios.get(`${baseURL}/courses`);
    console.log('GET /courses SUCCESS: status =', res.status, 'total courses =', res.data?.courses?.length);
    for (const c of res.data.courses) {
      console.log(`  - "${c.title}" (${c.slug})`);
    }
  } catch (err: any) {
    console.error('GET /courses FAILED:', err.response?.status, err.response?.data || err.message);
  }

  console.log('\nTesting POST /api/auth/login with admin@khalilacademy.com...');
  try {
    const res = await axios.post(`${baseURL}/auth/login`, {
      email: 'admin@khalilacademy.com',
      password: 'Admin@12345',
    });
    console.log('LOGIN SUCCESS:', res.status, 'User:', res.data.user.name, 'Role:', res.data.user.role);
  } catch (err: any) {
    console.error('LOGIN FAILED:', err.response?.status, err.response?.data || err.message);
  }

  console.log('\nTesting POST /api/auth/login with tcusub777@gmail.com...');
  try {
    const res = await axios.post(`${baseURL}/auth/login`, {
      email: 'tcusub777@gmail.com',
      password: 'Student@12345',
    });
    console.log('LOGIN SUCCESS:', res.status, 'User:', res.data.user.name, 'Role:', res.data.user.role);
  } catch (err: any) {
    console.error('LOGIN FAILED for tcusub777:', err.response?.status, err.response?.data || err.message);
  }
}

testApi().catch(console.error);
