/**
 * Base URL backend.
 *
 * - Kosong (default) → same-origin. Ini yang dipakai di Vercel: client dan
 *   API berada di satu domain, jadi request ke `/api/...` relative.
 * - Isi `VITE_API_URL` di build (mis. `https://api.domain.com`) bila backend
 *   di-host terpisah.
 * - Di development, Vite mem-proxy `/api` dan `/socket.io` ke
 *   `http://localhost:5000` (lihat vite.config.js), jadi tidak perlu .env.
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const API_URL = `${API_BASE_URL}/api`;

/**
 * Socket.io realtime.
 *
 * Tidak didukung di serverless (Vercel), jadi default:
 * - development  : aktif (server lokal Express+socket.io)
 * - production   : MATI — notifikasi tetap jalan via Web Push + polling 30s
 * - paksa aktif  : set VITE_ENABLE_SOCKET=true saat build (mis. backend
 *   pindah ke hosting yang mendukung WebSocket)
 */
export const ENABLE_SOCKET =
  import.meta.env.VITE_ENABLE_SOCKET === 'true' ||
  (import.meta.env.VITE_ENABLE_SOCKET === undefined && import.meta.env.DEV);

export default { API_BASE_URL, API_URL, ENABLE_SOCKET };
