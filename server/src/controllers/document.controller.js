import prisma from '../config/database.js';
import ApiResponse from '../utils/apiResponse.js';
import { createNotification } from '../services/notification.service.js';
import { streamStoredFile, destroyStoredFile } from '../utils/fileStorage.js';
import { safeOriginalName } from '../middlewares/upload.middleware.js';
import { auditLog } from '../services/audit.service.js';

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

  /**
   * POST /api/documents — upload dokumen (field: document, body: type).
   *
   * Field `type` sudah divalidasi ZOD SEBELUM Cloudinary
   * dipanggil (lihat routes/document.routes.js).
   *
   * REPLACE AMAN (P0): satu dokumen aktif per tipe.
   *   1. upload file baru (sudah terjadi di persistUpload);
   *   2. buat record baru;
   *   3. tandai/hapus record lama;
   *   4. bila langkah 2/3 gagal → pertahankan record lama
   *      dan hapus asset baru (rollback).
   */
  upload: async (req, res) => {
    try {
      const { type } = req.validatedData;
      if (!req.file) return ApiResponse.error(res, 'File dokumen wajib diupload', 400);

      const fileUrl = `/uploads/${req.file.filename}`;

      // Cari dokumen aktif lama bertipe sama (untuk diganti).
      const oldDocs = await prisma.document.findMany({
        where: { userId: req.user.id, type },
        select: { id: true, fileUrl: true },
      });

      let document;
      try {
        document = await prisma.document.create({
          data: {
            userId: req.user.id,
            type,
            fileUrl,
            // Nama asli dari client dinormalisasi (hanya untuk tampilan).
            fileName: safeOriginalName(req.file.originalname),
          },
        });

        // Record baru berhasil → nonaktifkan record lama.
        if (oldDocs.length > 0) {
          await prisma.document.deleteMany({
            where: { id: { in: oldDocs.map((d) => d.id) } },
          });
          // Bersihkan asset lama (best-effort) — cegah orphan.
          for (const old of oldDocs) {
            if (old.fileUrl && old.fileUrl !== fileUrl) {
              destroyStoredFile(old.fileUrl).catch(() => {});
            }
          }
        }
      } catch (error) {
        // Gagal membuat/hapus record → pertahankan record lama,
        // hapus asset baru agar tidak orphan.
        await destroyStoredFile(fileUrl).catch(() => {});
        throw error;
      }

      return ApiResponse.created(res, document, 'Dokumen berhasil diupload, menunggu verifikasi admin');
    } catch (error) {
      console.error('Upload document error:', error?.message || error);
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

      auditLog(req, 'admin', 'document.verify', {
        documentId: document.id,
        userId: document.user.id,
        type: document.type,
        status: updated.status,
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
