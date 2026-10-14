import fs from 'fs/promises';
import path from 'path';
import cron from 'node-cron';
import { fileURLToPath } from 'url';
import prisma from '../config/database.js';
import { UPLOADS_DIR, storedNameFromPublicId } from '../utils/fileStorage.js';
import { hasCloudinaryCredentials } from '../utils/credentials.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File lebih muda dari usia ini dianggap "masih dalam proses upload"
// (mis. user sedang mengisi form), jadi tidak disentuh.
const MIN_AGE_MS = 24 * 60 * 60 * 1000; // 24 jam

/** Kumpulkan semua nama file `/uploads/xxx` yang masih direferensikan di DB. */
const collectReferencedFiles = async () => {
  const [deposits, documents] = await Promise.all([
    prisma.deposit.findMany({ where: { proofImage: { not: null } }, select: { proofImage: true } }),
    prisma.document.findMany({ select: { fileUrl: true } }),
  ]);

  const referenced = new Set();
  for (const d of deposits) {
    if (d.proofImage) referenced.add(path.basename(d.proofImage));
  }
  for (const d of documents) {
    if (d.fileUrl) referenced.add(path.basename(d.fileUrl));
  }
  return referenced;
};

/**
 * Hapus asset Cloudinary yatim (mode Cloudinary / Vercel).
 * Asset di-upload dengan type "authenticated" + prefix public_id "tuu-",
 * jadi pembersihan bisa menyasar prefix itu tanpa menyentuh asset lain.
 */
const cleanupCloudinaryOrphans = async (referenced) => {
  let deleted = 0;
  let errors = 0;

  // Referensi DB disimpan sebagai nama berkas BER-ekstensi
  // (`proof-<uuid>.png`), sedangkan public_id Cloudinary tidak memuat ekstensi.
  // Normalisasi keduanya ke bentuk tanpa ekstensi supaya aset yang MASIH
  // direferensikan tidak pernah ikut terhapus.
  const referencedNames = new Set([...referenced].map((name) => name.replace(/\.[^.]+$/, '')));

  // Lewati bila Cloudinary tidak terkonfigurasi (mode disk lokal) —
  // import + search dengan kredensial palsu hanya menghasilkan noise error.
  const { CLOUDINARY_ENABLED } = await import('../config/cloudinary.js');
  if (!CLOUDINARY_ENABLED) {
    return { deleted: 0, errors: 0, skipped: true };
  }

  // DRY_RUN=true: tampilkan kandidat tanpa menghapus apa pun.
  const isDryRun = String(process.env.DRY_RUN ?? '').trim().toLowerCase() === 'true';
  if (isDryRun) {
    console.log('🔍 DRY_RUN=true — cleanup Cloudinary dalam mode preview (tidak ada yang dihapus)');
  }

  try {
    const { v2: cloudinary } = await import('cloudinary');

    // Pagination cursor-based menggantikan max_results(500) — semua asset diproses.
    // Cleanup HANYA menyentuh namespace `tuu-*` milik aplikasi ini.
    let nextCursor;
    let totalCandidates = 0;

    do {
      const searchBuilder = cloudinary.search
        .expression('resource_type:image AND type:authenticated AND public_id:tuu-*')
        .max_results(100);

      if (nextCursor) searchBuilder.next_cursor(nextCursor);

      const result = await searchBuilder.execute();
      const resources = result?.resources || [];
      nextCursor = result?.next_cursor;

      for (const resource of resources) {
        // public_id "tuu-proof-<uuid>" ↔ nama berkas DB "proof-<uuid>.png".
        const storedName = storedNameFromPublicId(resource.public_id);
        if (!storedName) continue;
        if (referencedNames.has(storedName)) continue;

        totalCandidates += 1;
        // Hanya public_id (namespace aman) — tidak pernah berisi PII.
        console.log(`🗑️  Kandidat orphan: ${resource.public_id}`);

        if (isDryRun) continue; // DRY_RUN: skip penghapusan

        try {
          await cloudinary.uploader.destroy(resource.public_id, {
            resource_type: 'image',
            type: 'authenticated',
            invalidate: true,
          });
          deleted += 1;
        } catch {
          errors += 1;
        }
      }
    } while (nextCursor);

    if (isDryRun) {
      console.log(`🔍 DRY_RUN: ${totalCandidates} asset kandidat orphan (tidak ada yang dihapus)`);
      return { deleted: 0, errors: 0, candidates: totalCandidates, dryRun: true };
    }
  } catch (error) {
    console.error('❌ Cleanup Cloudinary gagal:', error.message);
    errors += 1;
  }

  return { deleted, errors };
};

/**
 * Hapus file yatim di folder uploads disk (mode disk lokal): ada di folder
 * tapi tidak direferensikan deposit.proofImage maupun document.fileUrl,
 * dan berusia > 24 jam.
 */
const cleanupDiskOrphans = async (referenced) => {
  let deleted = 0;
  let errors = 0;

  try {
    const entries = await fs.readdir(UPLOADS_DIR);
    const now = Date.now();

    for (const name of entries) {
      try {
        const full = path.join(UPLOADS_DIR, name);
        const stat = await fs.stat(full);
        if (!stat.isFile()) continue;
        if (now - stat.mtimeMs < MIN_AGE_MS) continue; // terlalu muda, lewati
        if (referenced.has(name)) continue; // masih dipakai DB

        await fs.unlink(full);
        deleted += 1;
      } catch {
        errors += 1;
      }
    }
  } catch (error) {
    console.error('❌ Cleanup uploads gagal:', error.message);
    errors += 1;
  }

  return { deleted, errors };
};

/**
 * Jalankan sekali penuh: kumpulkan referensi DB lalu bersihkan penyimpanan
 * aktif. Dipanggil Vercel Cron via GET /api/cron/cleanup (lihat
 * routes/cron.routes.js + vercel.json), atau node-cron di lokal.
 */
export const runDailyCleanup = async () => {
  console.log('🧹 Menjalankan cleanup file upload yatim...');
  const referenced = await collectReferencedFiles();

  const results = {};
  if (hasCloudinaryCredentials()) {
    results.cloudinary = await cleanupCloudinaryOrphans(referenced);
    console.log(
      `🧹 Cloudinary: ${results.cloudinary.deleted} asset dihapus, ${results.cloudinary.errors} error`
    );
  }
  results.disk = await cleanupDiskOrphans(referenced);
  if (results.disk.deleted > 0 || results.disk.errors > 0) {
    console.log(`🧹 Disk: ${results.disk.deleted} file dihapus, ${results.disk.errors} error`);
  }

  return results;
};

const setupCleanupCron = () => {
  // Setiap hari pukul 03:00 pagi (di luar jam sibuk) — hanya relevan saat
  // server long-running; di Vercel dipicu Vercel Cron.
  cron.schedule('0 3 * * *', () => {
    runDailyCleanup().catch(() => {});
  });
  console.log('📅 Cron cleanup uploads: aktif setiap hari pukul 03:00');
};

export default setupCleanupCron;
