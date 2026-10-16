import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs/promises';
import { UPLOADS_DIR, ensureUploadsDir, CLOUDINARY_PREFIX } from '../utils/fileStorage.js';
import { hasCloudinaryCredentials } from '../utils/credentials.js';
import { validateFileSignature, extensionForType } from '../utils/magicBytes.js';
import prisma from '../config/database.js';
import ApiResponse from '../utils/apiResponse.js';

/**
 * Mode penyimpanan berkas:
 * - "cloudinary" : dipakai bila kredensial Cloudinary lengkap (wajib di
 *   Vercel — filesystem serverless read-only dan ephemeral).
 * - "disk"       : fallback pengembangan lokal (folder server/src/uploads).
 *
 * ARSITEKTUR (diperbaiki — P0):
 * Proses upload dipisah menjadi dua tahap yang BISA dipisah middleware:
 *
 *   1. parseUpload(field)   → multer (memory) + validasi MAGIC BYTES.
 *      Tidak menyentuh Cloudinary/disk sama sekali.
 *   2. <preflight/validasi> → otorisasi objek, cek kepemilikan, status,
 *      validasi field multipart (type), dsb.
 *   3. persistUpload()      → baru menyimpan ke Cloudinary (private) / disk.
 *
 * Sebelumnya `handleUpload()` menjalankan multer + Cloudinary SEBELUM
 * controller memeriksa apakah user berhak mengupload ke deposit/dokumen
 * tersebut — sehingga request tanpa otorisasi tetap membakar quota
 * Cloudinary dan berpotensi membuat orphan asset. Sekarang Cloudinary
 * hanya dipanggil setelah preflight lolos.
 *
 * Nilai DB (proofImage / fileUrl) selalu `/uploads/<nama>.<ext>` sehingga
 * controller, DB, dan UI tidak perlu tahu di mana berkas fisik disimpan.
 */
export const isCloudinaryEnabled = hasCloudinaryCredentials();
export const isDiskMode = !isCloudinaryEnabled;

/**
 * Whitelist MIME -> ekstensi yang DIPAKSAKAN server (pertahanan
 * lapisan pertama). Validasi sesungguhnya terhadap isi berkas
 * (magic bytes) dilakukan di `parseUpload` — MIME dari client
 * tidak pernah dipercaya sepenuhnya.
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
 * Multer SELALU memakai memoryStorage pada tahap parse. Berkas baru
 * ditulis ke disk/Cloudinary pada `persistUpload()` — setelah
 * otorisasi & validasi lolos. Ini mencegah orphan file di disk
 * maupun di Cloudinary bila validasi/preflight gagal.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    if (Object.prototype.hasOwnProperty.call(MIME_EXTENSION, file.mimetype)) {
      return cb(null, true);
    }
    const error = new Error('File type tidak diizinkan. Hanya JPG, PNG, PDF.');
    error.status = 400;
    return cb(error);
  },
});

/**
 * Tahap 1 — parse multipart ke memori + validasi magic bytes.
 *
 * Magic bytes diverifikasi terhadap MIME deklarasi client:
 * berkas HTML/JS yang dikirim dengan MIME `image/png` ditolak
 * karena signature aslinya bukan JPEG/PNG/PDF.
 *
 * @param {string} fieldName nama field multipart
 */
export const parseUpload = (fieldName) => [
  upload.single(fieldName),
  (req, res, next) => {
    // Tanpa berkas → biarkan controller menangani "file wajib".
    if (!req.file) return next();

    const result = validateFileSignature(req.file.buffer, req.file.mimetype);
    if (!result.ok) {
      const error = new Error(
        result.reason === 'MIME_MISMATCH'
          ? 'Tipe berkas tidak sesuai signature aslinya.'
          : 'Format berkas tidak didukung. Hanya JPG, PNG, PDF.'
      );
      error.status = 400;
      return next(error);
    }

    req.file.detectedType = result.detected;
    return next();
  },
];

