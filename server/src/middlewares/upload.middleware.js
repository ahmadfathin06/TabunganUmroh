import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { UPLOADS_DIR, ensureUploadsDir, CLOUDINARY_PREFIX } from '../utils/fileStorage.js';
import { hasCloudinaryCredentials } from '../utils/credentials.js';

ensureUploadsDir().catch(() => {});

/**
 * Mode penyimpanan berkas:
 * - "cloudinary" : dipakai bila kredensial Cloudinary lengkap (wajib di
 *   Vercel — filesystem serverless read-only dan ephemeral).
 * - "disk"       : fallback pengembangan lokal (folder server/src/uploads).
 *
 * Nilai DB (proofImage / fileUrl) selalu `/uploads/<nama>.<ext>` sehingga
 * controller, DB, dan UI tidak perlu tahu di mana berkas fisik disimpan.
 * Nama berkas inilah yang dipetakan ke public_id Cloudinary (lihat
 * fileStorage.getStoredFile).
 *
 * CATATAN: nilai placeholder `.env.example` (`your_cloud_name` dll.) dianggap
 * TIDAK diset — kalau tidak, upload mencoba ke Cloudinary dengan kredensial
 * palsu dan gagal 500 ("Must supply api_key") padahal mode disk lokal tersedia.
 */
export const isCloudinaryEnabled = hasCloudinaryCredentials();
export const isDiskMode = !isCloudinaryEnabled;

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
export const MIME_EXTENSION = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/pjpeg': 'jpg',
  'image/png': 'png',
  'application/pdf': 'pdf',
};

/** Batas ukuran berkas yang diizinkan (2MB). */
export const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;

/**
 * Public id Cloudinary dibuat TANPA ekstensi dan memakai prefix bersama
 * `CLOUDINARY_PREFIX` (`tuu-`), sementara NAMA BERKAS tersimpan tidak memuat
 * prefix. Ekstensi dikirim terpisah pada waktu baca (format eksplisit).
 */
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = MIME_EXTENSION[file.mimetype] || '';
    // crypto.randomUUID() menggantikan Math.random() — tidak bisa ditebak/di-enumerasi.
    cb(null, `${file.fieldname}-${crypto.randomUUID()}${ext ? `.${ext}` : ''}`);
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

const multerOptions = {
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 }, // Max 2MB, satu berkas per request
};

// Cloudinary mode butuh buffer penuh (upload_stream); disk mode tulis langsung.
const upload = multer({
  ...multerOptions,
  storage: isDiskMode ? diskStorage : multer.memoryStorage(),
});

/**
 * Middleware lanjutan setelah multer: bila mode Cloudinary, unggah buffer ke
 * Cloudinary sebagai asset PRIVATE (`type: authenticated`) supaya berkas KTP,
 * paspor, dan bukti transfer tidak bisa diakses dari URL publik. Akses tetap
 * hanya lewat endpoint ber-otentikasi yang menyajikan berkas via signed URL.
 *
 * Setelah selesai, req.file.filename diubah menjadi `<public-id>.<ext>` agar
 * bentuknya identik dengan mode disk — controller tidak perlu berubah.
 */
export const handleUpload = (fieldName) => [
  upload.single(fieldName),
  async (req, res, next) => {
    if (!req.file || isDiskMode) return next();

    try {
      const { v2: cloudinary } = await import('cloudinary');
      const ext = MIME_EXTENSION[req.file.mimetype] || '';
      // Nama berkas tersimpan dibuat TANPA prefix. Prefix `tuu-` hanya
      // ditambahkan saat membentuk public_id agar pemetaan nama↔public_id
      // konsisten satu arah (lihat fileStorage.publicIdForStoredName).
      const storedName = `${req.file.fieldname}-${crypto.randomUUID()}`;
      const publicId = `${CLOUDINARY_PREFIX}${storedName}`;

      await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            // PDF direkam sebagai resource image (format didukung Cloudinary).
            resource_type: 'image',
            type: 'authenticated', // privat — delivery butuh signed URL
            public_id: publicId,
            use_filename: false,
            unique_filename: false,
            overwrite: false,
          },
          (error, uploaded) => (error ? reject(error) : resolve(uploaded))
        );
        stream.end(req.file.buffer);
      });

      req.file.filename = `${storedName}${ext ? `.${ext}` : ''}`;
      req.file.storage = 'cloudinary';
      return next();
    } catch (error) {
      return next(error);
    }
  },
];

// Backward-compatible export; routes memakai handleUpload('...').
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
