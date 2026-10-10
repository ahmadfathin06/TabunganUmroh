# Tabunganku Umroh

Aplikasi web tabungan (saving plan) untuk ibadah umroh. Pengguna membuat rencana
tabungan untuk sebuah paket umroh, menyetor dana, mengunggah bukti transfer, lalu
admin memverifikasi setoran dan saldo bertambah. Tersedia juga verifikasi dokumen
(KTP/paspor), notifikasi (Web Push), dan panel admin.

Repo: `github.com/ahmadfathin06/TabunganUmroh`

---

## 1. Ringkasan & arsitektur

Monorepo dua paket, dijalankan dari root:

| Paket | Isi |
|---|---|
| `server/` | API Express (ESM) + Prisma 7 + PostgreSQL |
| `client/` | SPA React 18 + Vite 6 + Tailwind CSS 4 |
| `api/index.js` | Entry serverless Vercel (mengimpor bundle `server/.build/server.mjs`) |

Alur request di production (single project Vercel): client statis di satu domain,
`/api/*` diteruskan `vercel.json` ke serverless function, sisanya ke `index.html`.

**Backend:** Node.js (ESM), Express 4, Prisma 7 (`prisma-client` generator +
`@prisma/adapter-pg`), PostgreSQL, JWT access/refresh (bcrypt), Zod, Multer,
Helmet, express-rate-limit, node-cron (lokal) / Vercel Cron (produksi),
Web Push (`web-push`), Socket.io (nonaktif di serverless), PDFKit, **Resend** (email).

**Frontend:** React 18, Vite 6, Tailwind CSS 4, React Router 6 (code-splitting),
Zustand, TanStack Query, react-hook-form + Zod, Motion, Recharts, PWA service worker.

**Penyimpanan berkas privat:** Cloudinary (`type: authenticated`) di production,
folder disk lokal (`server/src/uploads/`) untuk development. Berkas **tidak**
pernah disajikan lewat static route — hanya lewat endpoint ber-otentikasi.

---

## 2. Prasyarat

- **Node.js 22+** (dikembangkan/diuji dengan Node 22–24; build API menargetkan `node22`)
- **PostgreSQL** (lokal atau hosted: Neon / Supabase / Vercel Postgres)
- Akun **Cloudinary** (untuk upload di production)
- Akun **Resend** + domain terverifikasi (opsional, hanya bila email dipakai)
- Google Chrome / Chromium (hanya untuk E2E)

---

## 3. Instalasi

```bash
git clone https://github.com/ahmadfathin06/TabunganUmroh.git
cd TabunganUmroh

npm run install:all          # install server + client
# atau manual:
npm ci --prefix server --include=dev
npm ci --prefix client --include=dev
```

`postinstall` server menjalankan `prisma generate` (client Prisma 7 di `server/src/generated/prisma`, gitignored).

---