/**
 * Tahap 3 — simpan berkas ke storage aktif.
 *
 * WAJIB dipanggil setelah parseUpload + seluruh preflight/validasi
 * otorisasi lolos. Pada mode Cloudinary, asset diunggah sebagai
 * PRIVATE (`type: authenticated`) — delivery hanya lewat signed URL
 * berumur pendek (lihat fileStorage.getStoredFile).
 *
 * Menyuntukkan `req.file.filename` (`<field>-<uuid>.<ext>`),
 * `req.file.storage`, dan (cloudinary) `req.file.publicId`.
 */
export const persistUpload = () => [
  async (req, res, next) => {
    if (!req.file) return next();

    try {
      const ext = extensionForType(req.file.detectedType) || '';
      // crypto.randomUUID() menggantikan Math.random() — tidak bisa ditebak.
      const storedName = `${req.file.fieldname}-${crypto.randomUUID()}`;

      if (isDiskMode) {
        await ensureUploadsDir();
        const filename = `${storedName}${ext ? `.${ext}` : ''}`;
        await fs.writeFile(path.join(UPLOADS_DIR, filename), req.file.buffer);
        req.file.filename = filename;
        req.file.storage = 'disk';
        return next();
      }

      const { v2: cloudinary } = await import('cloudinary');
      // Nama berkas tersimpan TANPA prefix. Prefix `tuu-` hanya ditambahkan
      // saat membentuk public_id agar pemetaan nama↔public_id konsisten
      // satu arah (lihat fileStorage.publicIdForStoredName).
      const publicId = `${CLOUDINARY_PREFIX}${storedName}`;

      await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
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
      req.file.publicId = publicId;
      return next();
    } catch (error) {
      return next(error);
    }
  },
];

/**
 * PREFLIGHT upload bukti transfer (P0 — tutup IDOR).
 *
 * Dijalankan setelah parseUpload (berkas ada di memori) tetapi
 * SEBELUM persistUpload (Cloudinary). Memastikan:
 *   - parameter ID valid;
 *   - deposit ada dan dimiliki user yang login;
 *   - status deposit masih PENDING.
 *
 * Bila lolos → next() ke persistUpload. Bila tidak → respons
 * 404/409 dan Cloudinary TIDAK pernah dipanggil.
 */
export const preflightDepositProof = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(id)) {
      return ApiResponse.error(res, 'ID setoran tidak valid', 400);
    }

    const deposit = await prisma.deposit.findFirst({
      where: {
        id,
        savingsPlan: { userId: req.user.id },
      },
      select: { id: true, status: true, proofImage: true },
    });

    if (!deposit) {
      // Tidak membedakan "tidak ada" vs "milik user lain" — tidak bocorkan info.
      return ApiResponse.error(res, 'Setoran tidak ditemukan', 404);
    }

    if (deposit.status !== 'PENDING') {
      return ApiResponse.error(res, 'Setoran sudah diverifikasi — bukti tidak dapat diganti', 409);
    }

    // Simpan bukti lama (bila ada) untuk dibersihkan setelah update sukses.
    req.preflight = { depositId: deposit.id, oldProofImage: deposit.proofImage };
    return next();
  } catch (error) {
    return next(error);
  }
};

/**
 * Hapus asset lama dari storage (best-effort) setelah bukti
 * baru berhasil disimpan — mencegah orphan asset Cloudinary.
 */
export const cleanupOldProof = async (storedPath) => {
  const name = String(storedPath || '').replace(/^\/uploads\//, '').split('/').pop();
  if (!name) return;
  try {
    if (!isDiskMode) {
      const { publicIdForStoredName } = await import('../utils/fileStorage.js');
      const { v2: cloudinary } = await import('cloudinary');
      const publicId = publicIdForStoredName(name);
      if (publicId) {
        await cloudinary.uploader.destroy(publicId, {
          resource_type: 'image',
          type: 'authenticated',
          invalidate: true,
        });
      }
      return;
    }
    await fs.unlink(path.join(UPLOADS_DIR, name)).catch(() => {});
  } catch {
    // best-effort — orphan akan dibersihkan cron cleanup
  }
};

// Backward-compatible export; routes memakai parseUpload/persistUpload.
export const handleUpload = (fieldName) => [...parseUpload(fieldName), ...persistUpload()];

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
