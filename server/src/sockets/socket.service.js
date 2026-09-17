import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';

let io = null;

/**
 * Inisialisasi Socket.io di atas HTTP server Express.
 * Client harus mengirim JWT via auth: { token: '...' } saat connect.
 */
export const initSocket = (httpServer) => {
  const allowedOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  io = new Server(httpServer, {
    cors: {
      // Tanpa fallback '*' — itu membuka koneksi realtime dari situs mana pun.
      origin: allowedOrigins.length > 0 ? allowedOrigins : false,
      credentials: true,
    },
  });

  // Autentikasi koneksi via JWT access token
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Unauthorized'));

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

      // Access token lama milik user yang sudah dinonaktifkan tidak boleh
      // tetap terhubung dan menerima notifikasi realtime.
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, isActive: true },
      });
      if (!user || !user.isActive) return next(new Error('Unauthorized'));

      socket.data.userId = user.id;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    socket.join(`user:${userId}`);
    console.log(`🔌 Socket connected: user ${userId}`);

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: user ${userId}`);
    });
  });

  console.log('⚡ Socket.io siap');
  return io;
};

export const getIO = () => io;

/** Emit event ke satu user (semua tab/device yang login). */
export const emitToUser = (userId, event, payload) => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
};

export default { initSocket, getIO, emitToUser };
