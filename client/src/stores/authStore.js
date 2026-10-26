import { create } from 'zustand';
import api from '../services/api';
import { resetSocket } from '../services/socketService';
import { extractApiError } from '../utils/apiError';

/**
 * Baca JSON dari localStorage secara aman. Jika data corrupt atau
 * di-tamper (misal oleh extension), app tidak crash.
 */
const safeGetJSON = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
};

/* --------------------------------------------------------------------------
 * Sesi tersimpan (persistent login)
 *
 * Token disimpan di localStorage, jadi saat web dibuka lagi user TIDAK perlu
 * login ulang selama refresh token masih berlaku. Access token hanya 15 menit,
 * jadi kalau sudah kedaluwarsa kita minta yang baru lewat refresh token.
 * ------------------------------------------------------------------------ */
const hasStoredSession = () =>
  Boolean(localStorage.getItem('accessToken') || localStorage.getItem('refreshToken'));

const clearStoredSession = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

// StrictMode (React 18 dev) memanggil effect dua kali — pastikan bootstrap
// sesi hanya berjalan sekali dan pemanggil kedua menunggu promise yang sama.
let initPromise = null;

export const useAuthStore = create((set) => ({
  user: safeGetJSON('user'),
  // Percaya refresh token juga, bukan hanya access token: access token cepat
  // kedaluwarsa, tapi sesi tetap dianggap aktif sampai refresh-nya gagal.
  isAuthenticated: hasStoredSession(),
  isInitialized: false,
  isLoading: false,

  /**
   * Restore sesi saat aplikasi pertama kali dibuka.
   * - Tanpa token → guest.
   * - Access token hilang/kedaluwarsa → refresh dulu, lalu ambil profil terbaru.
   * - Refresh gagal → bersihkan sesi (tanpa memaksa redirect dari halaman publik).
   */
  initialize: () => {
    if (initPromise) return initPromise;

    initPromise = (async () => {
      if (!hasStoredSession()) {
        set({ user: null, isAuthenticated: false, isInitialized: true });
        return;
      }

      try {
        const res = await api.get('/auth/me');
        const user = res.data.data;
        localStorage.setItem('user', JSON.stringify(user));
        set({ user, isAuthenticated: true, isInitialized: true });
      } catch {
        // Interceptor sudah mencoba refresh token. Kalau tetap gagal, sesi
        // memang tidak valid lagi → jadikan guest.
        if (!hasStoredSession()) set({ user: null, isAuthenticated: false });
        set({ isInitialized: true });
      }
    })().finally(() => {
      initPromise = null;
    });

    return initPromise;
  },

  login: async (identifier, password) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/auth/login', { identifier, password });
      const { user, tokens } = res.data.data;

      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      set({ user, isAuthenticated: true, isLoading: false });
      return { success: true, user };
    } catch (error) {
      set({ isLoading: false });
      return {
        success: false,
        message: extractApiError(error, 'Login gagal'),
      };
    }
  },

  register: async (formData) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/auth/register', formData);
      const { user, tokens } = res.data.data;

      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      set({ user, isAuthenticated: true, isLoading: false });
      return { success: true, user };
    } catch (error) {
      set({ isLoading: false });
      return {
        success: false,
        message: extractApiError(error, 'Registrasi gagal'),
        errors: error.response?.data?.errors || null,
      };
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error(err);
    } finally {
      // Putuskan koneksi realtime agar socket tidak menggantung
      // dengan token user lama setelah logout.
      resetSocket();
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      set({ user: null, isAuthenticated: false });
    }
  },

  updateUser: (userData) => {
    const stored = safeGetJSON('user') || {};
    const updated = { ...stored, ...userData };
    localStorage.setItem('user', JSON.stringify(updated));
    set({ user: updated });
  },
}));