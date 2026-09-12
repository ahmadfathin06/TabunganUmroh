import cron from 'node-cron';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '../uploads');

// File lebih muda dari usia ini dianggap "masih dalam proses upload"
// (mis. user sedang mengisi form), jadi tidak disentuh.
const MIN_AGE_MS = 24 * 60 * 60 * 1000; // 24 jam

/** Kumpulkan semua path file `/uploads/xxx` yang masih direferensikan di DB. */
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
 * Hapus file yatim: ada di folder uploads tapi tidak direferensikan
 * deposit.proofImage maupun document.fileUrl, dan berusia > 24 jam.
 */
export const cleanupOrphanUploads = async () => {
  let deleted = 0;
  let errors = 0;

  try {
    const entries = await fs.readdir(UPLOADS_DIR);
    const referenced = await collectReferencedFiles();
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

    if (deleted > 0 || errors > 0) {
      console.log(`🧹 Cleanup uploads: ${deleted} file yatim dihapus, ${errors} error`);
    }
    return { deleted, errors };
  } catch (error) {
    console.error('❌ Cleanup uploads gagal:', error.message);
    return { deleted, errors };
  }
};

const setupCleanupCron = () => {
  // Setiap hari pukul 03:00 pagi (di luar jam sibuk)
  cron.schedule('0 3 * * *', () => {
    console.log('🧹 Menjalankan cleanup file upload yatim...');
    cleanupOrphanUploads();
  });
  console.log('📅 Cron cleanup uploads: aktif setiap hari pukul 03:00');
};

export default setupCleanupCron;
