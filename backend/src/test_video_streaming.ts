import supertest from 'supertest';
import fs from 'fs';
import path from 'path';
import { app } from './app';

const request = supertest(app);

async function runVideoStreamingTests() {
  console.log('====================================================');
  console.log(' RUNNING VIDEO UPLOAD & STREAMING VERIFICATION TESTS ');
  console.log('====================================================\n');

  try {
    // 1. Create a dummy test video file buffer (simulating an MP4 container)
    const testVideoDir = path.resolve(__dirname, '../uploads/videos');
    if (!fs.existsSync(testVideoDir)) {
      fs.mkdirSync(testVideoDir, { recursive: true });
    }
    const testFileName = `test_sample_${Date.now()}.mp4`;
    const testFilePath = path.join(testVideoDir, testFileName);

    // Create 100KB dummy video data
    const dummyBuffer = Buffer.alloc(100 * 1024, 'a');
    fs.writeFileSync(testFilePath, dummyBuffer);
    console.log(`✓ Created test video file: ${testFilePath} (${dummyBuffer.length} bytes)`);

    // 2. Test Direct Static HTTP Access with Range Header
    const staticPath = `/uploads/videos/${testFileName}`;
    console.log(`\nTesting Direct Static Access: GET ${staticPath}`);

    const staticRes = await request
      .get(staticPath)
      .set('Range', 'bytes=0-1023');

    console.log(`Static Response Status: ${staticRes.status}`);
    console.log(`Headers: Content-Type=${staticRes.headers['content-type']}, Accept-Ranges=${staticRes.headers['accept-ranges']}, Content-Range=${staticRes.headers['content-range']}`);

    if (staticRes.status === 206 && staticRes.headers['content-range'] && staticRes.headers['accept-ranges'] === 'bytes') {
      console.log('✓ PASS: Static video file served with HTTP 206 Partial Content and byte ranges!');
    } else {
      console.log(`❌ FAIL: Unexpected static status ${staticRes.status}`);
      process.exit(1);
    }

    // 3. Test Dedicated Stream Endpoint: GET /api/stream/videos/*
    const streamPath = `/api/stream/videos/${testFileName}`;
    console.log(`\nTesting Dedicated Stream Endpoint: GET ${streamPath}`);

    const streamRes = await request
      .get(streamPath)
      .set('Range', 'bytes=0-1023');

    console.log(`Stream Response Status: ${streamRes.status}`);
    console.log(`Stream Headers: Content-Type=${streamRes.headers['content-type']}, Accept-Ranges=${streamRes.headers['accept-ranges']}, Content-Range=${streamRes.headers['content-range']}, Content-Length=${streamRes.headers['content-length']}`);

    if (streamRes.status === 206 && streamRes.headers['content-range'] && streamRes.headers['accept-ranges'] === 'bytes') {
      console.log('✓ PASS: Dedicated stream endpoint returned HTTP 206 Partial Content with correct byte ranges!');
    } else {
      console.log(`❌ FAIL: Stream endpoint failed status check (${streamRes.status})`);
      process.exit(1);
    }

    // 4. Test 404 Error Handling for non-existent video
    const notFoundPath = `/api/stream/videos/non_existent_file_${Date.now()}.mp4`;
    console.log(`\nTesting Non-Existent Video File: GET ${notFoundPath}`);
    const notFoundRes = await request.get(notFoundPath);
    console.log(`404 Response Status: ${notFoundRes.status}`);

    if (notFoundRes.status === 404) {
      console.log('✓ PASS: Non-existent video returns 404 Not Found cleanly!');
    } else {
      console.log(`❌ FAIL: Expected 404 status but received ${notFoundRes.status}`);
      process.exit(1);
    }

    // Clean up test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
      console.log(`\n✓ Cleaned up test file.`);
    }

    console.log('\n====================================================');
    console.log(' 🎉 ALL VIDEO STREAMING & PLAYBACK TESTS PASSED!');
    console.log('====================================================');

  } catch (error: any) {
    console.error('Test execution error:', error.message);
    process.exit(1);
  }
}

runVideoStreamingTests();
