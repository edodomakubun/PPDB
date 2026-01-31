# SPMB SD INPRES LELINGLUAN

Web Sistem Penerimaan Murid Baru (SPMB) untuk SD Inpres Lelingluan.
Dibangun menggunakan HTML5, Tailwind CSS v4 (via CDN), Javascript, dan Supabase.

## Fitur
- **Halaman Depan:** Informasi sekolah dan alur pendaftaran yang modern.
- **Pendaftaran Online:** Formulir pendaftaran siswa baru dengan upload berkas (Foto, KK, Akta).
- **Panel Admin:**
    - Login Panitia.
    - Dashboard pengelolaan pendaftar.
    - Lihat detail & berkas pendaftar.
    - Terima/Tolak pendaftaran.
    - Hapus data.

## Struktur Folder
- `public/`: Folder utama kode sumber web (Frontend).
- `public/js/`: Logika Javascript (Config, Auth, CRUD).
- `public/admin/`: Halaman dashboard admin.
- `db_schema.sql`: Script SQL untuk setup database Supabase.

## Instalasi & Setup

### 1. Database (Supabase)
Karena keterbatasan akses API untuk membuat tabel, Anda harus menjalankan script SQL secara manual:
1. Buka Dashboard Supabase Anda.
2. Masuk ke menu **SQL Editor**.
3. Buat New Query.
4. Copy & Paste seluruh isi file `db_schema.sql` yang ada di repository ini.
5. Klik **Run**.

Script ini akan:
- Membuat tabel `pendaftaran`.
- Membuat Storage Bucket `berkas_siswa`.
- Mengaktifkan Row Level Security (RLS).
- Membuat Policy keamanan (Siapa yang boleh baca/tulis).

### 2. Akun Admin
Karena alasan keamanan, script SQL tidak dapat membuat user admin. Anda perlu membuatnya secara manual:
1. Buka Dashboard Supabase.
2. Masuk ke menu **Authentication** > **Users**.
3. Klik **Add User**.
4. Masukkan Email: `admin@sekolah.id` (atau email lain sesuai keinginan).
5. Masukkan Password pilihan Anda.
6. Klik **Create User**.

### 4. Konfigurasi
File konfigurasi terdapat di `public/js/config.js`. Jika Anda mengganti Project Supabase, ubah `SUPABASE_URL` dan `SUPABASE_ANON_KEY` di file tersebut.

## Cara Deploy (Cloudflare Pages)
1. Push repository ini ke GitHub/GitLab.
2. Buka Cloudflare Pages dashboard.
3. "Create a project" > "Connect to Git".
4. Pilih repository ini.
5. Pada **Build settings**:
    - **Framework preset:** None / Static HTML.
    - **Build command:** (Kosongkan).
    - **Build output directory:** `public`
6. Save & Deploy.

Web Anda siap digunakan!
