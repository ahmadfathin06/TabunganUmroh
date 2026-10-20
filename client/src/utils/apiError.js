/**
 * Ambil pesan error yang bisa ditampilkan ke user dari respons API.
 *
 * Latar belakang (bug 422 "Validasi gagal"): server membalas 422 dengan
 * array `errors` berisi field + alasannya, tapi client lama hanya membaca
 * `data.message` yang isinya generik — user melihat "Validasi gagal" tanpa
 * tahu field mana yang salah. Fungsi ini memakai detail per field bila
 * tersedia, dan jatuh ke pesan umum bila tidak.
 */
export const extractApiError = (err, fallback = 'Terjadi kesalahan') => {
  const data = err?.response?.data;
  const list = Array.isArray(data?.errors) ? data.errors.filter((e) => e && e.message) : [];

  if (list.length > 0) {
    return list
      .map((e) => (e.label || e.field ? `${e.label || e.field}: ${e.message}` : e.message))
      .join(' • ');
  }

  if (data?.message) return data.message;

  const status = err?.response?.status;
  if (status === 401) return 'Sesi Anda sudah habis. Silakan masuk kembali.';
  if (status === 403) return 'Anda tidak punya akses ke tindakan ini.';
  if (status === 429) return 'Terlalu banyak permintaan. Coba lagi sebentar lagi.';
  if (err?.message === 'Network Error') return 'Koneksi ke server terputus. Periksa jaringan Anda.';

  return fallback;
};

/**
 * Petakan array `errors` dari server ke bentuk { field: message } supaya bisa
 * ditampilkan inline di bawah input yang bermasalah.
 */
export const extractApiFieldErrors = (err) => {
  const list = Array.isArray(err?.response?.data?.errors) ? err.response.data.errors : [];
  const mapped = {};
  for (const item of list) {
    if (item?.field && item?.message) mapped[item.field] = item.message;
  }
  return mapped;
};
