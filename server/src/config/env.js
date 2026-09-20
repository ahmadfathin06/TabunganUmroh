import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Path eksplisit ke server/.env — tidak bergantung pada current working directory. */
const ENV_PATH = path.join(__dirname, '../../.env');

/**
 * Modul ini WAJIB di-import paling awal di server.js.
 *
 * ES module dievaluasi mengikuti urutan import, sedangkan `dotenv.config()`
 * hanya bekerja kalau dipanggil sebelum modul lain membaca `process.env`.
 * Sebelumnya `dotenv.config()` ada di body server.js sehingga berjalan
 * SETELAH app.js dievaluasi (import bersifat hoisted).
 */
const { error } = dotenv.config({ path: ENV_PATH });
if (error) {
  console.warn(`⚠️  File ${ENV_PATH} tidak ditemukan — isi variabel environment lewat cara lain.`);
}

const REQUIRED = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
const MIN_SECRET_LENGTH = 32;
const isProduction = process.env.NODE_ENV === 'production';

const fail = (message) => {
  console.error(`❌ ${message}`);
  process.exit(1);
};

const warn = (message) => console.warn(`⚠️  ${message}`);

/** Fail-fast: konfigurasi lemah dilarang di production, diperingatkan di dev. */
export const validateEnv = () => {
  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    fail(`Environment variable wajib belum diisi: ${missing.join(', ')}`);
  }

  const weakSecrets = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'].filter(
    (key) => (process.env[key] || '').length < MIN_SECRET_LENGTH
  );
  if (weakSecrets.length > 0) {
    const msg = `${weakSecrets.join(', ')} terlalu pendek (minimal ${MIN_SECRET_LENGTH} karakter). Gunakan hasil crypto.randomBytes(48).toString('hex').`;
    isProduction ? fail(msg) : warn(msg);
  }

  if (process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET) {
    const msg = 'JWT_ACCESS_SECRET dan JWT_REFRESH_SECRET tidak boleh memakai nilai yang sama.';
    isProduction ? fail(msg) : warn(msg);
  }

  if (isProduction && !process.env.FRONTEND_URL) {
    // Deploy single-project (client + API satu domain, mis. Vercel) memakai
    // request same-origin sehingga CORS tidak diperlukan — cukup peringatan.
    // Wajib diisi HANYA bila frontend di-host di domain terpisah.
    warn(
      'FRONTEND_URL belum diset — request cross-origin akan ditolak CORS. '
        + 'Aman bila client dan API satu domain (same-origin).'
    );
  }

  return true;
};

validateEnv();

export default { validateEnv };
