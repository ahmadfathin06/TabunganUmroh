# Laporan Akhir Setup & Deploy — Tabunganku Umroh

> Dokumen ini menggantikan laporan status sebelumnya yang sudah usang (masih
> menyebut "tidak ada README", "tidak ada unit test", dan "12 file belum
> di-commit" — semuanya sudah tidak berlaku).
>
> Tanggal laporan: **11 Oktober 2026**. Branch: `master`.
> Commit terakhir: `b202f80` — "feat: migrasi email ke Resend + perbaiki upload
> privat Cloudinary & env serverless".

---

## 0. Ringkasan eksekutif

| Area | Status |
|---|---|
| Audit repository (Fase 1) | ✅ Selesai |
| Database Neon (Fase 2) | ⛔ **Belum** — butuh akses dashboard Neon (manual) |
| Environment lokal (Fase 3) | ⚠️ `server/.env` ada, tetapi `DATABASE_URL` masih **localhost** (dev). Secret produksi belum diisi |
| `allowScripts` (Fase 4) | ✅ **Diperbaiki** (server + client) |
| Prisma generate & schema (Fase 5) | ✅ `db:generate` lulus; DB lokal OK. Neon production belum |
| Migrasi email ke Resend (Fase 6) | ✅ Selesai & terverifikasi |
| Cloudinary private (Fase 7) | ✅ Kode siap; ⛔ kredensial asli belum ada → mode disk lokal |
| Health check (Fase 8) | ✅ Selesai & terverifikasi |
| Konfigurasi Vercel (Fase 9) | ⛔ Butuh dashboard Vercel + kredensial (manual) |
| Testing lokal (Fase 10) | ✅ lint + unit + integration + build lulus. E2E belum dijalankan sesi ini |
| Dokumentasi (Fase 11) | ✅ Sudah lengkap (`README.md`, `DEPLOY.md`) |
| Verifikasi production (Fase 12) | ⛔ Belum deploy |
| Laporan akhir (Fase 13) | ✅ Dokumen ini |

**Kesimpulan:** pekerjaan yang bisa diselesaikan **tanpa kredensial sudah
selesai dan terverifikasi**. Sisa pekerjaan sepenuhnya bergantung pada
kredensial/dashboard eksternal (Neon, Vercel, Cloudinary, Resend) dan
**belum boleh dinyatakan selesai**.

---

## 1. File yang diubah pada sesi ini

Hanya **2 file** diubah, keduanya aditif dan minimal:

| File | Perubahan |
|---|---|
| `server/package.json` | Menambahkan field `allowScripts` (`@prisma/engines`, `bcrypt`, `esbuild`, `prisma`) |
| `client/package.json` | Menambahkan field `allowScripts` (`esbuild`) |

File `laporan.md` (dokumen ini) juga ditulis ulang. **Tidak ada commit/push**
dilakukan — menunggu persetujuan.

### Mengapa `allowScripts` tidak di root?

Prompt meminta menyesuaikan `allowScripts` di root, tetapi hasil pemeriksaan
menunjukkan:

- `npm approve-scripts --allow-scripts-pending` di **root**: *"No packages with
  unreviewed install scripts"* — entri root (`esbuild@0.28.2`,
  `msgpackr-extract@3.0.4`, `workerd@1.20260704.1`) sudah cocok dengan lockfile
  tooling root, jadi **dibiarkan**.
- Install dependency server/client dilakukan dengan `--prefix server` /
  `--prefix client`, sehingga kebijakan yang berlaku adalah `package.json`
  masing-masing paket — **bukan** root.
- Di **server** justru ada 4 package dengan install script yang belum di-approve
  (`@prisma/engines`, `bcrypt`, `esbuild`, `prisma`) — persis daftar di prompt.
- Di **client**: `esbuild`.

Catatan: mekanisme resmi npm 11 adalah field `allowScripts` di `package.json`
(dikelola `npm approve-scripts`, bukan `npm install-scripts` yang tidak ada di
npm 11.16). Saat ini sifatnya *advisory* (script tetap berjalan, hanya
melaporkan yang belum di-review); versi npm mendatang akan memblokirnya.
Entri ditulis **tanpa pin versi** agar tidak gagal saat patch version berubah.

---

## 2. Command yang dijalankan & hasilnya

| # | Command | Hasil |
|---|---|---|
| 1 | `git status --short` | Bersih, kecuali `laporan.md` (untracked) |
| 2 | `git log -5 --oneline` | HEAD `b202f80` (10 Okt 2026) |
| 3 | `git diff --check` | ✅ Tidak ada whitespace error |
| 4 | `npm run db:generate --prefix server` | ✅ Prisma Client 7.10.0 → `src/generated/prisma` (563 ms) |
| 5 | `npm run lint --prefix server` | ✅ 58 berkas ter-parse, tanpa sisa SMTP/Nodemailer |
| 6 | `npm run test:unit --prefix server` | ✅ **30/30 lulus** (≈5,5 s) |
| 7 | `npm run test:integration --prefix server` | ✅ **15/15 lulus** (≈14,7 s, pakai DB lokal) |
| 8 | `npm run build:api --prefix server` | ✅ `.build/server.mjs` 168,6 kB (163 ms) |
| 9 | `npm run build --prefix client` | ✅ `built in 34,66s` → `client/dist` |
| 10 | `npm approve-scripts --no-allow-scripts-pin …` | ✅ server & client ditambahkan |
| 11 | `npm install --prefix server --include=dev` | ✅ exit 0, "up to date" |
| 12 | `npm install --prefix client --include=dev` | ✅ exit 0, "up to date" |

