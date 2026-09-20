# Deploy ke Vercel — Tabunganku Umroh

Panduan deploy **satu project Vercel**: client (Vite/React) dan server (Express API)
berjalan di satu domain. Request `/api/*` ditangani serverless function, sisanya
disajikan sebagai static SPA.

## Yang diubah agar kompatibel serverless

| Masalah di serverless | Solusi |
|---|---|
| Filesystem read-only (upload file) | Upload via **Cloudinary** (asset privat `authenticated`); mode disk tetap ada untuk lokal |
| WebSocket/Socket.io tidak didukung | Socket otomatis **nonaktif di production**; notifikasi tetap jalan via Web Push + polling 30 detik |
| `node-cron` tidak reliable | Cron dipindah ke **Vercel Cron** → `GET /api/cron/reminder` & `GET /api/cron/cleanup` (guard: header `x-vercel-cron` / `CRON_SECRET` / role admin) |
| CORS lintas domain | Tidak diperlukan — client & API satu domain (same-origin) |
| **Prisma 7**: client tidak lagi di `node_modules` | Generator baru `prisma-client` → hasil generate di `server/src/generated/prisma` (gitignored, dibangun ulang oleh `postinstall`/build) |
| **Prisma 7**: wajib driver adapter | Koneksi via `@prisma/adapter-pg` (node-postgres) di `src/config/database.js` |

Struktur pendukung:

```
api/index.js          # entry serverless (mengekspor Express app)
vercel.json           # install/build, rewrites, cron schedules
server/src/cron/*     # diekspor sebagai fungsi + tetap dijadwalkan lokal
```

## 1. Siapkan database Postgres hosted

Wajib. Gunakan Neon / Supabase / Vercel Postgres, lalu salin connection string.
Untuk serverless, sebaiknya pakai **pooler** (PgBouncer) dengan limit kecil:

```
postgresql://user:password@host/db?schema=public&pgbouncer=true&connection_limit=5
```

Buat skema database (sekali saja, dari komputer lokal):

```bash
cd server
DATABASE_URL="<connection-string>" npx prisma db push
DATABASE_URL="<connection-string>" npm run db:seed   # opsional: admin awal
```

> **Prisma 7**: koneksi database dikonfigurasi di `server/prisma.config.ts`
> (env dimuat lewat dotenv dari `server/.env`). Meng-override lewat variabel
> `DATABASE_URL` inline seperti di atas tetap berfungsi. Prisma 7 tidak lagi
> menjalankan seed otomatis — selalu jalankan `npm run db:seed` secara eksplisit.

## 2. Siapkan Cloudinary

Upload berkas (KTP, paspor, bukti transfer) di Vercel wajib lewat Cloudinary
— file tidak bisa disimpan di serverless. Di dashboard Cloudinary ambil:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

> Catatan: asset disimpan sebagai **private** (`type: authenticated`) dan hanya
> bisa dilihat lewat endpoint ber-otentikasi (`/api/documents/:id/file`,
> `/api/deposits/:id/proof`). Jangan ubah visibilitasnya menjadi publik.

## 3. Push ke GitHub lalu import di Vercel

1. Commit & push semua perubahan ke GitHub.
2. Vercel → **Add New… → Project** → pilih repo ini.
3. Framework Preset: **Other** (sudah ditangani `vercel.json`).
4. Deploy pertama boleh gagal karena env belum lengkap — lanjut ke langkah 4.

## 4. Set Environment Variables (Project Settings → Environment Variables)

Pilih environment **Production, Preview, Development** semua.

| Variabel | Nilai |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | connection string Postgres (pooler) |
| `JWT_ACCESS_SECRET` | 48+ karakter acak — `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_REFRESH_SECRET` | 48+ karakter acak, **berbeda** dari access secret |
| `CLOUDINARY_CLOUD_NAME` | dari dashboard Cloudinary |
| `CLOUDINARY_API_KEY` | dari dashboard Cloudinary |
| `CLOUDINARY_API_SECRET` | dari dashboard Cloudinary |
| `VAPID_PUBLIC_KEY` | `npx web-push generate-vapid-keys` (opsional, untuk Web Push) |
| `VAPID_PRIVATE_KEY` | idem |
| `VAPID_SUBJECT` | `mailto:email@kamu.com` |
| `SMTP_*` / `FONNTE_*` | opsional, isi bila fitur email/WhatsApp dipakai |
| `CRON_SECRET` | string acak (opsional, lapis kedua guard cron) |
| `FRONTEND_URL` | **kosongkan** untuk deploy satu domain. Isi `https://domain-kamu` hanya bila frontend di-host terpisah |

> **Tidak perlu** `VITE_API_URL` — client otomatis same-origin.
> **Tidak perlu** `VITE_ENABLE_SOCKET` — default sudah mati di production.

## 5. Migrasi database saat deploy

Vercel tidak menjalankan `prisma db push` otomatis. `vercel.json` sudah
menjalankan `prisma generate` saat build; perubahan skema diterapkan manual
dari lokal (langkah 1) atau tambahkan build plugin pihak ketiga bila ingin
otomatis.

## 6. Verifikasi setelah deploy

```bash
curl https://nama-project.vercel.app/api/health
# → {"status":"OK",...}
```

- Buka situs → register/login berfungsi.
- Upload dokumen → berkas tersimpan di Cloudinary (folder `tabunganku-umroh/`).
- Cek tab **Vercel → Cron Jobs**: dua jadwal (`/api/cron/cleanup` harian,
  `/api/cron/reminder` tanggal 25) muncul dan tercatat berjalan.

## Menjalankan lokal (tetap seperti semula)

```bash
npm run install:all
npm run dev        # server :5000 + client :5173 (Vite proxy /api)
```

Lokal tidak memerlukan Cloudinary — upload fallback ke disk
(`server/src/uploads/`). Isi `CLOUDINARY_*` di `server/.env` bila ingin
menyamakan perilaku dengan production.

## Catatan penting

- **Jalankan `prisma db push`** setelah mengubah `schema.prisma` (dari lokal).
- `vercel.json` memakai jadwal cron **UTC**: cleanup `0 20 * * *`
  (03:00 WIB), reminder `0 2 25 * *` (09:00 WIB tanggal 25).
- File upload maksimal **2MB** (JPG/PNG/PDF) — sama seperti sebelumnya.
- Refresh token disimpan di DB — pastikan `DATABASE_URL` production stabil
  sebelum mengganti kredensial lain.
