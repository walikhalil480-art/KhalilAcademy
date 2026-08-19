import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env';

export const streamVideo = (req: Request, res: Response) => {
  try {
    const rawKey = req.params[0] || (req.query.key as string);
    if (!rawKey) {
      return res.status(400).json({ error: 'Video storage key required.' });
    }

    // Normalize and strictly enforce upload directory boundary against path traversal
    const uploadBaseDir = path.resolve(process.cwd(), env.UPLOAD_DIR || './uploads');
    const safeKey = path.normalize(rawKey).replace(/^(\.\.[\/\\])+/, '').replace(/^uploads[\/\\]/, '');
    const filePath = path.resolve(uploadBaseDir, safeKey.startsWith('videos') ? safeKey : `videos/${safeKey}`);

    if (!filePath.startsWith(uploadBaseDir)) {
      return res.status(403).json({ error: 'Access denied: Invalid file path traversal.' });
    }

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return res.status(404).json({ error: 'Video file not found on server.' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    const ext = path.extname(filePath).toLowerCase();
    let contentType = 'video/mp4';
    if (ext === '.webm') contentType = 'video/webm';
    if (ext === '.ogg') contentType = 'video/ogg';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (isNaN(start) || start >= fileSize || (parts[1] && end >= fileSize)) {
        res.setHeader('Content-Range', `bytes */${fileSize}`);
        return res.status(416).json({ error: 'Requested range not satisfiable' });
      }

      const chunksize = end - start + 1;
      const file = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Content-Length': chunksize,
        'Content-Type': contentType,
      });

      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
      });

      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error: any) {
    return res.status(500).json({ error: 'Server error streaming video file.' });
  }
};
