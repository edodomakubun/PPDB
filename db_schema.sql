-- Create the 'pendaftaran' table (Safe if exists)
CREATE TABLE IF NOT EXISTS public.pendaftaran (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    nama_lengkap TEXT NOT NULL,
    nik TEXT NOT NULL,
    tempat_lahir TEXT NOT NULL,
    tanggal_lahir DATE NOT NULL,
    jenis_kelamin TEXT NOT NULL,
    agama TEXT NOT NULL,
    alamat TEXT NOT NULL,
    nama_ayah TEXT NOT NULL,
    pekerjaan_ayah TEXT,
    nama_ibu TEXT NOT NULL,
    pekerjaan_ibu TEXT,
    no_hp TEXT NOT NULL,
    asal_sekolah TEXT,
    foto_url TEXT,
    kk_url TEXT,
    akte_url TEXT,
    status TEXT DEFAULT 'Menunggu Verifikasi',
    custom_data JSONB DEFAULT '{}'::JSONB
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.pendaftaran ENABLE ROW LEVEL SECURITY;

-- CLEANUP OLD POLICIES (To avoid errors on re-run)
DROP POLICY IF EXISTS "Enable insert for public" ON public.pendaftaran;
DROP POLICY IF EXISTS "Enable select for authenticated" ON public.pendaftaran;
DROP POLICY IF EXISTS "Enable update for authenticated" ON public.pendaftaran;
DROP POLICY IF EXISTS "Enable delete for authenticated" ON public.pendaftaran;
DROP POLICY IF EXISTS "Enable public read by nik" ON public.pendaftaran;

-- Create policies for 'pendaftaran' table
-- 1. Allow anyone (anon) to insert data (Registration)
CREATE POLICY "Enable insert for public"
ON public.pendaftaran
FOR INSERT
TO anon
WITH CHECK (true);

-- 2. Allow authenticated users (Admin) to view all data
CREATE POLICY "Enable select for authenticated"
ON public.pendaftaran
FOR SELECT
TO authenticated
USING (true);

-- 3. Allow authenticated users (Admin) to update data (e.g., change status)
CREATE POLICY "Enable update for authenticated"
ON public.pendaftaran
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 4. Allow authenticated users (Admin) to delete data
CREATE POLICY "Enable delete for authenticated"
ON public.pendaftaran
FOR DELETE
TO authenticated
USING (true);


-- ==========================================
-- NEW TABLES FOR ADMIN FEATURES
-- ==========================================

-- 1. App Settings (For Open/Close Registration & School Info)
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Admin can do everything, Public can READ ONLY
DROP POLICY IF EXISTS "Enable read for public settings" ON public.app_settings;
DROP POLICY IF EXISTS "Enable full access for admin settings" ON public.app_settings;

CREATE POLICY "Enable read for public settings"
ON public.app_settings FOR SELECT TO anon USING (true);

CREATE POLICY "Enable full access for admin settings"
ON public.app_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Insert default setting if not exists
INSERT INTO public.app_settings (key, value)
VALUES ('registration_status', '"open"')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.app_settings (key, value)
VALUES ('school_profile', '{"nama_sekolah": "SD INPRES LELINGLUAN", "alamat": "Jl. Contoh No. 123, Desa Lelingluan", "kepala_sekolah": "SOFERET S DOMAKUBUN, S.Pd", "logo_url": "https://via.placeholder.com/150"}')
ON CONFLICT (key) DO NOTHING;


-- 2. Admin Profiles (To list committee members)
CREATE TABLE IF NOT EXISTS public.admin_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    email TEXT NOT NULL UNIQUE,
    nama TEXT
);

ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Only Admins can view/manage this table
DROP POLICY IF EXISTS "Enable full access for admin profiles" ON public.admin_profiles;

CREATE POLICY "Enable full access for admin profiles"
ON public.admin_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- 3. Form Fields (For Dynamic Form Builder)
CREATE TABLE IF NOT EXISTS public.form_fields (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    label TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- text, date, select, textarea, file
    required BOOLEAN DEFAULT false,
    options TEXT, -- JSON array string or comma separated for select
    section TEXT DEFAULT 'default', -- identity, parents, files, custom
    order_index INTEGER DEFAULT 0
);

ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for public form_fields" ON public.form_fields;
DROP POLICY IF EXISTS "Enable full access for admin form_fields" ON public.form_fields;

CREATE POLICY "Enable read for public form_fields"
ON public.form_fields FOR SELECT TO anon USING (true);

