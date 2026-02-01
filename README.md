<div align="center">

  <img src="https://img.icons8.com/fluency/96/school.png" alt="Logo Sekolah" width="80" />

  # SPMB SD INPRES LELINGLUAN
  **Sistem Penerimaan Murid Baru Berbasis Web**

  [![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/HTML5)
  [![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
  [![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
  [![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

  <p>
    Platform digital modern untuk mempermudah proses pendaftaran siswa baru di SD Inpres Lelingluan. <br>
    Cepat, Ringan, dan Tanpa Backend Server Tradisional.
  </p>

  [Lihat Demo (Coming Soon)](https://sekolah-anda.pages.dev/) • [Laporkan Bug](https://github.com/username/repo/issues)

</div>

---

## 📋 Tentang Aplikasi

Aplikasi ini dibangun untuk mendigitalkan proses formulir pendaftaran yang sebelumnya manual. Dibangun dengan pendekatan **Static Site** namun memiliki kemampuan dinamis berkat **Supabase** (Database as a Service).

Aplikasi ini tidak memerlukan instalasi `npm` atau `build tools` yang rumit karena menggunakan Tailwind CSS v4 via CDN dan Vanilla Javascript.

## ✨ Fitur Utama

| Fitur | Deskripsi |
| :--- | :--- |
| 🚀 **Modern UI/UX** | Halaman depan informatif dengan alur pendaftaran yang jelas. |
| 📝 **Pendaftaran Online** | Form pendaftaran lengkap dengan validasi input real-time. |
| 📂 **Upload Berkas** | Mendukung upload Foto, Kartu Keluarga (KK), dan Akta Kelahiran. |
| 🔐 **Admin Panel** | Dashboard khusus panitia dengan autentikasi aman. |
| 📊 **Manajemen Data** | Lihat, Verifikasi (Terima/Tolak), dan Hapus data pendaftar. |

## 📸 Preview

<div align="center">
  <img src="https://via.placeholder.com/600x300?text=Screenshot+Halaman+Depan" alt="Halaman Depan" width="45%" />
  <img src="https://via.placeholder.com/600x300?text=Screenshot+Panel+Admin" alt="Panel Admin" width="45%" />
</div>

## 📂 Struktur Folder

Berikut adalah struktur file proyek untuk memudahkan navigasi kode:

```text
SPMB-PROJECT/
├── 📂 public/              # Root direktori untuk deployment
│   ├── 📂 admin/           # Halaman Dashboard & Login Admin
│   │   ├── index.html
│   │   └── dashboard.html
│   ├── 📂 assets/          # Gambar, Logo, dan Icon
│   ├── 📂 js/              # Logika Aplikasi (Core)
│   │   ├── auth.js         # Handle Login/Logout
│   │   ├── config.js       # Konfigurasi Supabase Client
│   │   └── crud.js         # Operasi Database & Storage
│   └── index.html          # Halaman Utama Pendaftaran
├── db_schema.sql           # Script setup database
└── README.md               # Dokumentasi ini

```

## 🛠️ Instalasi & Setup

Ikuti langkah-langkah berikut untuk menjalankan project ini di akun Supabase Anda sendiri.

### 1. Persiapan Database (Supabase)

Karena kita menggunakan versi *Client-side only*, setup database dilakukan manual via SQL Editor:

1. Login ke [Dashboard Supabase](https://www.google.com/search?q=https://app.supabase.com/).
2. Buat Project baru.
3. Masuk ke menu **SQL Editor** (Icon 📝 di sidebar kiri).
4. Klik **New Query**.
5. Copy seluruh isi file `db_schema.sql` dari repository ini.
6. Klik tombol **Run** di pojok kanan bawah.

> **Script ini otomatis akan:**
> * Membuat tabel `pendaftaran`.
> * Membuat Storage Bucket `berkas_siswa`.
> * Mengaktifkan Row Level Security (RLS).
> * Membuat Policy keamanan (Siapa yang boleh baca/tulis/hapus).
> 
> 

### 2. Buat Akun Admin

Supabase tidak mengizinkan pembuatan user via SQL murni untuk keamanan. Lakukan ini manual:

1. Masuk ke menu **Authentication** > **Users**.
2. Klik **Add User**.
3. Isi Email: `admin@sekolah.id` (Sesuaikan).
4. Isi Password yang kuat.
5. Klik **Create User**.
6. *(Opsional)* Matikan "Confirm Email" di menu *Providers > Email* jika ingin langsung login tanpa verifikasi email.

### 3. Konfigurasi Client

Buka file `public/js/config.js` dan sesuaikan kredensial dengan project Anda:

```javascript
// public/js/config.js
const SUPABASE_URL = '[https://xyzcompany.supabase.co](https://xyzcompany.supabase.co)';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

```

## ☁️ Cara Deploy (Cloudflare Pages)

Cara termudah dan gratis untuk menghosting web ini:

1. Push kode ini ke GitHub/GitLab Anda.
2. Buka [Cloudflare Pages Dashboard](https://www.google.com/search?q=https://dash.cloudflare.com/%3Fto%3D/:account/pages).
3. Klik **Create a project** > **Connect to Git**.
4. Pilih repository project ini.
5. Pada bagian **Build settings**, atur sebagai berikut:
* **Framework preset:** `None` / `Static HTML`
* **Build command:** *(Biarkan Kosong)*
* **Build output directory:** `public`


6. Klik **Save & Deploy**.

Web SPMB SD Inpres Lelingluan siap digunakan! 🎉

## 🤝 Kontribusi & Credits

Dikembangkan oleh **Tim IT SD Inpres Lelingluan**.

Dibuat dengan ❤️ untuk kemajuan pendidikan.

---

© 2025 SD Inpres Lelingluan. All Rights Reserved.
