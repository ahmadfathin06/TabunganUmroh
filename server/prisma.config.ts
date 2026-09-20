/**
 * Konfigurasi Prisma 7 CLI (wajib sejak Prisma 7).
 *
 * - Env TIDAK dimuat otomatis lagi oleh CLI, jadi dotenv dipanggil eksplisit
 *   di sini (file .env yang sama yang dipakai server, yaitu server/.env).
 * - Connection string datasource pindah ke sini (deprecated di schema.prisma).
 * - Path schema eksplisit supaya aman dijalankan dari folder mana pun.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { defineConfig, env } from 'prisma/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, '.env') });

export default defineConfig({
  schema: path.join(__dirname, 'prisma/schema.prisma'),

  datasource: {
    // env() hanya membaca process.env — dotenv di atas yang memuat .env.
    url: env('DATABASE_URL'),
  },

  migrations: {
    path: path.join(__dirname, 'prisma/migrations'),
    seed: 'node prisma/seed.js',
  },
});
