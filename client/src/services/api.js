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

const forceLogout = () => {
  resetSocket();
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  window.location.href = '/login';
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

    // Hanya pembuat promise pertama yang memanggil API; sisanya menunggu.
    if (!refreshPromise) {
      refreshPromise = runRefresh().finally(() => {
        refreshPromise = null;
      });
    }

    try {
      const accessToken = await refreshPromise;
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      forceLogout();
      return Promise.reject(refreshError);
    }
  }
);

export default api;
