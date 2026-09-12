import prisma from '../config/database.js';
import ApiResponse from '../utils/apiResponse.js';

const bankAccountController = {
  getActiveOnes: async (req, res) => {
    try {
      const accounts = await prisma.bankAccount.findMany({
        where: { isActive: true },
        select: {
          id: true,
          bankName: true,
          accountNumber: true,
          accountHolder: true,
          bankLogo: true,
        },
        orderBy: { createdAt: 'asc' },
      });
      return ApiResponse.success(res, accounts);
    } catch (error) {
      console.error('Get bank accounts error:', error);
      return ApiResponse.error(res, 'Gagal mengambil data rekening bank');
    }
  },
};

export default bankAccountController;