**Tidak ada command yang gagal.** E2E (`client/e2e`) **tidak dijalankan** pada
sesi ini (butuh server + client berjalan + admin seed).

---

## 3. Temuan audit (Fase 1)

| Pertanyaan | Jawaban |
|---|---|
| Ada `server/prisma/migrations/`? | ❌ **Tidak ada** → proyek memakai strategi **`db push`** (schema sync), bukan migration history |
| `db push` atau migration history? | `db push` — `db:deploy` = `prisma db push` |
| Database diakses saat build? | Ya — `vercel.json` buildCommand menjalankan `npm run db:deploy` (`prisma db push`) di awal build |
| Email masih SMTP/Nodemailer? | ❌ Tidak. Sudah **Resend** (`server/src/config/mailer.js`); `nodemailer` sudah tidak ada di lockfile; lint memblokir kemunculannya kembali |
| Cloudinary private/authenticated? | ✅ `type: 'authenticated'` + signed URL; `express.static('/uploads')` sudah dihapus |
| Entry Vercel memuat env sebelum route? | ✅ `server/src/app.js` mengimpor `./config/env.js` di baris teratas; `env.js` mencoba dua path `.env` (mode sumber & mode bundle esbuild) |
| Perubahan lokal belum commit? | Hanya `laporan.md` (untracked) + 2 `package.json` hasil sesi ini |

---

## 4. Database

### Lokal (development)
`server/.env` menunjuk `DATABASE_URL` ke **localhost:5432/tabunganku_umroh**
(tanpa SSL/pooler). Ini **normal untuk development** dan dipakai oleh
integration test yang lulus. Nilai lengkap tidak ditampilkan (mengandung
password).

### Neon (production) — **BELUM DISIAPKAN**
Belum ada akses dashboard Neon, jadi langkah ini belum dikerjakan. Karena
`server/prisma/migrations/` **tidak ada**, strategi yang konsisten adalah
**`db push`** (sesuai `vercel.json`), bukan `migrate deploy`.
`prisma migrate reset` **tidak pernah** dijalankan.

**Langkah manual yang diperlukan:**

1. Buat project Neon: region **AWS Asia Pacific 1 (Singapore)**, Postgres ON,
   sisanya (Object storage / Functions / AI Gateway / Neon Auth) OFF.
2. Ambil connection string **pooled** dari menu *Connect*; host harus domain
   Neon (contoh `ep-xxxx-pooler.ap-southeast-1.aws.neon.tech`), dengan
   `sslmode=require&pgbouncer=true&connection_limit=5`. **Bukan** localhost.
3. Set sebagai `DATABASE_URL` di `server/.env` (lokal) dan Vercel
   Environment Variables (production), lalu jalankan dari lokal:
   ```bash
   npm run db:push   --prefix server
   npm run db:seed   --prefix server   # ADMIN_EMAIL / ADMIN_PASSWORD dari env
   ```

---

## 5. Build & test

- **Build API (esbuild):** ✅ lulus → `server/.build/server.mjs`
- **Build frontend (Vite):** ✅ lulus → `client/dist`
- **Unit test:** ✅ 30/30 — meliputi deteksi placeholder Cloudinary, pemetaan
  nama↔`public_id` (anti prefix ganda & path traversal), whitelist MIME + batas
  2MB, adapter Resend (payload, disabled, error aman), health OK/DEGRADED.
- **Integration test:** ✅ 15/15 — `/api/health` (OK + tidak membocorkan
  kredensial), upload (batas/MIME), unduh pemilik 200, user lain 403, static
  `/uploads` 404, path traversal 404.
- **E2E (Puppeteer):** ⚠️ tersedia di `client/e2e/e2e.js` tetapi **belum
  dijalankan** pada sesi ini.

```bash
# Menjalankan E2E (butuh server + client hidup + admin seed)
npm ci   --prefix client/e2e
npm run db:seed --prefix server
npm run dev            # terminal lain
npm test --prefix client/e2e
```
Konfigurasi via env: `E2E_BASE_URL`, `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`,
`PUPPETEER_EXECUTABLE_PATH`, dll. Tidak ada path Chrome Windows yang hardcoded.

---

## 6. Status Cloudinary

