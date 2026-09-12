import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io = null;

/**
 * Inisialisasi Socket.io di atas HTTP server Express.
 * Client harus mengirim JWT via auth: { token: '...' } saat connect.
 */
export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      credentials: true,
    },
  });

  // Autentikasi koneksi via JWT access token
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Unauthorized'));
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      socket.data.userId = decoded.userId;
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
