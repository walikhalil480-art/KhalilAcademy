import fs from 'fs';
import path from 'path';

/**
 * Parses EBML (Matroska / WebM / MKV) video duration.
 */
export function extractEbmlDuration(buffer: Buffer): number | null {
  try {
    // Check EBML Header magic 0x1A 0x45 0xDF 0xA3
    if (buffer.length < 4 || buffer[0] !== 0x1a || buffer[1] !== 0x45 || buffer[2] !== 0xdf || buffer[3] !== 0xa3) {
      return null;
    }

    let timecodeScale = 1000000; // default 1ms in nanoseconds
    let durationValue: number | null = null;

    // Search for TimecodeScale ID: 0x2A 0xD7 0xB1
    const timecodeScalePos = buffer.indexOf(Buffer.from([0x2a, 0xd7, 0xb1]));
    if (timecodeScalePos !== -1 && timecodeScalePos + 3 < buffer.length) {
      // EBML varint length
      const lengthByte = buffer[timecodeScalePos + 3];
      if (lengthByte === 0x81 && timecodeScalePos + 4 < buffer.length) {
        timecodeScale = buffer.readUInt8(timecodeScalePos + 4);
      } else if (lengthByte === 0x82 && timecodeScalePos + 5 < buffer.length) {
        timecodeScale = buffer.readUInt16BE(timecodeScalePos + 4);
      } else if (lengthByte === 0x84 && timecodeScalePos + 7 < buffer.length) {
        timecodeScale = buffer.readUInt32BE(timecodeScalePos + 4);
      }
    }

    // Search for Duration ID: 0x44 0x89
    const durationPos = buffer.indexOf(Buffer.from([0x44, 0x89]));
    if (durationPos !== -1 && durationPos + 2 < buffer.length) {
      const lengthByte = buffer[durationPos + 2];
      if (lengthByte === 0x84 && durationPos + 6 < buffer.length) {
        // 4-byte float (IEEE 754)
        durationValue = buffer.readFloatBE(durationPos + 3);
      } else if (lengthByte === 0x88 && durationPos + 10 < buffer.length) {
        // 8-byte double (IEEE 754)
        durationValue = buffer.readDoubleBE(durationPos + 3);
      }
    }

    if (durationValue !== null && durationValue > 0) {
      // Duration in nanoseconds = durationValue * timecodeScale
      // Duration in seconds = (durationValue * timecodeScale) / 1,000,000,000
      const durationSeconds = (durationValue * timecodeScale) / 1000000000;
      return Math.round(durationSeconds * 100) / 100;
    }
  } catch (err) {
    console.error('Error extracting EBML duration:', err);
  }
  return null;
}

const file = 'uploads/videos/1787077683973_hofwuh.mp4';
const buf = fs.readFileSync(file);
const dur = extractEbmlDuration(buf);
console.log(`Extracted Duration for ${file}: ${dur} seconds (${(dur ? dur / 60 : 0).toFixed(2)} min)`);
