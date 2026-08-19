import axios from 'axios';

async function testLandingApi() {
  const baseURL = 'http://localhost:5001/api';
  console.log('--- Testing Public Landing APIs on Port 5001 ---');
  try {
    const [cRes, catRes, sRes] = await Promise.all([
      axios.get(`${baseURL}/courses?limit=7`),
      axios.get(`${baseURL}/categories`),
      axios.get(`${baseURL}/stats/public`),
    ]);
    console.log('1. /api/courses Status:', cRes.status, 'Total returned:', cRes.data.courses.length);
    for (const c of cRes.data.courses) {
      console.log(`   - "${c.title}" (${c.slug})`);
    }

    console.log('2. /api/categories Status:', catRes.status, 'Total categories:', catRes.data.categories.length);

    console.log('3. /api/stats/public Status:', sRes.status, 'Stats:', sRes.data.stats);
  } catch (err: any) {
    console.error('API Test Error:', err.response?.status, err.response?.data || err.message);
  }
}

testLandingApi().catch(console.error);
