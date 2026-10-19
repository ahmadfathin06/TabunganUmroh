import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.ts';
import { normalizeSslMode } from '../utils/sslMode.js';

/**
 * Prisma 7: client tidak lagi dibuat dari '@prisma/client' (itu kini hanya
 * runtime lama), melainkan dari hasil `prisma generate` di src/generated/prisma,
 * dan WAJIB memakai driver adapter (node-postgres) sebagai lapisan koneksinya.
 *
 * Catatan koneksi:
 * - Pool & timeout kini diatur oleh node-postgres, bukan engine Rust lagi.
 * - Untuk Supabase/Neon/PgBouncer gunakan connection string pooler
 *   (?pgbouncer=true&connection_limit=5) seperti di DEPLOY.md.
 * - SSL: beberapa provider (mis. Supabase) butuh `ssl: { rejectUnauthorized: false }`
 *   bila muncul error sertifikat setelah upgrade.
 */
const adapter = new PrismaPg({
  // sslmode=require diterjemahkan ke verify-full (perilaku sama persis) supaya
  // tidak memunculkan SECURITY WARNING pg-connection-string di log tiap request.
  connectionString: normalizeSslMode(process.env.DATABASE_URL),
});

const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'info', 'warn', 'error']
    : ['error'],
});

export default prisma;
