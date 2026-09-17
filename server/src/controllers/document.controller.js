import prisma from '../config/database.js';
import ApiResponse from '../utils/apiResponse.js';
import { createNotification } from '../services/notification.service.js';
import { streamStoredFile } from '../utils/fileStorage.js';
import { safeOriginalName } from '../middlewares/upload.middleware.js';

const TYPE_LABEL = { KTP: 'KTP', PASSPORT: 'Paspor', PHOTO: 'Pas foto', OTHER: 'Dokumen' };

const documentController = {
  // ============ USER ============

  /** GET /api/documents/my — daftar dokumen milik user login */
  getMine: async (req, res) => {
    try {
      const documents = await prisma.document.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
      });
      return ApiResponse.success(res, documents);
    } catch (error) {
      console.error('Get my documents error:', error);
      return ApiResponse.error(res, 'Gagal mengambil data dokumen');
    }
  },

  /** POST /api/documents — upload dokumen (field: document, body: type) */
  upload: async (req, res) => {
    try {
      const { type } = req.validatedData;
      if (!req.file) return ApiResponse.error(res, 'File dokumen wajib diupload', 400);

      // Satu dokumen aktif per tipe: dokumen lama bertipe sama dihapus (file fisik dibiarkan)
      await prisma.document.deleteMany({
        where: { userId: req.user.id, type },
      });

      const document = await prisma.document.create({
        data: {
          userId: req.user.id,
          type,
          fileUrl: `/uploads/${req.file.filename}`,
          // Nama asli dari client dinormalisasi (hanya untuk tampilan).
          fileName: safeOriginalName(req.file.originalname),
        },
      });

      return ApiResponse.created(res, document, 'Dokumen berhasil diupload, menunggu verifikasi admin');
    } catch (error) {
      console.error('Upload document error:', error);
      return ApiResponse.error(res, 'Gagal upload dokumen');
    }
  },

  /**
   * GET /api/documents/:id/file — ambil berkas dokumen (KTP/paspor).
   *
   * Dokumen hanya boleh diakses pemiliknya atau admin. Sebelumnya berkas ini
   * disajikan express.static tanpa autentikasi sama sekali.
   */
  getFile: async (req, res) => {
    try {
      const document = await prisma.document.findUnique({ where: { id: req.params.id } });
      if (!document) return ApiResponse.error(res, 'Dokumen tidak ditemukan', 404);

      const isOwner = document.userId === req.user.id;
      const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';
      if (!isOwner && !isAdmin) return ApiResponse.error(res, 'Akses ditolak', 403);

      return streamStoredFile(document.fileUrl, res);
    } catch (error) {
      console.error('Get document file error:', error);
      return ApiResponse.error(res, 'Gagal mengambil berkas dokumen');
    }
  },

  // ============ ADMIN ============

  /** GET /api/documents — semua dokumen (admin) */
  getAll: async (req, res) => {
    try {
      const { status } = req.query;
      const where = status ? { status: status.toUpperCase() } : {};

      const documents = await prisma.document.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      });
      return ApiResponse.success(res, documents);
    } catch (error) {
      console.error('Get all documents error:', error);
      return ApiResponse.error(res, 'Gagal mengambil data dokumen');
    }
  },

  /** PUT /api/documents/:id/verify — approve/reject + notifikasi DOCUMENT_VERIFIED */
  verify: async (req, res) => {
    try {
      const { id } = req.params;
      const { action, rejectionReason } = req.validatedData;

      const document = await prisma.document.findUnique({
        where: { id },
        include: { user: { select: { id: true, name: true } } },
      });
      if (!document) return ApiResponse.error(res, 'Dokumen tidak ditemukan', 404);
      if (document.status !== 'PENDING') {
        return ApiResponse.error(res, 'Dokumen sudah diverifikasi sebelumnya', 400);
      }

      if (action === 'reject' && !rejectionReason?.trim()) {
        return ApiResponse.error(res, 'Alasan penolakan wajib diisi', 400);
      }

      const updated = await prisma.document.update({
        where: { id },
        data: {
          status: action === 'approve' ? 'VERIFIED' : 'REJECTED',
          verifiedAt: new Date(),
          ...(action === 'reject' && { rejectionReason: rejectionReason.trim() }),
        },
      });

      // Notifikasi DOCUMENT_VERIFIED (realtime + Web Push)
      await createNotification(document.user.id, {
        title: action === 'approve' ? 'Dokumen Terverifikasi ✅' : 'Dokumen Ditolak ❌',
        message:
          action === 'approve'
            ? `Alhamdulillah, ${TYPE_LABEL[document.type] || 'dokumen'} Anda telah diverifikasi dan dinyatakan valid.`
            : `${TYPE_LABEL[document.type] || 'Dokumen'} Anda ditolak. Alasan: ${rejectionReason.trim()}`,
        type: 'DOCUMENT_VERIFIED',
        metadata: { documentId: document.id, status: updated.status },
      });

      return ApiResponse.success(res, updated, 'Verifikasi dokumen berhasil');
    } catch (error) {
      console.error('Verify document error:', error);
      return ApiResponse.error(res, 'Gagal memverifikasi dokumen');
    }
  },
};

export default documentController;
