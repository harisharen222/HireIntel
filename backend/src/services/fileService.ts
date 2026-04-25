import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import FileType from 'file-type';
import { env } from '../config/env';
import { badRequest, unprocessable } from '../utils/errors';

const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]); // "%PDF"

export interface SavedFile {
  storagePath: string;   // absolute path on disk, never sent to client
  sizeBytes: number;
  sha256: string;
}

/**
 * Validate and persist an uploaded file.
 *
 * Does NOT trust the client-supplied Content-Type. We sniff the actual bytes
 * and check the PDF magic number before writing anything to disk.
 *
 * The stored filename is server-generated (cuid-style from the caller).
 * Original filename is preserved only as a display label in the DB.
 */
export const saveUploadedPdf = async (
  userId: string,
  fileId: string,
  buffer: Buffer,
  declaredMime: string
): Promise<SavedFile> => {
  if (buffer.length === 0) throw badRequest('Empty file');
  if (buffer.length > env.MAX_UPLOAD_BYTES) throw badRequest('File too large');

  // 1. Magic-byte check — cheapest, fastest.
  if (!buffer.subarray(0, 4).equals(PDF_MAGIC)) {
    throw unprocessable('File is not a valid PDF');
  }

  // 2. MIME sniff with file-type — confirms it's actually PDF structure.
  const detected = await FileType.fromBuffer(buffer);
  if (!detected || detected.mime !== 'application/pdf') {
    throw unprocessable('File content does not match PDF format');
  }

  // 3. Even with server-side sniff passing, validate the declared type
  //    so a malicious client can't mislead downstream middleware.
  if (declaredMime && declaredMime !== 'application/pdf') {
    throw unprocessable('Declared content type must be application/pdf');
  }

  // 4. Per-user directory, never under a web-served path.
  const userDir = path.join(env.UPLOAD_DIR, userId);
  await fs.mkdir(userDir, { recursive: true, mode: 0o755 });

  const storagePath = path.join(userDir, `${fileId}.pdf`);
  await fs.writeFile(storagePath, buffer, { mode: 0o644 });

  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

  return {
    storagePath,
    sizeBytes: buffer.length,
    sha256,
  };
};

/**
 * Resolve a stored file path while rejecting path traversal.
 * Any path that escapes UPLOAD_DIR is refused — defends against
 * `../../etc/passwd`-style inputs if a path ever reaches a public handler.
 */
export const safeResolveUpload = (relOrAbs: string): string => {
  const abs = path.resolve(env.UPLOAD_DIR, relOrAbs);
  const base = path.resolve(env.UPLOAD_DIR);
  if (!abs.startsWith(base + path.sep) && abs !== base) {
    throw badRequest('Invalid file path');
  }
  return abs;
};
