import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { saveUploadedFile, validateVideoFile, validateImageFile, validateResourceFile } from '../services/storage.service';
import { extractVideoDurationSeconds, extractVideoDurationMinutes } from '../utils/videoDuration';
import { AppError } from '../middlewares/errorHandler';
import path from 'path';

export const uploadVideo = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new AppError('No video file provided for upload.', 400);
    }

    validateVideoFile({
      mimetype: req.file.mimetype,
      size: req.file.size,
      originalname: req.file.originalname,
    });

    const result = await saveUploadedFile(req.file.buffer, req.file.originalname, req.file.mimetype, 'videos');

    // Extract exact duration from the saved video file
    const absoluteVideoPath = path.resolve(process.cwd(), result.storageKey);
    const durationSeconds = extractVideoDurationSeconds(absoluteVideoPath);
    const durationMinutes = durationSeconds ? Math.max(1, Math.round(durationSeconds / 60)) : null;

    res.json({
      success: true,
      message: 'Video uploaded successfully.',
      file: {
        videoSource: 'UPLOAD',
        videoUrl: result.url,
        storageKey: result.storageKey,
        fileName: result.fileName,
        fileSize: result.fileSize,
        mimeType: result.mimeType,
        durationSeconds: durationSeconds || null,
        durationMinutes: durationMinutes || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const uploadThumbnail = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new AppError('No image file provided for thumbnail upload.', 400);
    }

    validateImageFile({
      mimetype: req.file.mimetype,
      size: req.file.size,
    });

    const result = await saveUploadedFile(req.file.buffer, req.file.originalname, req.file.mimetype, 'thumbnails');

    res.json({
      success: true,
      message: 'Thumbnail uploaded successfully.',
      file: {
        url: result.url,
        storageKey: result.storageKey,
        fileName: result.fileName,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const uploadResource = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new AppError('No resource file provided for upload.', 400);
    }

    validateResourceFile({
      mimetype: req.file.mimetype,
      size: req.file.size,
      originalname: req.file.originalname,
    });

    const result = await saveUploadedFile(req.file.buffer, req.file.originalname, req.file.mimetype, 'resources');

    res.json({
      success: true,
      message: 'Resource uploaded successfully.',
      resource: {
        title: req.body.title || req.file.originalname,
        fileUrl: result.url,
        storageKey: result.storageKey,
        fileName: result.fileName,
        fileSize: result.fileSize,
        mimeType: result.mimeType,
      },
    });
  } catch (error) {
    next(error);
  }
};
