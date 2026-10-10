/**
 * "Lint" minimal tanpa dependensi.
 *
 * 1. Menjalankan `node --check` (parse) ke setiap berkas .js/.mjs di src/ dan
 *    test/ — menangkap syntax error tanpa memasang ESLint.
 * 2. Penjaga migrasi email: memastikan TIDAK ada lagi pemakaian runtime
 *    Nodemailer/SMTP di src/ (migrasi ke Resend).
 *
 * Jalankan: npm run lint --prefix server
 */
import { readdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PARSE_TARGETS = ['src', 'test'];

// Pola pemakaian SMTP/Nodemailer yang harus sudah hilang dari kode runtime.
const FORBIDDEN = [
  { pattern: /(?:from|require\()\s*['"]nodemailer['"]/, label: "import 'nodemailer'" },
  { pattern: /process\.env\.SMTP_/, label: 'process.env.SMTP_*' },
  { pattern: /createTransport\s*\(/, label: 'nodemailer.createTransport()' },
];

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'generated' || entry.name === 'node_modules') continue;
      yield* walk(full);
    } else if (/\.(js|mjs)$/.test(entry.name)) {
      yield full;
    }
  }
}

const problems = [];
let checked = 0;

for (const target of PARSE_TARGETS) {
  const absolute = path.join(ROOT, target);
  let files = [];
  try {
    for await (const file of walk(absolute)) files.push(file);
  } catch {
    continue; // folder tidak ada — lewati
  }

  for (const file of files) {
    checked += 1;
    try {
      execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    } catch (error) {
      problems.push(`${path.relative(ROOT, file)}: ${error.stderr?.toString().trim() || error.message}`);
    }
  }
}

// Penjaga migrasi email (hanya kode runtime di src/).
const srcDir = path.join(ROOT, 'src');
try {
  for await (const file of walk(srcDir)) {
    const content = readFileSync(file, 'utf8');
    for (const { pattern, label } of FORBIDDEN) {
      if (pattern.test(content)) {
        problems.push(`${path.relative(ROOT, file)}: masih memakai ${label} — migrasi ke Resend belum tuntas`);
      }
    }
  }
} catch {
  /* src/ tidak ada */
}

if (problems.length > 0) {
  console.error(`✖ Lint gagal (${problems.length} masalah):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log(`✅ Lint lulus: ${checked} berkas server ter-parse, tanpa sisa SMTP/Nodemailer.`);
