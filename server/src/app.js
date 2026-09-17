import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import routes from './routes/index.js';
import { generalLimiter } from './middlewares/rateLimiter.middleware.js';

const app = express();

app.disable('x-powered-by');

/**
 * Helmet hardening untuk backend API REST.
 *
 * CSP: backend hanya mengirim JSON — bukan HTML yang bisa menjalankan script.
 * `default-src 'none'` memastikan browser TIDAK mengeksekusi apa pun jika
 * suatu respons salah diinterpretasikan sebagai HTML (MIME sniffing).Uploaded
 * files punya CSP sendiri di `streamStoredFile()`.
 *
 * crossOriginResourcePolicy: mencegah browser lain membaca respons API
 * lewat <img>, <script>, atau <iframe> lintas origin.
 *
 * referrerPolicy: 'no-referrer' — API tidak boleh membocorkan URL endpoint
 * ke domain lain (misalnya lewat External Link di error page).
 */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        scriptSrc: ["'none'"],
        styleSrc: ["'none'"],
        imgSrc: ["'none'"],
        fontSrc: ["'none'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'none'"],
        frameSrc: ["'none'"],
        connectSrc: ["'none'"],
        workerSrc: ["'none'"],
        childSrc: ["'none'"],
        formAction: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    hsts: {
      maxAge: 31536000, // 1 tahun
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: 'deny' },
    noSniff: true,
    referrerPolicy: { policy: 'no-referrer' },
    xssFilter: true,
  })
);

// CORS: hanya origin yang terdaftar di FRONTEND_URL (boleh dipisah koma).
// Sebelumnya `origin: process.env.FRONTEND_URL` bisa bernilai undefined yang
// membuat cors() membuka akses untuk SEMUA origin.
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (allowedOrigins.length === 0) {
  console.warn('⚠️  FRONTEND_URL belum diset — semua request cross-origin akan ditolak CORS.');
}

app.use(
  cors({
    origin: (origin, cb) => {
      // Tanpa header Origin: curl, health check, atau same-origin request.
      if (!origin) return cb(null, true);
      return cb(null, allowedOrigins.includes(origin));
    },
    credentials: true,
  })
);

// Limiter dipasang sebelum body parser agar request berlebih ditolak lebih awal.
app.use('/api/', generalLimiter);

// 10mb terlalu besar untuk API JSON (DoS lewat body besar); upload file
// ditangani multer dengan batas 2MB sendiri.
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

/*
 * CATATAN KEAMANAN: `express.static('/uploads')` sengaja DIHAPUS.
 *
 * Folder uploads berisi KTP, paspor, dan bukti transfer. Sebelumnya seluruh
 * isinya bisa diunduh siapa pun lewat `GET /uploads/<nama-file>` tanpa login.
 * Sekarang akses hanya lewat endpoint ber-otentikasi (pemilik atau admin):
 *   - GET /api/documents/:id/file
 *   - GET /api/deposits/:id/proof
 */

app.use('/api', routes);

app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} tidak ditemukan` });
});

app.use((err, req, res, next) => {
  // Error dari multer (file upload)
  if (err && err.name === 'MulterError') {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'Ukuran file melebihi batas maksimal 2MB'
      : err.message;
    return res.status(400).json({ success: false, message });
  }

  // Error file filter custom (misal tipe file tidak diizinkan)
  if (err && err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ success: false, message: 'Field file tidak valid' });
  }

  const status = err?.status || err?.statusCode || 500;

  // Pesan asli hanya dicatat di server. Detail internal (mis. error Prisma yang
  // menyebut nama tabel/kolom) tidak boleh dikirim ke client pada 5xx.
  if (status >= 500) {
    console.error('❌ Error:', err);
  }

  res.status(status).json({
    success: false,
    message: status >= 500 ? 'Terjadi kesalahan pada server' : err.message || 'Terjadi kesalahan',
    ...(process.env.NODE_ENV === 'development' && status >= 500 && { stack: err.stack }),
  });
});

export default app;
