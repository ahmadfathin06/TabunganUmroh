import crypto from 'crypto';
import prisma from '../config/database.js';

/**
 * Generator kode unik transfer (3 digit).
 *
 * SEBELUMNYA memakai `Math.random()` — tidak kriptografis dan
 * memiliki fallback acak tanpa pengecekan (bisa mengembalikan
 * kode yang sudah dipakai).
 *
 * Sekarang:
 *   - `crypto.randomInt` (CSPRNG);
 *   - retry hingga 20x menghindari tabrakan dengan setoran
 *     PENDING lain;
 *   - TIDAK ada fallback acak tanpa pengecekan — bila semua
 *     percobaan tabrakan, lempar error (dipanggil dalam
 *     konteks yang menangani error).
 *
 * CATATAN: `uniqueCode` sengaja TIDAK unik global (satu kode
 * transfer 3 digit dipakai banyak setoran di waktu berbeda);
 * pengecekan hanya menghindari kebetulan sama dengan setoran
 * PENDING aktif agar tidak membingungkan pencocokan transfer.
 */
const MAX_ATTEMPTS = 20;

const randomCode = () => crypto.randomInt(100, 1000);

export const generateUniqueCode = async () => {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const code = randomCode();
    const used = await prisma.deposit.findFirst({
      where: { uniqueCode: code, status: { in: ['PENDING'] } },
      select: { id: true },
    });
    if (!used) return code;
  }
  throw new Error('Tidak dapat menghasilkan kode unik transfer');
};

export default generateUniqueCode;
