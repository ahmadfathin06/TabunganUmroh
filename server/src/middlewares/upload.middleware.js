import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { UPLOADS_DIR, ensureUploadsDir } from '../utils/fileStorage.js';

ensureUploadsDir().catch(() => {});

/**
 * Whitelist MIME -> ekstensi yang DIPAKSAKAN server.
 *
 * SEBELUMNYA ekstensi diambil dari `file.originalname` dan fileFilter hanya
 * memeriksa `file.mimetype` yang dikirim client. Akibatnya berkas bernama
 * `payload.js` / `payload.html` yang dikirim dengan MIME palsu (`image/png`)
 * tetap tersimpan dengan ekstensi aslinya, lalu disajikan `express.static`
 * sebagai script/HTML — celah stored XSS di origin API.
 *
 * Sekarang ekstensi selalu ditentukan server dari MIME yang lolos whitelist,
 * jadi tidak mungkin ada berkas .html/.js/.svg di folder upload.
 */
const MIME_EXTENSION = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/pjpeg': '.jpg',
  'image/png': '.png',
  'application/pdf': '.pdf',
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = MIME_EXTENSION[file.mimetype] || '';
    // crypto.randomUUID() menggantikan Math.random() — tidak bisa ditebak/di-enumerasi.
    cb(null, `${file.fieldname}-${crypto.randomUUID()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (Object.prototype.hasOwnProperty.call(MIME_EXTENSION, file.mimetype)) {
    return cb(null, true);
  }
  const error = new Error('File type tidak diizinkan. Hanya JPG, PNG, PDF.');
  error.status = 400;
  return cb(error);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 }, // Max 2MB, satu berkas per request
});

export const uploadSingle = (fieldName) => upload.single(fieldName);

/**
 * Nama asli kiriman client dinormalisasi — hanya dipakai untuk ditampilkan di
 * UI, TIDAK pernah dipakai untuk membentuk path penyimpanan.
 */
export const safeOriginalName = (originalname = '') => {
  const base = path
    .basename(String(originalname))
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return base.slice(0, 180) || 'dokumen';
};

export default upload;
