import prisma from '../config/database.js';
import ApiResponse from '../utils/apiResponse.js';
import { getPagination } from '../utils/paginationHelper.js';

// Prisma stores features as a JSON string; the client expects an array.
const parseFeatures = (pkg) => {
  if (!pkg) return pkg;
  let features = pkg.features;
  if (typeof features === 'string') {
    try {
      features = JSON.parse(features);
    } catch {
      features = null;
    }
  }
  return { ...pkg, features: Array.isArray(features) ? features : null };
};

const packageController = {
  getAll: async (req, res) => {
    try {
      const { page, limit, status } = req.query;
      const { skip, take, page: p, limit: l } = getPagination(page, limit);

      const where = {};
      if (status) where.status = status.toUpperCase();

      const [packages, total] = await Promise.all([
        prisma.umrohPackage.findMany({ where, orderBy: { departureDate: 'asc' }, skip, take }),
        prisma.umrohPackage.count({ where }),
      ]);

      return ApiResponse.paginated(res, packages.map(parseFeatures), { page: p, limit: l, total });
    } catch (error) {
      return ApiResponse.error(res, 'Gagal mengambil data paket');
    }
  },

  getBySlug: async (req, res) => {
    try {
      const pkg = await prisma.umrohPackage.findUnique({ where: { slug: req.params.slug } });
      if (!pkg) return ApiResponse.error(res, 'Paket tidak ditemukan', 404);
      return ApiResponse.success(res, parseFeatures(pkg));
    } catch (error) {
      return ApiResponse.error(res, 'Gagal mengambil detail paket');
    }
  },

  create: async (req, res) => {
    try {
      const data = req.validatedData;
      const slug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();

      const pkg = await prisma.umrohPackage.create({
        data: {
          ...data,
          slug,
          departureDate: new Date(data.departureDate),
          quotaRemaining: data.quota,
          features: data.features ? JSON.stringify(data.features) : undefined,
        },
      });

      return ApiResponse.created(res, pkg, 'Paket berhasil dibuat');
    } catch (error) {
      console.error('Create package error:', error);
      return ApiResponse.error(res, 'Gagal membuat paket');
    }
  },

  update: async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;

      const existing = await prisma.umrohPackage.findUnique({ where: { id } });
      if (!existing) return ApiResponse.error(res, 'Paket tidak ditemukan', 404);

      if (data.departureDate) data.departureDate = new Date(data.departureDate);
      if (Array.isArray(data.features)) data.features = JSON.stringify(data.features);

      const pkg = await prisma.umrohPackage.update({ where: { id }, data });
      return ApiResponse.success(res, pkg, 'Paket berhasil diupdate');
    } catch (error) {
      return ApiResponse.error(res, 'Gagal update paket');
    }
  },

  delete: async (req, res) => {
    try {
      const { id } = req.params;
      await prisma.umrohPackage.update({
        where: { id },
        data: { status: 'CLOSED' },
      });
      return ApiResponse.success(res, null, 'Paket berhasil ditutup');
    } catch (error) {
      return ApiResponse.error(res, 'Gagal menutup paket');
    }
  },
};

export default packageController;