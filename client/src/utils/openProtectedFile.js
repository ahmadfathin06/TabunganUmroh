import { toast } from 'react-hot-toast';
import api from '../services/api';

/**
 * Buka berkas privat (KTP, paspor, bukti transfer).
 *
 * Berkas tidak lagi dilayani sebagai static asset publik, jadi harus diambil
 * lewat endpoint API yang memeriksa kepemilikan/admin. `<a href>` tidak bisa
 * mengirim header Authorization, sehingga berkas diambil sebagai blob lalu
 * dibuka lewat object URL.
 *
 * @param {string} path contoh: `/documents/<id>/file` atau `/deposits/<id>/proof`
 */
export const openProtectedFile = async (path) => {
  try {
    const res = await api.get(path, { responseType: 'blob' });
    const objectUrl = URL.createObjectURL(res.data);

    const opened = window.open(objectUrl, '_blank', 'noopener,noreferrer');
    if (!opened) {
      // Popup diblokir browser — fallback ke unduhan.
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = '';
      document.body.appendChild(link);
      link.click();
      link.remove();
    }

    // Object URL dibersihkan setelah cukup lama agar tab baru sempat memuatnya.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  } catch (err) {
    let message = err.response?.data?.message || 'Gagal membuka berkas';
    const data = err.response?.data;

    // Respons error ikut ter-unduh sebagai blob, jadi pesannya dibaca manual.
    if (data instanceof Blob) {
      try {
        const parsed = JSON.parse(await data.text());
        message = parsed?.message || message;
      } catch {
        /* biarkan pesan default */
      }
    }

    toast.error(message);
  }
};

export default openProtectedFile;