CREATE POLICY "Enable full access for admin form_fields"
ON public.form_fields FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed Initial Form Fields (Only if table is empty)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.form_fields) THEN
        INSERT INTO public.form_fields (label, name, type, required, section, order_index, options) VALUES
        ('Nama Lengkap', 'nama_lengkap', 'text', true, 'identity', 1, NULL),
        ('NIK', 'nik', 'number', true, 'identity', 2, NULL),
        ('Tempat Lahir', 'tempat_lahir', 'text', true, 'identity', 3, NULL),
        ('Tanggal Lahir', 'tanggal_lahir', 'date', true, 'identity', 4, NULL),
        ('Jenis Kelamin', 'jenis_kelamin', 'select', true, 'identity', 5, 'Laki-laki,Perempuan'),
        ('Agama', 'agama', 'select', true, 'identity', 6, 'Islam,Kristen,Katolik,Hindu,Buddha,Konghucu'),
        ('Alamat Lengkap', 'alamat', 'textarea', true, 'identity', 7, NULL),
        ('Asal Sekolah', 'asal_sekolah', 'text', false, 'identity', 8, NULL),
        ('Nama Ayah', 'nama_ayah', 'text', true, 'parents', 9, NULL),
        ('Pekerjaan Ayah', 'pekerjaan_ayah', 'text', false, 'parents', 10, NULL),
        ('Nama Ibu', 'nama_ibu', 'text', true, 'parents', 11, NULL),
        ('Pekerjaan Ibu', 'pekerjaan_ibu', 'text', false, 'parents', 12, NULL),
        ('No. HP / WhatsApp', 'no_hp', 'number', true, 'parents', 13, NULL),
        ('Pas Foto (Maks 2MB)', 'file_foto', 'file', true, 'files', 14, NULL),
        ('Kartu Keluarga (KK)', 'file_kk', 'file', true, 'files', 15, NULL),
        ('Akta Kelahiran', 'file_akte', 'file', true, 'files', 16, NULL);
    END IF;
END $$;


-- ==========================================
-- FEATURE TABLES: ANNOUNCEMENTS & AUDIT LOGS
-- ==========================================

-- 4. Announcements
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_published BOOLEAN DEFAULT true
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for public announcements" ON public.announcements;
DROP POLICY IF EXISTS "Enable full access for admin announcements" ON public.announcements;

CREATE POLICY "Enable read for public announcements"
ON public.announcements FOR SELECT TO anon USING (is_published = true);

CREATE POLICY "Enable full access for admin announcements"
ON public.announcements FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- 5. Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    admin_email TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    ip_address TEXT
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable full access for admin audit_logs" ON public.audit_logs;

-- Only Admins can insert/view logs. No public access.
CREATE POLICY "Enable full access for admin audit_logs"
ON public.audit_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ==========================================
-- FEATURE TABLES: FAQ & GALLERY
-- ==========================================

-- 6. FAQs
CREATE TABLE IF NOT EXISTS public.faqs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    order_index INTEGER DEFAULT 0
);

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for public faqs" ON public.faqs;
DROP POLICY IF EXISTS "Enable full access for admin faqs" ON public.faqs;

CREATE POLICY "Enable read for public faqs" ON public.faqs FOR SELECT TO anon USING (true);
CREATE POLICY "Enable full access for admin faqs" ON public.faqs FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- 7. Gallery
CREATE TABLE IF NOT EXISTS public.school_gallery (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    image_url TEXT NOT NULL,
    caption TEXT
);

ALTER TABLE public.school_gallery ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for public gallery" ON public.school_gallery;
DROP POLICY IF EXISTS "Enable full access for admin gallery" ON public.school_gallery;

CREATE POLICY "Enable read for public gallery" ON public.school_gallery FOR SELECT TO anon USING (true);
CREATE POLICY "Enable full access for admin gallery" ON public.school_gallery FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ==========================================
-- STORAGE SETUP
-- ==========================================
-- Insert bucket 'berkas_siswa' (Safe if exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('berkas_siswa', 'berkas_siswa', false)
ON CONFLICT (id) DO NOTHING;

-- Insert bucket 'gallery_images' (Public Access)
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery_images', 'gallery_images', true)
ON CONFLICT (id) DO NOTHING;


-- STORAGE POLICIES
-- Clean up old storage policies
DROP POLICY IF EXISTS "Enable upload for public" ON storage.objects;
DROP POLICY IF EXISTS "Enable select for authenticated" ON storage.objects;
DROP POLICY IF EXISTS "Enable delete for authenticated" ON storage.objects;
DROP POLICY IF EXISTS "Enable read for public gallery" ON storage.objects;
DROP POLICY IF EXISTS "Enable full access for admin gallery" ON storage.objects;

-- 1. BERKAS SISWA POLICIES
CREATE POLICY "Enable upload for public berkas"
ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'berkas_siswa');

CREATE POLICY "Enable select for authenticated berkas"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'berkas_siswa');

CREATE POLICY "Enable delete for authenticated berkas"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'berkas_siswa');

-- 2. GALLERY POLICIES
CREATE POLICY "Enable read for public gallery"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'gallery_images');

CREATE POLICY "Enable full access for admin gallery"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'gallery_images')
WITH CHECK (bucket_id = 'gallery_images');


-- SECURE FUNCTION FOR CHECKING STATUS
CREATE OR REPLACE FUNCTION get_status_siswa(search_nik TEXT)
RETURNS TABLE (
  nama_lengkap TEXT,
  nik TEXT,
  status TEXT,
  alamat TEXT,
  asal_sekolah TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (Admin)
AS $$
BEGIN
  RETURN QUERY
  SELECT p.nama_lengkap, p.nik, p.status, p.alamat, p.asal_sekolah
  FROM public.pendaftaran p
  WHERE p.nik = search_nik;
END;
$$;

-- SECURE FUNCTION FOR CHECKING NIK EXISTENCE
CREATE OR REPLACE FUNCTION check_nik_availability(check_nik TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.pendaftaran WHERE nik = check_nik);
END;
$$;
