# Aplikasi Keuangan & Financial Freedom

Aplikasi keuangan pribadi untuk mencatat pemasukan, pengeluaran, anggaran, tagihan, aset, dan target financial freedom.

Project ini dibuat sebagai aplikasi **offline-first**. Tidak ada login, tidak ada server, dan tidak ada database cloud. Semua data tersimpan di perangkat pengguna.

## Fitur

- Dashboard ringkas keuangan harian dan bulanan.
- Catat pemasukan dan pengeluaran.
- Format nominal Rupiah dengan titik ribuan, contoh `1.000.000`.
- Laporan bulanan per kategori.
- Anggaran per kategori.
- Pengingat tagihan.
- Kalkulator financial freedom.
- Dashboard aset/tempat penyimpanan uang:
  - Bank BCA
  - Bank BNI
  - Stockbit
  - Binance
  - Tunai
  - E-wallet
  - Investasi
  - Crypto
  - Lainnya
- Mobile friendly.
- Bisa dibuild menjadi APK Android dengan Capacitor.

## Penyimpanan Data

Data disimpan di perangkat menggunakan `localStorage`.

Konsekuensi:

- Aplikasi bisa berjalan tanpa internet setelah terpasang.
- Tidak perlu akun.
- Tidak perlu backend.
- Data tidak otomatis pindah ke perangkat lain.
- Jika data aplikasi/browser dihapus, data keuangan ikut hilang.

## Struktur Project

```text
.
├── .github/workflows/build-apk.yml
├── icons/
│   └── icon.svg
├── scripts/
│   └── prepare-capacitor-web.js
├── app.js
├── capacitor.config.json
├── index.html
├── manifest.webmanifest
├── package.json
├── service-worker.js
└── styles.css
```

## Jalankan sebagai Website Lokal

Karena aplikasi ini statis, file bisa dibuka langsung lewat browser.

Cara paling sederhana:

1. Buka `index.html`.
2. Gunakan aplikasi.

Untuk pengalaman PWA/service worker yang lebih lengkap, jalankan dengan static server.

Contoh:

```bash
npx serve .
```

## Build APK Android

APK dibuat otomatis dengan GitHub Actions.

Cara mengambil APK:

1. Buka tab `Actions` di repository GitHub.
2. Pilih workflow `Build Android APK`.
3. Buka run terbaru yang statusnya sukses.
4. Download artifact:

```text
aplikasi-keuangan-debug-apk
```

Di dalam ZIP ada file:

```text
app-debug.apk
```

## Install APK di Android

1. Pindahkan APK ke HP Android.
2. Buka file APK.
3. Jika diminta, aktifkan izin `Install unknown apps`.
4. Install aplikasi.

Catatan: APK ini adalah **debug APK**, cocok untuk testing pribadi. Untuk distribusi resmi atau Play Store, perlu build release APK/AAB dan signing key.

## Build APK Manual

Jika Java dan Android SDK sudah tersedia:

```bash
npm install
npm run apk:debug
```

Output APK:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Catatan Keamanan

Aplikasi ini tidak mengirim data ke server. Semua data berada di perangkat pengguna.

Karena tidak ada akun dan backup cloud, pengguna sebaiknya tidak menghapus data aplikasi jika masih membutuhkan catatan keuangan yang tersimpan.
