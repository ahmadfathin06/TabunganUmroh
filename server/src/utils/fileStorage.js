import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { hasCloudinaryCredentials } from './credentials.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Folder penyimpanan berkas privat — HANYA untuk mode disk lokal.
 *
 * Di Vercel (serverless) filesystem read-only & ephemeral, jadi upload wajib
 * lewat Cloudinary (lihat upload.middleware). Mode disk tetap tersedia untuk
 * pengembangan lokal.
 *
 * SENGAJA tidak di-mount sebagai express.static. Sebelumnya folder ini
 * diakses publik lewat `/uploads/<nama-file>` tanpa autentikasi sehingga
 * siapa pun yang tahu URL-nya bisa mengunduh data pribadi jamaah.
 * Sekarang akses hanya lewat endpoint ber-otentikasi:
 *   - GET /api/documents/:id/file   (pemilik atau admin)
 *   - GET /api/deposits/:id/proof   (pemilik atau admin)
 */
export const UPLOADS_DIR = path.join(__dirname, '../uploads');

export const ensureUploadsDir = async () => {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
};

/**
 * Ubah nilai tersimpan di DB (mis. `/uploads/document-<uuid>.jpg`) menjadi
 * nama berkas aman.
 *
 * `path.basename()` mencegah path traversal (`../../.env`), dan pola nama
 * dibatasi pada karakter yang memang dihasilkan generator server. Nama inilah
 * yang juga dipakai sebagai Cloudinary public_id, sehingga nilai DB sama
 * berlaku untuk mode disk maupun Cloudinary.
 *
 * @returns {string|null} nama berkas, atau null bila tidak valid
 */
export const resolveStoredFile = (stored) => {
  if (!stored || typeof stored !== 'string') return null;

  const name = path.basename(stored.trim());
  if (!name || name === '.' || name === '..') return null;
  if (!/^[A-Za-z0-9._-]{1,120}$/.test(name)) return null;

  return name;
};

/**
 * Prefix public_id Cloudinary untuk seluruh aset aplikasi (Tabunganku Umroh).
 * Dipakai untuk namespacing + cleanup, dan merupakan SATU-SATUNYA sumber
 * pemetaan nama berkas ↔ public_id (dipakai juga oleh upload middleware dan
 * cron cleanup) agar tidak ada lagi ketidakcocokan prefix.
 */
export const CLOUDINARY_PREFIX = 'tuu-';

/**
 * Nama berkas tersimpan (`proof-<uuid>.png`) → public_id Cloudinary
 * (`tuu-proof-<uuid>`).
 *
 * PENTING: nama di DB TIDAK memuat prefix `tuu-` (prefix hanya ditambahkan
 * saat membentuk public_id), sehingga publikasi di sini tidak pernah menjadi
 * `tuu-tuu-...`. Bug prefix ganda sebelumnya membuat `api.resource()` selalu
 * gagal (public_id tidak ditemukan) dan cleanup menganggap SEMUA aset yatim.
 */
export const publicIdForStoredName = (storedName) => {
  const name = resolveStoredFile(storedName);
  if (!name) return null;
  return `${CLOUDINARY_PREFIX}${name.replace(/\.[^.]+$/, '')}`;
};

/** public_id Cloudinary → nama berkas tersimpan tanpa prefix/ekstensi. */
export const storedNameFromPublicId = (publicId) => {
  if (typeof publicId !== 'string' || !publicId) return null;
  return publicId.startsWith(CLOUDINARY_PREFIX)
    ? publicId.slice(CLOUDINARY_PREFIX.length)
    : publicId;
};

/**
 * Ambil isi berkas privat sebagai Buffer.
 *
 * Urutan pencarian:
 * 1. Cloudinary (bila kredensial tersedia) — private asset diunduh via
 *    SIGNED download URL (`cloudinary.utils.private_download_url`). Kalau
 *    asset tidak ada di Cloudinary (mis. berkas lama mode disk), lanjut ke
 *    langkah 2.
 * 2. Disk lokal (fallback pengembangan).
 *
 * Berkas maksimal 2MB (dibatasi multer), jadi buffering aman.
 *
 * @returns {Promise<{buffer: Buffer, contentType: string}|null>}
 */
