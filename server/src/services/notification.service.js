import prisma from '../config/database.js';
import { sendPushToUser } from './push.service.js';
import { emitToUser } from '../sockets/socket.service.js';

/**
 * Satu pintu untuk membuat notifikasi:
 * 1. Simpan ke database
 * 2. Emit realtime via socket.io (badge & daftar update tanpa polling)
 * 3. Kirim Web Push ke semua device user (fire-and-forget)
 *
 * @param {string|string[]} userIds - satu atau banyak user
 * @param {{ title: string, message: string, type: string, url?: string, metadata?: object }} payload
 * @returns {Promise<number>} jumlah notifikasi yang berhasil dibuat
 */
export const createNotification = async (userIds, { title, message, type, url, metadata }) => {
  const ids = Array.isArray(userIds) ? userIds : [userIds];
  if (ids.length === 0) return 0;

  const rows = ids.map((userId) => ({
    userId,
    title,
    message,
    type,
    ...(metadata !== undefined && { metadata: JSON.stringify(metadata) }),
  }));

  const created = await prisma.notification.createManyAndReturn({ data: rows });

  for (const notification of created) {
    emitToUser(notification.userId, 'notification:new', notification);
    sendPushToUser(notification.userId, { ...notification, url }).catch(() => {});
  }

  return created.length;
};

/**
 * Notifikasi ke semua user dengan role tertentu (default: semua jamaah aktif).
 */
export const createNotificationForAll = async ({ role = 'USER', ...payload }) => {
  const users = await prisma.user.findMany({
    where: { role, isActive: true },
    select: { id: true },
  });
  return createNotification(users.map((u) => u.id), payload);
};

/**
 * Helper kecil: buat payload standar dari objek notifikasi yang sudah ada di DB
 * (dipakai kode lama yang masih membuat notifikasi manual).
 */
export const notify = async (userId, notification) => {
  emitToUser(userId, 'notification:new', notification);
  sendPushToUser(userId, notification).catch(() => {});
};

export default { createNotification, createNotificationForAll, notify };
