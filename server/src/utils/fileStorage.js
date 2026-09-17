import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Folder penyimpanan berkas privat: KTP, paspor, pas foto, bukti transfer.
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
 * path absolut yang aman.
 *
 * `path.basename()` mencegah path traversal (`../../.env`), dan pola nama
 * dibatasi pada karakter yang memang dihasilkan generator server.
 *
 * @returns {string|null} path absolut, atau null bila nama tidak valid
 */
export const resolveStoredFile = (stored) => {
  if (!stored || typeof stored !== 'string') return null;

  const name = path.basename(stored.trim());
  if (!name || name === '.' || name === '..') return null;
  if (!/^[A-Za-z0-9._-]{1,120}$/.test(name)) return null;

  return path.join(UPLOADS_DIR, name);
};

/**
 * Kirim berkas privat ke response dengan header defensif.
 * Ekstensi berkas selalu hasil whitelist server (lihat upload.middleware),
 * jadi Content-Type dari express memang sesuai isi file.
 */
export const streamStoredFile = (stored, res) => {
  const absolute = resolveStoredFile(stored);

  if (!absolute) {
    res.status(404).json({ success: false, message: 'Berkas tidak ditemukan' });
    return;
  }

  // CSP sandbox + nosniff: berkas tidak boleh dieksekusi sebagai dokumen HTML/JS.
  res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store');

  res.sendFile(absolute, (err) => {
    if (!err) return;
    if (res.headersSent) return res.destroy();
    res.status(err.status || 404).json({ success: false, message: 'Berkas tidak ditemukan' });
  });
};

export default { UPLOADS_DIR, ensureUploadsDir, resolveStoredFile, streamStoredFile };