## 4. Setup environment

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env      # opsional
```

### 4a. Variabel wajib

| Variabel | Keterangan |
|---|---|
| `DATABASE_URL` | connection string Postgres. Untuk serverless gunakan **pooler** + `connection_limit=5` |
| `JWT_ACCESS_SECRET` | string acak **min. 32 karakter** |
| `JWT_REFRESH_SECRET` | string acak min. 32 karakter, **berbeda** dari access secret |

Generate secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Validasi dijalankan otomatis saat server start (lihat `server/src/config/env.js`):
nilai kosong/placeholder dan secret terlalu pendek akan menolak start di production.

### 4b. Cloudinary (wajib untuk upload di production)

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Cara mendapatkan:

1. Login ke <https://cloudinary.com> → **Dashboard**.
2. Salin **Cloud name**, **API Key**, dan **API Secret**.
3. Isi ketiga variabel di atas (lokal di `server/.env`, production di Vercel Environment Variables).

Di Vercel: **Project → Settings → Environment Variables** → tambahkan untuk
Production/Preview/Development, lalu redeploy.

Cara menguji upload:

```bash
npm run dev
# login, buat setoran, unggah bukti → cek Cloudinary Media Library
```

Cara memastikan asset tetap private:

- Asset disimpan sebagai `type: authenticated` — **jangan** ubah visibilitas menjadi publik.
- Unduhan hanya lewat `GET /api/documents/:id/file` dan `GET /api/deposits/:id/proof`
  (hanya pemilik atau admin), memakai signed URL berumur pendek.
- `GET /api/health` melaporkan `cloudinary: "configured"` bila kredensial asli terpasang.

> **Jangan** menaruh `CLOUDINARY_API_SECRET` (atau secret apa pun) di client,
> variabel `VITE_*`, kode, log, screenshot, atau commit.

### 4c. Resend (email, opsional)

```env
RESEND_API_KEY=
RESEND_FROM_EMAIL=
RESEND_FROM_NAME=Tabunganku Umroh
RESEND_REPLY_TO=
EMAIL_ENABLED=false
```

1. Buat akun di <https://resend.com>.
2. **Verifikasi domain pengirim** (tambahkan record DNS SPF/DKIM).
3. Buat **API key** dengan permission *Sending access* (batasi ke domain bila tersedia).
4. Isi `RESEND_FROM_EMAIL` dengan alamat pada domain yang sudah diverifikasi.
5. Set `EMAIL_ENABLED=true` hanya setelah konfigurasi siap.

Perilaku:

- `EMAIL_ENABLED=false` (default) → email dilewati, server tetap start.
- `EMAIL_ENABLED=true` tanpa `RESEND_API_KEY`/`RESEND_FROM_EMAIL` → **server menolak start**
  dengan pesan yang hanya menyebut nama variabel.
- `sendEmail` (blocking) dan `sendEmailInBackground` (fire-and-forget, untuk email
  non-kritis) tersedia di `server/src/config/mailer.js`.

### 4d. Variabel opsional

`FRONTEND_URL` (kosongkan untuk deploy satu domain), `VAPID_*` (Web Push),
`CRON_SECRET` (guard cron), `ADMIN_EMAIL`/`ADMIN_PASSWORD` (seed),
`FONNTE_*` (WhatsApp). Lihat `server/.env.example` untuk daftar lengkap.

---

## 5. Setup PostgreSQL

```bash
# buat database (contoh lokal)
createdb tabunganku_umroh

# sinkronkan schema
npm run db:push --prefix server

