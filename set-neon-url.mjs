/**
 * Helper SEMENTARA untuk memasang DATABASE_URL Neon ke server/.env.
 *
 * Cara pakai (dari root project, mis. C:\Users\User\Downloads\TabunganUmroh):
 *   1) Buat file  server/.env.neon  dan isi HANYA connection string Neon
 *      (satu baris). Simpan.
 *   2) Jalankan:  node set-neon-url.mjs
 *
 * Skrip ini:
 *   - memvalidasi bahwa host BUKAN localhost/127.0.0.1,
 *   - menulis/mengganti baris DATABASE_URL di server/.env,
 *   - menghapus file sumber server/.env.neon,
 *   - hanya mencetak host & status (TIDAK pernah mencetak password/URL penuh).
 *
 * Hapus file ini setelah selesai (bukan bagian dari aplikasi).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(ROOT, 'server', '.env.neon');
const ENV = path.join(ROOT, 'server', '.env');

if (!fs.existsSync(SRC)) {
  console.error('✖ Tidak menemukan: ' + SRC);
  console.error('  Buat file itu dan isi HANYA connection string Neon, lalu jalankan lagi.');
  process.exit(1);
}

const rawLines = fs
  .readFileSync(SRC, 'utf8')
  .replace(/^\uFEFF/, '') // buang BOM (Notepad/PowerShell kadang menambahkannya)
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'));

// Toleran: boleh isinya `postgresql://...` saja, atau `DATABASE_URL="postgresql://..."`.
const candidate =
  rawLines.find((l) => /postgres(ql)?:\/\//.test(l)) || rawLines[0] || '';
const url = candidate
  .replace(/^DATABASE_URL\s*=\s*/i, '')
  .replace(/^["']|["']$/g, '')
  .trim();

let parsed;
try {
  parsed = new URL(url);
} catch {
  console.error('✖ Connection string tidak valid. Pastikan dimulai dengan postgresql://');
  process.exit(1);
}

if (!/^postgres(ql)?:$/.test(parsed.protocol)) {
  console.error('✖ Bukan URL PostgreSQL (protokol: ' + parsed.protocol + ')');
  process.exit(1);
}

const host = parsed.hostname;
if (['localhost', '127.0.0.1', '::1'].includes(host)) {
  console.error('✖ Host masih "' + host + '" — database produksi tidak boleh localhost.');
  process.exit(1);
}
if (!/\.neon\.tech$/i.test(host)) {
  console.warn('⚠️  Host bukan domain .neon.tech: ' + host + ' — lanjut, tapi pastikan ini benar.');
}

let env = fs.readFileSync(ENV, 'utf8');
const line = 'DATABASE_URL="' + url + '"';
const re = /^[ \t]*DATABASE_URL[ \t]*=.*$/m;
env = re.test(env) ? env.replace(re, line) : env.replace(/\s*$/, '') + '\n' + line + '\n';
fs.writeFileSync(ENV, env);
fs.unlinkSync(SRC);

console.log('✅ server/.env diperbarui (password tidak ditampilkan).');
console.log('   host      : ' + host);
console.log('   isNeon    : ' + /\.neon\.tech$/i.test(host));
console.log('   pooler    : ' + /-pooler\./.test(host));
console.log('   sslmode   : ' + (parsed.searchParams.get('sslmode') || '(TIDAK ADA — tambahkan sslmode=require)'));
console.log('   pgbouncer : ' + (parsed.searchParams.get('pgbouncer') || '(tidak ada)'));
console.log('   connLimit : ' + (parsed.searchParams.get('connection_limit') || '(tidak ada)'));
console.log('\nFile sumber server/.env.neon sudah dihapus. Balas "sudah" agar saya lanjut.');