export const getStoredFile = async (stored) => {
  const name = resolveStoredFile(stored);
  if (!name) return null;

  const ext = path.extname(name).toLowerCase();
  const contentType =
    ext === '.pdf'
      ? 'application/pdf'
      : ext === '.png'
        ? 'image/png'
        : 'image/jpeg';

  if (hasCloudinaryCredentials()) {
    try {
      const { v2: cloudinary } = await import('cloudinary');
      const publicId = publicIdForStoredName(name);
      const format = ext.replace(/^\./, '') || 'jpg';

      if (publicId) {
        // Aset disimpan `type: authenticated` sehingga TIDAK bisa diakses lewat
        // URL publik. Ambil lewat SIGNED download URL yang kedaluwarsa singkat,
        // bukan `secure_url` biasa (yang akan ditolak 401 untuk aset privat).
        const url = cloudinary.utils.private_download_url(publicId, format, {
          resource_type: 'image',
          type: 'authenticated',
          expires_at: Math.floor(Date.now() / 1000) + 60, // berlaku 60 detik
        });
        const response = await fetch(url);
        if (response.ok) {
          const buffer = Buffer.from(await response.arrayBuffer());
          return { buffer, contentType };
        }
      }
      // Cloudinary merespons error (mis. asset tidak ada) → coba disk.
    } catch {
      // Asset tidak ditemukan di Cloudinary → lanjut ke disk.
    }
  }

  try {
    const buffer = await fs.readFile(path.join(UPLOADS_DIR, name));
    return { buffer, contentType };
  } catch {
    return null;
  }
};

/**
 * Kirim berkas privat ke response dengan header defensif.
 * Content-Type selalu hasil whitelist server (lihat upload.middleware),
 * jadi tidak bergantung pada nama berkas kiriman client.
 */
export const streamStoredFile = async (stored, res) => {
  if (!resolveStoredFile(stored)) {
    res.status(404).json({ success: false, message: 'Berkas tidak ditemukan' });
    return;
  }

  // CSP sandbox + nosniff: berkas tidak boleh dieksekusi sebagai dokumen HTML/JS.
  res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store');

  try {
    const file = await getStoredFile(stored);
    if (!file) {
      if (!res.headersSent) {
        res.status(404).json({ success: false, message: 'Berkas tidak ditemukan' });
      }
      return;
    }
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Length', file.buffer.length);
    res.end(file.buffer);
  } catch {
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Gagal mengambil berkas' });
    }
  }
};

/**
 * Hapus asset tersimpan (rollback setelah upload gagal).
 * Dipakai controller untuk membersihkan asset Cloudinary/disk
 * bila update database gagal setelah storage sukses.
 *
 * Best-effort — kegagalan penghapusan tidak pernah melempar.
 *
 * @param {string} stored nilai DB `/uploads/<nama>.<ext>` atau nama berkas
 */
export const destroyStoredFile = async (stored) => {
  const name = resolveStoredFile(stored);
  if (!name) return;

  if (hasCloudinaryCredentials()) {
    try {
      const { v2: cloudinary } = await import('cloudinary');
      const publicId = publicIdForStoredName(name);
      if (publicId) {
        await cloudinary.uploader.destroy(publicId, {
          resource_type: 'image',
          type: 'authenticated',
          invalidate: true,
        });
        return;
      }
    } catch {
      // fallback ke disk bila Cloudinary gagal
    }
  }

  try {
    await fs.unlink(path.join(UPLOADS_DIR, name));
  } catch {
    // tidak ada / sudah terhapus — abaikan
  }
};

export default {
  UPLOADS_DIR,
  ensureUploadsDir,
  resolveStoredFile,
  streamStoredFile,
  destroyStoredFile,
  CLOUDINARY_PREFIX,
  publicIdForStoredName,
  storedNameFromPublicId,
};
