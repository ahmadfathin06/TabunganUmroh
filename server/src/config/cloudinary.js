import { v2 as cloudinary } from 'cloudinary';
import { hasCloudinaryCredentials } from '../utils/credentials.js';

/**
 * Cloudinary HANYA dikonfigurasi bila ketiga kredensial benar-benar terisi
 * (bukan nilai contoh `.env.example` seperti `your_cloud_name`).
 *
 * Kalau placeholder dianggap valid, upload mencoba ke Cloudinary dengan
 * kredensial palsu → error "Must supply api_key" → seluruh upload bukti/dokumen
 * gagal 500 walau mode disk lokal tersedia.
 */
export const CLOUDINARY_ENABLED = hasCloudinaryCredentials();

if (CLOUDINARY_ENABLED) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

/**
 * Status konfigurasi aman untuk health check — TIDAK pernah mengembalikan
 * nilai cloud name/key/secret, hanya status terkonfigurasi atau tidak.
 *
 * @returns {'configured'|'disabled'}
 */
export const getCloudinaryStatus = () => (CLOUDINARY_ENABLED ? 'configured' : 'disabled');

export default cloudinary;