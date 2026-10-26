import axios from 'axios';
import { resetSocket } from './socketService';
import { API_URL } from './config';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor Request: Otomatis pasang JWT Access Token di header Authorization
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Single-flight refresh.
 *
 * Refresh token di-rotasi setiap kali dipakai (token lama langsung tidak
 * berlaku). Sebelumnya tiap request yang kena 401 memanggil /refresh-token
 * sendiri-sendiri, sehingga saat beberapa request berjalan paralel (dashboard
 * memuat 5 endpoint sekaligus) refresh kedua dst. memakai token yang sudah
 * dirotasi → gagal → user ter-logout sendiri secara acak.
 *
 * Dengan promise bersama ini, semua request yang kena 401 menunggu SATU
 * panggilan refresh dan memakai access token hasilnya.
 */
let refreshPromise = null;

const runRefresh = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    const err = new Error('Refresh token tidak tersedia');
    err.isMissingRefreshToken = true;
    throw err;
  }

  const res = await axios.post(`${API_URL}/auth/refresh-token`, { refreshToken });
  const { accessToken, refreshToken: newRefreshToken } = res.data.data.tokens;

  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', newRefreshToken);

  return accessToken;
};

/**
 * Minta access token baru (single-flight). Dipakai juga saat bootstrap sesi
 * di authStore ketika access token sudah kedaluwarsa.
 */
export const refreshAccessToken = () => {
  if (!refreshPromise) {
    refreshPromise = runRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
};

// Halaman yang memang butuh login — hanya di sini redirect paksa masuk akal.
// Dari landing/login, sesi yang habis cukup membuat UI kembali ke mode guest.
const PROTECTED_PATHS = ['/dashboard', '/profile', '/admin'];

const forceLogout = () => {
  resetSocket();
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');

  const { pathname } = window.location;
  if (PROTECTED_PATHS.some((path) => pathname.startsWith(path))) {
    window.location.href = '/login';
  }
};

// Interceptor Response: Handle token expired (401) dan refresh token otomatis
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const canRetry = originalRequest && !originalRequest._retry;

    if (error.response?.status !== 401 || !canRetry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    // Tidak ada refresh token sama sekali → tidak ada yang bisa dipulihkan.
    if (!refreshPromise && !localStorage.getItem('refreshToken')) {
      return Promise.reject(error);
    }

    try {
      const accessToken = await refreshAccessToken();
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      forceLogout();
      return Promise.reject(refreshError);
    }
  }
);

export default api;
