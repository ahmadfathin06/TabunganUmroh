import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

let socket = null;

/**
 * Ambil socket singleton. Membuat koneksi baru saat pertama dipanggil,
 * atau reuse koneksi yang sudah ada (auth selalu diperbarui dengan token
 * terbaru, misal setelah refresh token).
 */
export const getSocket = () => {
  const token = localStorage.getItem('accessToken');
  if (!token) return null;

  if (socket) {
    socket.auth = { token };
    if (!socket.connected) socket.connect();
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });

  return socket;
};

/** Disconnect & reset (dipakai saat logout / token invalid). */
export const resetSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export default { getSocket, resetSocket };
