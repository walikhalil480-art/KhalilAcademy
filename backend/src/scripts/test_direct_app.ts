import { app } from '../app';
import http from 'http';

const testServer = http.createServer(app);
testServer.listen(5099, async () => {
  console.log('Test server listening on port 5099');
  try {
    const axios = require('axios');
    const res = await axios.get('http://localhost:5099/api/courses');
    console.log('GET http://localhost:5099/api/courses SUCCESS:', res.status, 'Total courses:', res.data.courses.length);
    for (const c of res.data.courses) {
      console.log('  Course:', c.title, '| slug:', c.slug);
    }
    const loginRes = await axios.post('http://localhost:5099/api/auth/login', {
      email: 'admin@khalilacademy.com',
      password: 'Admin@12345',
    });
    console.log('POST http://localhost:5099/api/auth/login SUCCESS: User:', loginRes.data.user.name, 'Token:', !!loginRes.data.accessToken);
  } catch (err: any) {
    console.error('Test server error:', err.response?.status, err.response?.data || err.message);
  } finally {
    testServer.close();
  }
});
