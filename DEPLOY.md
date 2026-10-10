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
>
> Detail:
> - Nama berkas yang disimpan di DB TIDAK memuat prefix; prefix `tuu-` hanya
>   ditambahkan saat membentuk `public_id` Cloudinary (lihat `fileStorage.js`).
> - Pengambilan berkas memakai **signed download URL** berumur pendek
>   (`private_download_url`), bukan URL publik.
> - Batas berkas **2MB**, hanya JPG/PNG/PDF; ekstensi ditentukan server dari MIME.
> - Cleanup harian hanya menghapus aset `type:authenticated` ber-prefix `tuu-`
>   yang **tidak** direferensikan database.
>
> Nilai contoh seperti `your_cloud_name` dianggap **belum dikonfigurasi**, jadi
> upload otomatis jatuh ke mode disk — pastikan ketiga variabel di atas diisi
> dengan nilai asli agar upload bekerja di Vercel.

## 2b. Siapkan Resend (email, opsional)

Email hanya perlu bila fitur notifikasi email diaktifkan. Aplikasi tetap
berjalan normal tanpa konfigurasi ini (`EMAIL_ENABLED=false`).

1. Buat akun di <https://resend.com>.
2. Tambahkan dan **verifikasi domain pengirim** (DNS records SPF/DKIM).
3. Buat **API key** dengan permission *Sending access* (batasi ke domain bila tersedia).
4. Simpan API key hanya di `server/.env` lokal atau Vercel Environment Variables —
   **jangan** di file yang di-commit, client, atau log.
5. Isi `RESEND_FROM_EMAIL` dengan alamat pada domain yang sudah diverifikasi
   (mis. `noreply@mail.domain-kamu.com`).
6. Set `EMAIL_ENABLED=true` **hanya setelah** langkah di atas selesai.

Perilaku error (lihat `server/src/config/mailer.js`):

- `EMAIL_ENABLED=false` → email dilewati (`{ skipped: true }`), tidak menggagalkan server.
- `EMAIL_ENABLED=true` tetapi konfigurasi tidak lengkap → **fail fast** dengan pesan
  yang hanya menyebut nama variabel (tanpa nilai).
- Error provider dipetakan menjadi error aman sebelum dipropagasikan ke caller;
  detail mentah hanya masuk log server.
- Pola fire-and-forget tersedia (`sendEmailInBackground`) untuk email non-kritis.

> Adapter ini sudah siap dipakai, tetapi belum dipanggil oleh alur bisnis mana pun.
> Jangan mengirim email tanpa kebutuhan produk yang jelas.

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
| `RESEND_API_KEY` | API key Resend (permission *Sending access*). Opsional — hanya bila email dipakai. **Jangan pernah commit nilai ini.** |
| `RESEND_FROM_EMAIL` | alamat pengirim pada domain Resend yang **sudah diverifikasi** |
| `RESEND_FROM_NAME` | opsional, nama pengirim (default `Tabunganku Umroh`) |
| `RESEND_REPLY_TO` | opsional |
| `EMAIL_ENABLED` | `false` (default) atau `true`. Bila `true`, `RESEND_API_KEY` + `RESEND_FROM_EMAIL` **wajib** — server menolak start bila belum lengkap |
| `FONNTE_*` | opsional, isi bila fitur WhatsApp dipakai |
| `CRON_SECRET` | string acak (opsional, lapis kedua guard cron) |
| `FRONTEND_URL` | **kosongkan** untuk deploy satu domain. Isi `https://domain-kamu` hanya bila frontend di-host terpisah |

> **Tidak perlu** `VITE_API_URL` — client otomatis same-origin.
> **Tidak perlu** `VITE_ENABLE_SOCKET` — default sudah mati di production.

## 5. Migrasi database saat deploy

`vercel.json` sudah menjalankan **`prisma db push` otomatis** di awal build
(`npm run db:deploy --prefix server`) — jadi schema selalu sinkron dengan
`schema.prisma` setiap deploy. Syaratnya `DATABASE_URL` harus tersedia pada
**Build** (Vercel menyuntik env var project ke build command secara default).

Jika perubahan schema berpotensi kehilangan data, build akan **gagal** dengan
pesan data-loss — terapkan perubahan tsb secara manual dari lokal:

```bash
cd server
DATABASE_URL="<connection-string>" npx prisma db push --accept-data-loss
```

## 6. Verifikasi setelah deploy

```bash
curl https://nama-project.vercel.app/api/health
# → {
#     "status":"OK",
#     "database":"OK",
#     "cloudinary":"configured",
#     "email":"disabled",
#     "timestamp":"...",
#     "uptime":123
#   }
```

Health check memeriksa: proses hidup, koneksi database (`SELECT 1`), serta
**status** konfigurasi Cloudinary dan email. Endpoint ini publik dan **tidak
pernah** membocorkan kredensial atau detail error internal. Bila database
bermasalah, respons menjadi HTTP **503** dengan `status: "DEGRADED"` dan
`database: "ERROR"`.

Nilai yang diharapkan di production:

- `database` harus `OK` (kalau `ERROR`, periksa `DATABASE_URL`/pooler).
- `cloudinary` harus `configured` (kalau `disabled`, upload tidak akan jalan).
- `email` `disabled` bila email memang dimatikan, atau `enabled` bila dikonfigurasi.

Selain itu:

- Buka situs → register/login berfungsi.
- Upload dokumen → berkas tersimpan di Cloudinary sebagai asset privat.
- Cek tab **Vercel → Cron Jobs**: dua jadwal (`/api/cron/cleanup` harian,
  `/api/cron/reminder` tanggal 25) muncul dan tercatat berjalan.

> Cron dipicu lewat `GET /api/cron/reminder` & `GET /api/cron/cleanup` dengan
> guard header `x-vercel-cron`, `CRON_SECRET` (`Authorization: Bearer ...`), atau role admin.

## Menjalankan lokal (tetap seperti semula)

```bash
npm run install:all
npm run dev        # server :5000 + client :5173 (Vite proxy /api)
```

Lokal tidak memerlukan Cloudinary — upload fallback ke disk
(`server/src/uploads/`). Isi `CLOUDINARY_*` di `server/.env` bila ingin
menyamakan perilaku dengan production.

## Catatan penting

- **Secret tidak boleh masuk Git.** `RESEND_API_KEY`, `JWT_*_SECRET`,
  `DATABASE_URL`, `CLOUDINARY_API_SECRET`, `CRON_SECRET`, dan VAPID private key
  hanya di `server/.env` (gitignored) atau Vercel Environment Variables.
  Jangan memakai prefix `VITE_` untuk secret — nilai `VITE_*` ikut ter-bundle ke client.
- **Jangan ubah asset Cloudinary menjadi public.** Dokumen KTP/paspor/foto dan
  bukti transfer harus tetap `type: authenticated`.
- **Jalankan `prisma db push`** setelah mengubah `schema.prisma` (dari lokal).
- `vercel.json` memakai jadwal cron **UTC**: cleanup `0 20 * * *`
  (03:00 WIB), reminder `0 2 25 * *` (09:00 WIB tanggal 25).
- File upload maksimal **2MB** (JPG/PNG/PDF) — sama seperti sebelumnya.
- Refresh token disimpan di DB — pastikan `DATABASE_URL` production stabil
  sebelum mengganti kredensial lain.
