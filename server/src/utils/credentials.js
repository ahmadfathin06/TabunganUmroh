/**
 * Deteksi kredensial "placeholder" dari template environment.
 *
 * `.env.example` sengaja berisi nilai contoh seperti `your_cloud_name` atau
 * `change_me`. Sebelumnya cek konfigurasi hanya memakai `Boolean(nilai)`,
 * sehingga nilai contoh dianggap kredensial sah → upload mencoba ke Cloudinary
 * dengan kredensial palsu dan gagal 500 ("Must supply api_key") padahal mode
 * disk lokal tersedia.
 *
 * Modul ini adalah SATU-SATUNYA sumber logika tersebut (dipakai config,
 * upload middleware, file storage, cron cleanup, dan health check) supaya
 * perilakunya konsisten dan mudah diuji.
 */

/** Pola nilai contoh yang TIDAK boleh dianggap konfigurasi valid. */
export const PLACEHOLDER_PATTERN =
  /^(your|contoh|example|xxx+|changeme|change[_-]?me|placeholder|dummy)/i;

/**
 * @param {unknown} value nilai kandidat
 * @returns {boolean} true bila nilai terisi dan bukan placeholder
 */
export const isRealCredential = (value) => {
  const v = String(value ?? '').trim();
  if (v.length === 0) return false;
  return !PLACEHOLDER_PATTERN.test(v);
};

/** Nama variabel environment Cloudinary (urut: cloud name, key, secret). */
export const CLOUDINARY_ENV_KEYS = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
];

/**
 * Cloudinary dipakai HANYA bila ketiga kredensial terisi dan bukan placeholder.
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {boolean}
 */
export const hasCloudinaryCredentials = (env = process.env) =>
  CLOUDINARY_ENV_KEYS.every((key) => isRealCredential(env?.[key]));

/**
 * Status konfigurasi Cloudinary tanpa pernah membocorkan nilai kredensial.
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {'configured'|'disabled'}
 */
export const cloudinaryStatus = (env = process.env) =>
  hasCloudinaryCredentials(env) ? 'configured' : 'disabled';

/** Lokasi kredensial yang belum diisi (nama variabel saja, bukan nilainya). */
export const missingCloudinaryKeys = (env = process.env) =>
  CLOUDINARY_ENV_KEYS.filter((key) => !isRealCredential(env?.[key]));

export default {
  PLACEHOLDER_PATTERN,
  isRealCredential,
  CLOUDINARY_ENV_KEYS,
  hasCloudinaryCredentials,
  cloudinaryStatus,
  missingCloudinaryKeys,
};
