import fs from 'fs';
import path from 'path';

/**
 * Robust video duration extractor supporting both ISO BMFF (MP4, M4V, MOV)
 * and EBML (Matroska MKV, WebM) video containers without external dependencies.
 */

/**
 * Extracts exact duration in seconds from any uploaded video file.
 * Returns null if duration cannot be extracted.
 */
export function extractVideoDurationSeconds(filePath: string): number | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const stat = fs.statSync(filePath);
    if (stat.size < 8) return null;

    // Read first 2MB or full file to detect container
    const sampleSize = Math.min(stat.size, 2 * 1024 * 1024);
    const sampleBuf = Buffer.alloc(sampleSize);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, sampleBuf, 0, sampleSize, 0);
    fs.closeSync(fd);

    // 1. Check for EBML / Matroska / WebM header (0x1A 0x45 0xDF 0xA3)
    if (sampleBuf[0] === 0x1a && sampleBuf[1] === 0x45 && sampleBuf[2] === 0xdf && sampleBuf[3] === 0xa3) {
      const ebmlDur = extractEbmlDuration(sampleBuf);
      if (ebmlDur !== null && ebmlDur > 0) {
        return ebmlDur;
      }

      // If duration element wasn't in the first 2MB, read full file (or up to 10MB)
      if (stat.size > sampleSize) {
        const fullBuf = fs.readFileSync(filePath);
        return extractEbmlDuration(fullBuf);
      }
    }

    // 2. Check for ISO Base Media File Format (MP4 / MOV / M4V)
    const mp4Dur = extractMp4Duration(filePath);
    if (mp4Dur !== null && mp4Dur > 0) {
      return mp4Dur;
    }
  } catch (error) {
    console.error(`[extractVideoDurationSeconds] Error reading ${filePath}:`, error);
  }

  return null;
}

/**
 * Extracts duration in whole minutes (rounded to nearest minute, minimum 1 if > 0).
 */
export function extractVideoDurationMinutes(filePath: string): number | null {
  const seconds = extractVideoDurationSeconds(filePath);
  if (seconds === null || seconds <= 0) return null;
  return Math.max(1, Math.round(seconds / 60));
}

/**
 * Parses EBML (Matroska / WebM / MKV) video duration.
 */
function extractEbmlDuration(buffer: Buffer): number | null {
  try {
    if (buffer.length < 4 || buffer[0] !== 0x1a || buffer[1] !== 0x45 || buffer[2] !== 0xdf || buffer[3] !== 0xa3) {
      return null;
    }

    let timecodeScale = 1000000; // default 1ms in nanoseconds
    let durationValue: number | null = null;

    // Search for TimecodeScale ID: 0x2A 0xD7 0xB1
    const timecodeScalePos = buffer.indexOf(Buffer.from([0x2a, 0xd7, 0xb1]));
    if (timecodeScalePos !== -1 && timecodeScalePos + 3 < buffer.length) {
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
      const durationSeconds = (durationValue * timecodeScale) / 1000000000;
      return Math.round(durationSeconds * 100) / 100;
    }
  } catch (err) {
    console.error('[extractEbmlDuration] Error parsing EBML:', err);
  }
  return null;
}

/**
 * ISO BMFF / MP4 Box Parser
 */
function extractMp4Duration(filePath: string): number | null {
  let fd: number | null = null;
  try {
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    if (fileSize < 8) return null;

    fd = fs.openSync(filePath, 'r');
    let offset = 0;
    const headerBuf = Buffer.alloc(16);

    while (offset < fileSize - 8) {
      const bytesRead = fs.readSync(fd, headerBuf, 0, 16, offset);
      if (bytesRead < 8) break;

      let boxSize = headerBuf.readUInt32BE(0);
      const boxType = headerBuf.toString('ascii', 4, 8);

      let headerSize = 8;
      if (boxSize === 1) {
        boxSize = Number(headerBuf.readBigUInt64BE(8));
        headerSize = 16;
      } else if (boxSize === 0) {
        boxSize = fileSize - offset;
      }

      if (boxSize < 8) break;

      if (boxType === 'moov') {
        const moovEnd = Math.min(offset + boxSize, fileSize);
        let moovOffset = offset + headerSize;

        while (moovOffset < moovEnd - 8) {
          const subRead = fs.readSync(fd, headerBuf, 0, 8, moovOffset);
          if (subRead < 8) break;

          let subSize = headerBuf.readUInt32BE(0);
          const subType = headerBuf.toString('ascii', 4, 8);

          if (subSize < 8) break;

          if (subType === 'mvhd') {
            const mvhdDataSize = Math.min(subSize, 128);
            const mvhdBuf = Buffer.alloc(mvhdDataSize);
            fs.readSync(fd, mvhdBuf, 0, mvhdDataSize, moovOffset);

            const version = mvhdBuf.readUInt8(8);
            let timeScale = 0;
            let durationUnits = 0;

            if (version === 0 && mvhdDataSize >= 28) {
              timeScale = mvhdBuf.readUInt32BE(20);
              durationUnits = mvhdBuf.readUInt32BE(24);
            } else if (version === 1 && mvhdDataSize >= 40) {
              timeScale = mvhdBuf.readUInt32BE(28);
              durationUnits = Number(mvhdBuf.readBigUInt64BE(32));
            }

            if (timeScale > 0 && durationUnits > 0) {
              const seconds = durationUnits / timeScale;
              return Math.round(seconds * 100) / 100;
            }
          }

          moovOffset += subSize;
        }
      }

      offset += boxSize;
    }

    return null;
  } catch (error) {
    return null;
  } finally {
    if (fd !== null) {
      try {
        fs.closeSync(fd);
      } catch (e) {}
    }
  }
}
