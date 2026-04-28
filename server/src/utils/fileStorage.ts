import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Base directory for file uploads.
 * Resolves to <project_root>/uploads regardless of the current working directory.
 */
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

/**
 * Ensures the uploads directory exists on disk.
 * Called once at module load time and can be called again if needed.
 */
// PUBLIC_INTERFACE
export function ensureUploadsDir(): string {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  return UPLOADS_DIR;
}

// Create the directory immediately when this module is first imported
ensureUploadsDir();

/**
 * Multer disk storage configuration.
 * Files are stored in the uploads/ directory with a unique name
 * composed of the record ID prefix (set via req body or generated)
 * and the original file name.
 *
 * The filename callback uses a timestamp + random suffix to avoid
 * collisions when the record ID is not yet available at storage time.
 */
// PUBLIC_INTERFACE
export const diskStorage = multer.diskStorage({
  destination(_req: any, _file: any, cb: any) {
    // Ensure directory exists before each write (safe for concurrent use)
    ensureUploadsDir();
    cb(null, UPLOADS_DIR);
  },
  filename(_req: any, file: any, cb: any) {
    // Generate a unique filename: timestamp-random-originalname
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${uniqueSuffix}-${safeName}`);
  },
});

/**
 * Returns the absolute path for a given filename in the uploads directory.
 * @param filename - The name of the file stored in uploads/
 * @returns Absolute filesystem path to the file
 */
// PUBLIC_INTERFACE
export function getUploadPath(filename: string): string {
  return path.join(UPLOADS_DIR, filename);
}

/**
 * Returns the public-facing relative URL for a stored upload.
 * The URL assumes the uploads directory is served at /uploads by Express.
 * @param filename - The stored filename
 * @returns Relative URL path (e.g., "uploads/1234-receipt.png")
 */
// PUBLIC_INTERFACE
export function getUploadUrl(filename: string): string {
  return `uploads/${filename}`;
}

const CONTABO_FOLDER = 'ISMSalarySystem';
let s3Client: S3Client | null = null;

type StoredEmployeePhoto = {
  key: string;
  url: string;
};

function getS3Client(): S3Client {
  if (s3Client) {
    return s3Client;
  }

  const endpoint = process.env.CONTABO_S3_ENDPOINT;
  const region = process.env.CONTABO_S3_REGION || 'default';
  const accessKeyId = process.env.CONTABO_S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CONTABO_S3_SECRET_ACCESS_KEY;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error('Contabo S3 storage is not configured');
  }

  s3Client = new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: process.env.CONTABO_S3_FORCE_PATH_STYLE !== 'false',
  });

  return s3Client;
}

function getBucketName(): string {
  const bucket = process.env.CONTABO_S3_BUCKET;
  if (!bucket) {
    throw new Error('CONTABO_S3_BUCKET is not configured');
  }
  return bucket;
}

function sanitizeFilePart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'employee';
}

function getExtension(file: Express.Multer.File): string {
  const originalExt = path.extname(file.originalname || '').toLowerCase();
  if (originalExt && /^[.][a-z0-9]+$/.test(originalExt)) {
    return originalExt;
  }

  const fromMime = file.mimetype.split('/')[1];
  return fromMime ? `.${fromMime.replace(/[^a-z0-9]/gi, '').toLowerCase()}` : '.jpg';
}

export function buildEmployeePhotoKey(fullName: string, phone: string | null | undefined, file: Express.Multer.File): string {
  const namePart = sanitizeFilePart(fullName);
  const phonePart = sanitizeFilePart(phone || 'no-phone');
  const suffix = `${Date.now()}`;
  return `${CONTABO_FOLDER}/${namePart}-${phonePart}-${suffix}${getExtension(file)}`;
}

export function getEmployeePhotoApiUrl(employeeId: string): string {
  return `employees/${employeeId}/photo`;
}

export async function uploadEmployeePhoto(file: Express.Multer.File, fullName: string, phone?: string | null): Promise<StoredEmployeePhoto> {
  const key = buildEmployeePhotoKey(fullName, phone, file);

  await getS3Client().send(new PutObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  }));

  return {
    key,
    url: getPublicObjectUrl(key),
  };
}

export function getPublicObjectUrl(key: string): string {
  const publicBaseUrl = process.env.CONTABO_S3_PUBLIC_BASE_URL;
  if (publicBaseUrl) {
    return `${publicBaseUrl.replace(/\/$/, '')}/${key}`;
  }

  const endpoint = process.env.CONTABO_S3_ENDPOINT;
  const bucket = process.env.CONTABO_S3_BUCKET;
  if (endpoint && bucket) {
    return `${endpoint.replace(/\/$/, '')}/${bucket}/${key}`;
  }

  return key;
}

export async function getEmployeePhotoReadUrl(key: string): Promise<string> {
  if (process.env.CONTABO_S3_PUBLIC_BASE_URL) {
    return getPublicObjectUrl(key);
  }

  return getSignedUrl(
    getS3Client(),
    new GetObjectCommand({ Bucket: getBucketName(), Key: key }),
    { expiresIn: Number(process.env.CONTABO_S3_SIGNED_URL_EXPIRES_SECONDS || 300) }
  );
}

export const memoryImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.EMPLOYEE_PHOTO_MAX_BYTES || 5 * 1024 * 1024),
  },
  fileFilter(_req, file, cb) {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'));
      return;
    }
    cb(null, true);
  },
});