- **Kode:** ✅ sesuai syarat — `type: 'authenticated'` (privat), hanya
  JPG/PNG/PDF, maks 2 MB, `public_id` acak tanpa prefix `tuu-` ganda, unduhan
  lewat endpoint ber-otentikasi dengan signed URL, `express.static('/uploads')`
  dihapus, placeholder (`your_cloud_name`) dianggap **tidak** terkonfigurasi
  sehingga jatuh ke mode disk lokal (khusus development).
- **Kredensial:** ⛔ belum ada. Di lokal, `getCloudinaryStatus()` = `disabled`
  dan health melaporkan `cloudinary: "disabled"`. Upload production **wajib**
  kredensial asli.
- **Uji upload ke Cloudinary:** belum dilakukan (tanpa kredensial).

---

## 7. Status Resend

- **Migrasi:** ✅ selesai. `server/src/config/mailer.js` memakai SDK Resend;
  `nodemailer` sudah dilepas dari dependensi & lockfile.
- **Kontrak:** export `sendEmail({ to, subject, html, text, replyTo })`
  dipertahankan; tersedia juga `sendEmailInBackground` (fire-and-forget) untuk
  email non-kritis.
- **Perilaku:** `EMAIL_ENABLED=false` → `{ skipped: true }`, server tetap jalan;
  `EMAIL_ENABLED=true` tanpa API key/from → **fail-fast** dengan pesan yang hanya
  menyebut **nama variabel** (tanpa nilai); error provider dipetakan jadi error
  aman; API key tidak pernah di-log.
- **Dipakai alur bisnis?** Belum — adapter siap tetapi belum dipanggil alur
  bisnis apa pun (tidak ada kebutuhan produk saat ini). Unit test sudah ada.
- **Aktivasi:** **jangan** set `EMAIL_ENABLED=true` sebelum domain pengirim
  diverifikasi di Resend dan `RESEND_FROM_EMAIL` memakai domain tersebut.

---

## 8. Environment variable yang harus diisi manual

Tidak ada nilai secret yang dicantumkan di sini.

**Lokal (`server/.env`)** — sudah ada file, isi nilainya:

| Variabel | Status |
|---|---|
| `DATABASE_URL` | ⚠️ masih localhost → ganti ke Neon (pooled) untuk uji production |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | harus ≥32 karakter & berbeda (generate `crypto.randomBytes(48)`) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | kosong/placeholder |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`, `RESEND_REPLY_TO`, `EMAIL_ENABLED` | belum diisi (email off) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | untuk seed admin (password ≥12 karakter) |

**Vercel → Project Settings → Environment Variables (Production):**

`NODE_ENV=production`, `DATABASE_URL` (Neon pooled), `JWT_ACCESS_SECRET`,
`JWT_REFRESH_SECRET`, `CLOUDINARY_*`, `RESEND_API_KEY`,
`RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`, `RESEND_REPLY_TO`, `EMAIL_ENABLED=false`
(opsional: `VAPID_*`, `CRON_SECRET`).

**Jangan** memakai prefix `VITE_` untuk secret apa pun.

---

## 9. Error / keterbatasan yang masih ada

1. **`DATABASE_URL` produksi belum ada** — masih localhost (dev). Ini alasan
   utama setup **belum bisa dinyatakan selesai**.
2. **Skema belum dibuat di Neon** — `db push`/seed terhadap Neon belum dijalankan.
3. **Kredensial Cloudinary & Resend belum diisi** → upload production belum bisa.
4. **Build/deploy Vercel belum dijalankan** — belum ada verifikasi production.
5. **E2E belum dijalankan** pada sesi ini.
6. **Temuan tambahan (di luar scope, perlu keputusan):** `package.json` **root**
   memuat dependensi yang tidak dipakai aplikasi — `next-cloudinary`
   (framework Next, padahal ini Vite) dan `prisma@^8.0.0-rc.15`, plus lockfile
   root yang besar (`workerd`, `@alchemy.run/*`). Ini tampak sebagai artefak
   tooling, bukan bagian runtime app. **Belum diubah** karena berisiko
   (regenerasi lockfile) dan butuh keputusan pemilik repo.

---

## 10. Langkah deploy berikutnya

1. Setujui perubahan sesi ini (2 `package.json` + `laporan.md`), lalu commit.
2. Buat database Neon (lihat §4) dan isi `DATABASE_URL` production di Vercel.
3. Isi semua Environment Variables di Vercel (§8).
4. Deploy ke Vercel (butuh persetujuan eksplisit — belum dilakukan).
5. Verifikasi:
   ```bash
   curl https://<domain-vercel>/api/health
   # harapan: status "OK", database "OK", cloudinary "configured", email "disabled"
   ```
6. Uji dari browser: register → login → dashboard → buat setoran → upload bukti →
   upload dokumen → verifikasi admin → saldo bertambah → berkas privat tidak
   bisa diakses tanpa autentikasi.
7. Aktifkan `EMAIL_ENABLED=true` **hanya setelah** domain Resend terverifikasi,
   API key tersimpan, dan test email berhasil.

Sesuai aturan keamanan, **tidak ada** `git push` maupun deploy production yang
dilakukan tanpa persetujuan.
