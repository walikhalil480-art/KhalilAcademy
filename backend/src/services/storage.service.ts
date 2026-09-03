import fs from 'fs';
import path from 'path';
import { env } from '../config/env';
import { AppError } from '../middlewares/errorHandler';

const uploadBaseDir = path.resolve(process.cwd(), env.UPLOAD_DIR || './uploads');

if (!fs.existsSync(uploadBaseDir)) {
  fs.mkdirSync(uploadBaseDir, { recursive: true });
}

export interface FileUploadResult {
  url: string;
  storageKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export const saveUploadedFile = async (
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string,
  subFolder = 'general'
): Promise<FileUploadResult> => {
  const folderPath = path.join(uploadBaseDir, subFolder);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  const ext = path.extname(originalName).toLowerCase();
  const uniqueName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
  const filePath = path.join(folderPath, uniqueName);

  await fs.promises.writeFile(filePath, fileBuffer);

  const storageKey = `${subFolder}/${uniqueName}`;
  const url = `/uploads/${storageKey}`;

  return {
    url,
    storageKey,
    fileName: originalName,
    fileSize: fileBuffer.length,
    mimeType,
  };
};

export const validateVideoFile = (file: { mimetype: string; size: number; originalname: string }) => {
  const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
  if (!allowedTypes.includes(file.mimetype.toLowerCase())) {
    throw new AppError(`Invalid video file type '${file.mimetype}'. Supported formats: MP4, WebM, QuickTime.`, 400);
  }
  const maxSizeBytes = 200 * 1024 * 1024; // 200 MB max for video
  if (file.size > maxSizeBytes) {
    throw new AppError('Video file exceeds maximum allowed size of 200 MB.', 400);
  }
};

export const validateImageFile = (file: { mimetype: string; size: number }) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.mimetype.toLowerCase())) {
    throw new AppError(`Invalid image type '${file.mimetype}'. Allowed formats: JPG, PNG, WebP.`, 400);
  }
  const maxSizeBytes = 10 * 1024 * 1024; // 10 MB max for thumbnail
  if (file.size > maxSizeBytes) {
    throw new AppError('Image file exceeds maximum allowed size of 10 MB.', 400);
  }
};

const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.bash', '.php', '.phtml', '.php3', '.php4', '.php5',
  '.pl', '.py', '.rb', '.cgi', '.jsp', '.asp', '.aspx', '.js', '.mjs', '.ts',
  '.html', '.htm', '.xhtml', '.vbs', '.ps1', '.jar', '.dll', '.so', '.dylib', '.com', '.scr'
];

export const validateResourceFile = (file: { mimetype: string; size: number; originalname: string }) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (DANGEROUS_EXTENSIONS.includes(ext)) {
    throw new AppError(`Executable or script file extension '${ext}' is strictly prohibited for upload security.`, 400);
  }

  const allowedExtensions = [
    '.pdf', '.zip', '.tar', '.gz', '.7z', '.rar',
    '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.txt', '.csv', '.md', '.json', '.mp4', '.webm', '.png', '.jpg', '.jpeg'
  ];

  if (!allowedExtensions.includes(ext)) {
    throw new AppError(`Unsupported file extension '${ext}'. Allowed formats include PDF, DOCX, XLSX, PPTX, TXT, CSV, ZIP, MP4, and standard media.`, 400);
  }

  const maxSizeBytes = 30 * 1024 * 1024; // 30 MB max
  if (file.size > maxSizeBytes) {
    throw new AppError('Resource file exceeds maximum allowed size of 30 MB.', 400);
  }
};
