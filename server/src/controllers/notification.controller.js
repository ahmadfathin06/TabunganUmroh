import prisma from '../config/database.js';
import ApiResponse from '../utils/apiResponse.js';
import { getPagination } from '../utils/paginationHelper.js';
import { configureVapid, getVapidPublicKey, sendPushToUser } from '../services/push.service.js';

const VALID_TYPES = [
  'DEPOSIT_APPROVED',
  'DEPOSIT_REJECTED',
  'REMINDER',
  'ANNOUNCEMENT',
  'REFERRAL_BONUS',
  'DOCUMENT_VERIFIED',
  'CHAT_MESSAGE',
  'PAID_OFF',
];

const notificationController = {
  /**
   * GET /api/notifications/my
   * Query: ?page=1&limit=20&type=ANNOUNCEMENT&unread=true
   * Response: { notifications, unread, pagination }
   * - Tanpa query: perilaku lama (50 terbaru) tetap utuh untuk kompatibilitas client.
   */
  getMine: async (req, res) => {
    try {
      const { page, limit, type, unread } = req.query;
      const isPaged = page !== undefined || limit !== undefined || type !== undefined || unread !== undefined;

      const where = { userId: req.user.id };
      if (type) {
        const types = String(type)
          .split(',')
          .map((t) => t.trim().toUpperCase())
          .filter((t) => VALID_TYPES.includes(t));
        if (types.length > 0) where.type = { in: types };
      }
      if (unread === 'true' || unread === '1') where.isRead = false;

      const unreadCount = await prisma.notification.count({
        where: { userId: req.user.id, isRead: false },
      });

      // Mode kompatibilitas (tanpa query): 50 terbaru, tanpa pagination
      if (!isPaged) {
        const notifications = await prisma.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: 50,
        });
        return ApiResponse.success(res, { notifications, unread: unreadCount });
      }

      // Mode pagination
      const { skip, take, page: p, limit: l } = getPagination(page, limit);
      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
        prisma.notification.count({ where }),
      ]);

      return ApiResponse.paginated(res, { notifications, unread: unreadCount }, {
        total,
        page: p,
        limit: l,
      });
    } catch (error) {
      console.error('❌ Gagal mengambil notifikasi:', error);
      return ApiResponse.error(res, 'Gagal mengambil notifikasi', 500);
    }
  },

  markRead: async (req, res) => {
    try {
      const result = await prisma.notification.updateMany({
        where: { id: req.params.id, userId: req.user.id, isRead: false },
        data: { isRead: true },
      });

      if (result.count === 0) {
        return ApiResponse.error(res, 'Notifikasi tidak ditemukan', 404);
      }

      return ApiResponse.success(res, null, 'Notifikasi ditandai sebagai dibaca');
    } catch (error) {
      console.error('❌ Gagal update notifikasi:', error);
      return ApiResponse.error(res, 'Gagal update notifikasi', 500);
    }
  },

  getVapidPublicKey: (req, res) => {
    const publicKey = getVapidPublicKey();
    if (!publicKey) return ApiResponse.error(res, 'Web Push tidak tersedia', 503);
    return ApiResponse.success(res, { publicKey });
  },

  subscribe: async (req, res) => {
    try {
      const { endpoint, keys } = req.body || {};
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return ApiResponse.error(res, 'Data subscription tidak valid', 400);
      }

      await prisma.pushSubscription.upsert({
        where: { endpoint },
        create: {
          userId: req.user.id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          userAgent: req.headers['user-agent'] || null,
        },
        update: {
          userId: req.user.id,
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
      });

      return ApiResponse.created(res, null, 'Notifikasi browser berhasil diaktifkan');
    } catch (error) {
      console.error('❌ Gagal subscribe push:', error);
      return ApiResponse.error(res, 'Gagal mengaktifkan notifikasi browser', 500);
    }
  },

  unsubscribe: async (req, res) => {
    try {
      const { endpoint } = req.body || {};
      if (!endpoint) return ApiResponse.error(res, 'Endpoint wajib diisi', 400);

      await prisma.pushSubscription.deleteMany({
        where: { endpoint, userId: req.user.id },
      });

      return ApiResponse.success(res, null, 'Notifikasi browser dimatikan');
    } catch (error) {
      console.error('❌ Gagal unsubscribe push:', error);
      return ApiResponse.error(res, 'Gagal mematikan notifikasi browser', 500);
    }
  },

  sendTestPush: async (req, res) => {
    try {
      await sendPushToUser(req.user.id, {
        id: `test-${Date.now()}`,
        title: 'Tes Notifikasi 🔔',
        message: 'Alhamdulillah, notifikasi browser sudah aktif!',
        url: '/',
      });
      return ApiResponse.success(res, null, 'Tes push terkirim');
    } catch (error) {
      console.error('❌ Gagal kirim tes push:', error);
      return ApiResponse.error(res, 'Gagal kirim tes push', 500);
    }
  },

  markAllRead: async (req, res) => {
    try {
      await prisma.notification.updateMany({
        where: { userId: req.user.id, isRead: false },
        data: { isRead: true },
      });

      return ApiResponse.success(res, null, 'Semua notifikasi dibaca');
    } catch (error) {
      console.error('❌ Gagal update notifikasi:', error);
      return ApiResponse.error(res, 'Gagal update notifikasi', 500);
    }
  },
};

export default notificationController;