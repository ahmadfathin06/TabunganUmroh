import { getCloudinaryStatus } from '../config/cloudinary.js';
import { getEmailStatus } from '../config/mailer.js';

/**
 * Susun laporan health check.
 *
 * Dipisah dari route agar logika "OK vs DEGRADED" bisa diuji langsung dengan
 * klien database palsu (termasuk kasus database gagal) tanpa perlu memutus
 * koneksi sungguhan.
 *
 * Laporan TIDAK memuat kredensial, nama tabel, atau pesan error mentah —
 * aman untuk endpoint publik.
 *
 * @param {{$queryRaw: Function}} db klien Prisma
 * @returns {Promise<{healthy: boolean, dbError: Error|null, report: object}>}
 */
export const buildHealthReport = async (db, { now = () => new Date(), uptime = () => process.uptime() } = {}) => {
  let database = 'OK';
  let dbError = null;

  try {
    await db.$queryRaw`SELECT 1`;
  } catch (error) {
    database = 'ERROR';
    dbError = error;
  }

  const healthy = database === 'OK';

  return {
    healthy,
    dbError,
    report: {
      status: healthy ? 'OK' : 'DEGRADED',
      database,
      cloudinary: getCloudinaryStatus(),
      email: getEmailStatus(),
      timestamp: now().toISOString(),
      uptime: uptime(),
    },
  };
};

export default { buildHealthReport };
