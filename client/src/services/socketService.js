import { io } from 'socket.io-client';
import { API_BASE_URL, ENABLE_SOCKET } from './config';

const SOCKET_URL = API_BASE_URL || undefined; // undefined → same-origin

let socket = null;

/**
 * Ambil socket singleton. Membuat koneksi baru saat pertama dipanggil,
 * atau reuse koneksi yang sudah ada (auth selalu diperbarui dengan token
 * terbaru, misal setelah refresh token).
 *
 * Kembali null bila socket dinonaktifkan (production di Vercel) — semua
 * pemanggil harus menganggap null adalah kondisi normal (polling fallback).
 */
export const getSocket = () => {
  if (!ENABLE_SOCKET) return null;

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

/** Status socket aktif/tidak (untuk UI status realtime). */
export const isSocketEnabled = () => ENABLE_SOCKET;

export default { getSocket, resetSocket, isSocketEnabled };