# (opsional) data awal: admin, user demo, bank, paket umroh
npm run db:seed --prefix server
```

**Seed admin:** `ADMIN_PASSWORD` minimal 12 karakter. Bila dikosongkan saat
development, seed membuat password acak dan menampilkannya **sekali** di terminal.
Password default yang pernah bocor di repo (`Admin@123456`) ditolak di production.

Akun hasil seed (development):

| Peran | Email | Password |
|---|---|---|
| Admin | `ADMIN_EMAIL` (default `admin@tabunganku.com`) | `ADMIN_PASSWORD` (acak bila kosong) |
| User demo | `jamaah@tabunganku.com` | `Password123` (development) |

---

## 6. Menjalankan lokal

```bash
npm run dev          # server :5000 + client :5173 sekaligus
npm run dev:server   # hanya API
npm run dev:client   # hanya client
```

Client mem-proxy `/api` dan `/socket.io` ke `localhost:5000` (same-origin),
konsisten dengan production. Buka <http://localhost:5173>.

---

## 7. Build production

```bash
npm run db:generate --prefix server   # Prisma client
npm run build:api --prefix server     # bundle serverless → server/.build/server.mjs
npm run build --prefix client         # output client/dist
```

---

## 8. Testing

Backend memakai **Node.js built-in test runner** (tanpa framework tambahan).

```bash
npm run lint              --prefix server   # parse + guard migrasi email (tanpa SMTP/Nodemailer)
npm run test:unit         --prefix server   # cepat, tanpa database
npm run test:integration  --prefix server   # butuh DATABASE_URL yang bisa diakses
npm test                  --prefix server   # lint + unit + integration
```

Cakupan:

| Berkas | Isi |
|---|---|
| `test/unit/credentials.test.js` | deteksi placeholder Cloudinary |
| `test/unit/storagePaths.test.js` | pemetaan nama berkas ↔ `public_id` (termasuk anti prefix ganda & path traversal) |
| `test/unit/uploadConfig.test.js` | whitelist MIME & batas 2MB |
| `test/unit/mailer.test.js` | adapter Resend dengan mock SDK (payload, `EMAIL_ENABLED=false`, error aman) |
| `test/unit/health.test.js` | health report OK vs DEGRADED tanpa membocorkan error |
| `test/integration/health.integration.test.js` | `/api/health` di app sungguhan |
| `test/integration/documents.integration.test.js` | upload (batas/MIME), unduh pemilik 200, user lain 403, static 404, traversal |

### E2E (Puppeteer)

```bash
npm ci --prefix client/e2e
npm run db:seed --prefix server          # butuh admin
npm run dev                               # jalankan server + client di terminal lain
npm test --prefix client/e2e
```

Konfigurasi E2E lewat environment: `E2E_BASE_URL`, `E2E_ADMIN_EMAIL`,
`E2E_ADMIN_PASSWORD`, `E2E_USER_PASSWORD`, `PUPPETEER_EXECUTABLE_PATH`,
`E2E_SCREENSHOT_DIR`, `E2E_KEEP_ARTIFACTS`. Script mencari Chrome/Chromium
secara otomatis (Windows/macOS/Linux) — tidak ada path hardcoded. Berkas uji
ditulis ke folder temporer OS, dan screenshot ke `client/e2e/shots/` (gitignored).

### CI

`.github/workflows/ci.yml` menjalankan, dengan PostgreSQL service: lint → unit →
integration → build Prisma → build API (esbuild) → build client, lalu job E2E
terpisah (Chrome + server + client). Secret memakai GitHub Secrets / env CI,
bukan hardcoded.

---

## 9. Deployment (Vercel)

Panduan lengkap ada di [`DEPLOY.md`](./DEPLOY.md). Ringkas:

1. Push repo ke GitHub, import di Vercel (Framework Preset: **Other**).
2. Set Environment Variables (lihat tabel di `DEPLOY.md`).
3. `vercel.json` menjalankan `prisma db push` + build API + build client saat deploy.
4. Verifikasi `GET /api/health` → `status: "OK"`, `database: "OK"`, `cloudinary: "configured"`.

---

## 10. Troubleshooting

| Gejala | Penyebab & solusi |
|---|---|
| Semua endpoint `/api/*` 500 di Vercel | `DATABASE_URL` tidak termuat. Pastikan env var diset di Vercel (bundle `api/index.js` memuat `.env` lewat `config/env.js`) |
| `cloudinary: "disabled"` di health | Kredensial kosong/placeholder. Isi ketiga `CLOUDINARY_*` dengan nilai asli |
| Upload gagal 500 di Vercel | Filesystem serverless read-only → wajib Cloudinary |
| Upload "melebihi batas maksimal 2MB" | Batas berkas 2MB (JPG/PNG/PDF) |
| Upload "File type tidak diizinkan" | MIME di luar whitelist; ekstensi ditentukan server dari MIME |
| Server menolak start: `EMAIL_ENABLED=true ...` | Lengkapi `RESEND_API_KEY` + `RESEND_FROM_EMAIL`, atau set `EMAIL_ENABLED=false` |
| Server menolak start: secret terlalu pendek | `JWT_*_SECRET` minimal 32 karakter dan berbeda |
| `429` terlalu sering | Rate limit per-endpoint (`express-rate-limit`) |
| Dokumen 403 | Hanya pemilik atau admin yang boleh mengunduh |

---

## 11. Keamanan (peringatan)

- **Jangan pernah** menulis secret asli ke repo, source code, log, screenshot, atau commit.
  Gunakan `server/.env` (gitignored) dan Vercel Environment Variables.
- Jangan memakai prefix `VITE_` untuk secret — nilai `VITE_*` ikut ter-bundle ke client.
- Berkas privat (KTP, paspor, foto, bukti transfer) **harus tetap** `type: authenticated`
  di Cloudinary; jangan diubah menjadi publik.
- Path traversal diblokir: hanya nama berkas yang dihasilkan server yang valid.
- Rotasi `JWT_*_SECRET` dan `RESEND_API_KEY` bila diduga bocor.

---

## 12. Roadmap / belum diimplementasikan

Model database `Chat` dan `ReferralReward` **sudah ada di schema** tetapi belum
memiliki route/controller. Keduanya **belum diimplementasikan** dan **tidak**
dibuatkan endpoint CRUD otomatis karena belum ada keputusan produk/acceptance
criteria — dipertahankan sebagai *roadmap*, bukan dihapus (menghapus butuh
keputusan eksplisit + migrasi data yang aman).

Adapter email Resend sudah siap, tetapi belum dipanggil oleh alur bisnis mana pun
(tidak ada kebutuhan produk saat ini). Jangan menambahkan pengiriman email tanpa
kebutuhan yang jelas.
