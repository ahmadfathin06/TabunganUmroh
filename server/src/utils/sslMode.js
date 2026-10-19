/**
 * pg-connection-string (dipakai node-postgres / Prisma adapter) memperlakukan
 * `sslmode=prefer|require|verify-ca` sebagai ALIAS `verify-full`, lalu melempar
 * SECURITY WARNING lewat process.emitWarning. Di serverless (Vercel) warning
 * itu tercetak di setiap cold start = spam log tiap request.
 *
 * Karena perilaku ketiga mode itu memang identik dengan verify-full saat ini,
 * kita ganti eksplisit ke `verify-full`: koneksi & keamanan TIDAK berubah,
 * warning hilang, dan siap untuk pg v9 di mana mode itu akan jadi lebih lemah.
 *
 * Contoh hasil:
 *   ...?sslmode=require&pgbouncer=true  -> ...?sslmode=verify-full&pgbouncer=true
 *   ...?pgbouncer=true&sslmode=require  -> ...?pgbouncer=true&sslmode=verify-full
 */
const DEPRECATED_MODES = /([?&])sslmode=(prefer|require|verify-ca)(&|$)/i;

export const normalizeSslMode = (connectionString) => {
  if (typeof connectionString !== 'string' || !DEPRECATED_MODES.test(connectionString)) {
    return connectionString;
  }
  // String.prototype.replace dengan regex non-global: hanya sslmode pertama
  // (parameter itu memang cuma boleh muncul sekali).
  return connectionString.replace(
    /([?&])sslmode=(?:prefer|require|verify-ca)(&|$)/i,
    (_match, lead, trail) => `${lead}sslmode=verify-full${trail}`
  );
};

export default { normalizeSslMode };
