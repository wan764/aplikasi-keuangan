# Tutorial Deploy ke Vercel

Tujuan: aplikasi bisa diakses lewat URL publik seperti `https://nama-aplikasi.vercel.app`, bukan lagi `localhost` atau IP Wi-Fi.

## Status Project Saat Ini

Project sekarang terdiri dari:

- Frontend statis: `index.html`, `styles.css`, `app.js`
- PWA: `manifest.webmanifest`, `service-worker.js`, `icons/icon.svg`
- Backend lokal: `server.js`
- Database lokal: `database.json`

Masalah utama untuk Vercel:

1. `server.js` saat ini adalah server Node yang berjalan terus-menerus. Vercel umumnya memakai model serverless/function, bukan server lokal long-running seperti di laptop.
2. `database.json` tidak cocok untuk production di Vercel. File lokal bisa hilang atau tidak konsisten antar function instance.
3. Session login saat ini disimpan di memory (`sessions = new Map()`), sehingga tidak aman untuk serverless karena memory bisa reset.

Jadi, untuk deploy production yang benar, backend perlu dipindahkan ke:

- Vercel Functions untuk API.
- Database cloud seperti Supabase, Neon Postgres, MongoDB Atlas, atau Vercel Storage.
- Session/token stateless seperti JWT atau cookie signed.

## Pilihan Deploy

### Opsi A: Deploy Frontend Saja

Ini paling cepat, tapi login/register tidak akan berfungsi karena backend belum ikut production.

Gunakan opsi ini hanya untuk preview UI.

### Opsi B: Deploy Full App

Ini opsi yang benar untuk aplikasi keuangan:

- Frontend di Vercel.
- API di Vercel Functions.
- Database di Supabase/Postgres.
- Password tetap di-hash.
- Session pakai token/cookie.

## Langkah Deploy Frontend ke Vercel

### 1. Buat Akun Vercel

Buka:

https://vercel.com

Login pakai GitHub agar deploy otomatis dari repository.

### 2. Upload Project ke GitHub

Jika belum punya repository:

```bash
git init
git add .
git commit -m "Initial financial app"
git branch -M main
git remote add origin https://github.com/USERNAME/NAMA-REPO.git
git push -u origin main
```

Catatan:

- Jangan upload `database.json`.
- File itu sudah masuk `.gitignore`.

### 3. Import Repository di Vercel

1. Buka dashboard Vercel.
2. Klik `Add New`.
3. Pilih `Project`.
4. Pilih repository GitHub aplikasi ini.
5. Framework preset: pilih `Other`.
6. Build command: kosongkan.
7. Output directory: kosongkan atau isi `.`.
8. Klik `Deploy`.

Setelah selesai, Vercel akan memberi URL seperti:

```text
https://nama-project.vercel.app
```

## Kenapa Login Belum Aman Kalau Langsung Deploy

Login/register saat ini mengarah ke endpoint `/api/...`, tetapi endpoint itu masih ditangani oleh `server.js` lokal.

Di Vercel, endpoint harus dibuat dalam folder:

```text
api/
```

Contoh:

```text
api/register.js
api/login.js
api/logout.js
api/me.js
api/data.js
```

Setiap file menjadi function sendiri.

## Struktur Production yang Disarankan

Struktur final yang lebih cocok untuk Vercel:

```text
.
├── api/
│   ├── register.js
│   ├── login.js
│   ├── logout.js
│   ├── me.js
│   └── data.js
├── index.html
├── app.js
├── styles.css
├── manifest.webmanifest
├── service-worker.js
├── icons/
│   └── icon.svg
├── package.json
└── vercel.json
```

## Database yang Disarankan

Pilih salah satu:

### Supabase

Paling mudah untuk pemula.

Yang perlu dibuat:

- Table `users`
- Table `financial_data`

Contoh schema:

```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  password_salt text not null,
  password_hash text not null,
  created_at timestamptz default now()
);

create table financial_data (
  user_id uuid primary key references users(id) on delete cascade,
  data jsonb not null default '{"transactions":[],"budgets":[],"bills":[],"freedomGoal":null}'::jsonb,
  updated_at timestamptz default now()
);
```

Environment variables di Vercel:

```text
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SESSION_SECRET=isi-random-panjang
```

Jangan taruh key ini di frontend.

## Langkah Full Production

### 1. Buat Database Supabase

1. Buka https://supabase.com
2. Buat project baru.
3. Buka SQL Editor.
4. Jalankan schema `users` dan `financial_data` di atas.
5. Ambil `Project URL`.
6. Ambil `Service Role Key`.

### 2. Tambahkan Environment Variables di Vercel

Di Vercel:

1. Buka Project.
2. Masuk `Settings`.
3. Masuk `Environment Variables`.
4. Tambahkan:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SESSION_SECRET
```

Setelah env diubah, lakukan redeploy.

### 3. Ubah Backend Lokal ke Vercel Functions

Backend `server.js` perlu dipecah menjadi function di folder `api/`.

Endpoint yang perlu ada:

- `POST /api/register`
- `POST /api/login`
- `POST /api/logout`
- `GET /api/me`
- `PUT /api/data`

Frontend `app.js` sudah memakai endpoint `/api/...`, jadi setelah API production dibuat, frontend tidak perlu banyak berubah.

### 4. Deploy Ulang

Push perubahan ke GitHub:

```bash
git add .
git commit -m "Prepare Vercel production backend"
git push
```

Vercel akan deploy otomatis jika repo sudah terhubung.

## Checklist Sebelum Public

- `database.json` tidak ikut deploy.
- Password tetap di-hash.
- Session tidak pakai memory.
- API pakai database cloud.
- Environment variables sudah diisi.
- Register, login, tambah transaksi, laporan, dan logout dites di URL Vercel.
- PWA bisa dibuka dan install dari Chrome Android.

## Referensi

- Vercel Deployments: https://vercel.com/docs/deployments
- Vercel Functions: https://vercel.com/docs/functions
- Vercel Environment Variables: https://vercel.com/docs/environment-variables
