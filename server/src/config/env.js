import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { hasCloudinaryCredentials, missingCloudinaryKeys } from '../utils/credentials.js';
import { getEmailStatus, getEmailConfigIssues } from './mailer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Path eksplisit ke server/.env — tidak bergantung pada current working directory.
 *
 * PENTING (bundle esbuild): `npm run build:api` membundel seluruh server ke
 * server/.build/server.mjs. Di dalam bundle, `__dirname` = folder .build, bukan
 * src/config, sehingga '../../.env' akan menunjuk ke ROOT repo dan file .env
 * tidak pernah termuat — semua env kosong → seluruh endpoint DB gagal 500
 * (persis gejala `api/packages` 500 di production). Jadi path dicoba dari dua
 * kandidat: src/config (mode sumber) dan .build (mode bundle).
 */
const ENV_CANDIDATES = [
  path.join(__dirname, '../../.env'), // dari src/config/  → server/.env
  path.join(__dirname, '../.env'), // dari .build/      → server/.env
];

const loadDotenv = () => {
  for (const candidate of ENV_CANDIDATES) {
    const { error } = dotenv.config({ path: candidate });
    if (!error) return candidate;
  }
  return null;
};

const loadedFrom = loadDotenv();
if (!loadedFrom) {
  console.warn(
    '⚠️  File .env tidak ditemukan di lokasi standar — isi variabel environment lewat cara lain.'
  );
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
    //
    // PENTING: validasi ini TIDAK boleh menolak request tanpa header Origin
    // (same-origin, curl, health check) — lihat konfigurasi CORS di app.js.
    warn(
      'FRONTEND_URL belum diset — request cross-origin akan ditolak CORS. '
        + 'Aman bila client dan API satu domain (same-origin).'
    );
  }

  // Cloudinary: di Vercel filesystem read-only, jadi upload WAJIB Cloudinary.
  // Nilai placeholder (`your_cloud_name` dll.) tidak dianggap terkonfigurasi.
  if (!hasCloudinaryCredentials()) {
    const missing = missingCloudinaryKeys().join(', ');
    const msg =
      `Cloudinary belum terkonfigurasi (${missing}) — upload dokumen/bukti `
      + 'tidak akan berfungsi di Vercel. Isi ketiga variabel CLOUDINARY_* dengan nilai asli.';
    isProduction ? warn(msg) : warn(`${msg} (mode disk lokal dipakai di development)`);
  }

  // Email/Resend: opsional. Bila pengguna MENGAKTIFKAN email tetapi
  // konfigurasinya tidak lengkap, gagalkan start dengan pesan yang aman
  // (nama variabel saja — tanpa nilai) supaya tidak jadi kegagalan senyap.
  const emailStatus = getEmailStatus();
  if (emailStatus === 'misconfigured') {
    fail(
      `EMAIL_ENABLED=true tetapi konfigurasi email belum lengkap: ${getEmailConfigIssues().join(', ')}. `
        + 'Isi variabel tersebut, atau set EMAIL_ENABLED=false untuk mematikan email.'
    );
  }

  return true;
};

validateEnv();

export default { validateEnv };
