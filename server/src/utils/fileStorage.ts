import path from 'path';
import fs from 'fs';
import multer from 'multer';

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
