import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';
import ApiResponse from '../utils/apiResponse.js';

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ApiResponse.error(res, 'Token tidak ditemukan', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) return ApiResponse.error(res, 'User tidak ditemukan', 401);
    if (!user.isActive) return ApiResponse.error(res, 'Akun dinonaktifkan', 403);

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return ApiResponse.error(res, 'Token expired', 401);
    }
    return ApiResponse.error(res, 'Token tidak valid', 401);
  }
};

export default authenticate;