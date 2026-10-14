/**
 * Validasi magic bytes (file signature) — bukan hanya MIME dari
 * client.
 *
 * Client dapat mengirim `Content-Type`/`file.mimetype` apa pun.
 * Sebelumnya upload hanya memercayai `file.mimetype`, sehingga
 * berkas HTML/JS yang dikirim dengan MIME `image/png` lolos
 * whitelist (stored XSS bila pernah disajikan sebagai static).
 *
 * Modul ini membaca byte pertama berkas dan mencocokkan
 * signature asli: JPEG, PNG, PDF. Mismatch MIME↔signature
 * ditolak.
 */

/** Signature magic bytes. Urutan menentukan deteksi. */
export const SIGNATURES = {
  jpeg: { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff], offset: 0 },
  png: { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], offset: 0 },
  pdf: { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46], offset: 0 }, // %PDF
};

/** Ekstensi yang diizinkan untuk setiap tipe terdeteksi. */
export const DETECTED_EXTENSIONS = {
  jpeg: 'jpg',
  png: 'png',
  pdf: 'pdf',
};

/**
 * Deteksi tipe berkas dari buffer berdasarkan magic bytes.
 * @param {Buffer} buffer
 * @returns {'jpeg'|'png'|'pdf'|null} tipe terdeteksi, atau null bila tidak dikenal
 */
export const detectFileType = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return null;

  for (const [type, signature] of Object.entries(SIGNATURES)) {
    const { bytes, offset } = signature;
    let match = true;
    for (let i = 0; i < bytes.length; i += 1) {
      if (buffer[offset + i] !== bytes[i]) {
        match = false;
        break;
      }
    }
    if (match) return type;
  }
  return null;
};

/**
 * MIME yang diizinkan untuk tipe terdeteksi (beberapa alias
 * JPEG diterima sebagai deklarasi, tetapi signature tetap JPEG).
 */
const ALLOWED_DECLARED_MIME = {
  jpeg: ['image/jpeg', 'image/jpg', 'image/pjpeg'],
  png: ['image/png'],
  pdf: ['application/pdf'],
};

/**
 * Validasi bahwa signature berkas cocok dengan MIME yang
 * dideklarasikan client.
 *
 * @param {Buffer} buffer isi berkas
 * @param {string} declaredMime MIME dari `file.mimetype`
 * @returns {{ok: boolean, detected?: string, reason?: string}}
 */
export const validateFileSignature = (buffer, declaredMime) => {
  const detected = detectFileType(buffer);

  if (!detected) {
    return { ok: false, detected: null, reason: 'FORMAT_TIDAK_DIKETAHUI' };
  }

  const allowed = ALLOWED_DECLARED_MIME[detected] || [];
  const declared = String(declaredMime || '').toLowerCase();
  if (!allowed.includes(declared)) {
    return { ok: false, detected, reason: 'MIME_MISMATCH' };
  }

  return { ok: true, detected };
};

/**
 * Ekstensi canonical untuk tipe terdeteksi (dipakai server —
 * bukan dari nama berkas client).
 */
export const extensionForType = (type) => DETECTED_EXTENSIONS[type] || null;

export default {
  SIGNATURES,
  detectFileType,
  validateFileSignature,
  extensionForType,
};
