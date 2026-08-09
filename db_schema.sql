-- ==========================================
-- 1. ADMIN PROFILES (MUST BE FIRST)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.admin_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    email TEXT NOT NULL UNIQUE,
    nama TEXT
);

ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

-- CLEANUP OLD POLICIES TO PREVENT CONFLICTS
DROP POLICY IF EXISTS "Enable full access for admin profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Enable select for authenticated profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Enable write for admin profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Enable update delete for admin profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Enable delete for admin profiles" ON public.admin_profiles;

-- BOOTSTRAPPING: Allow any authenticated user to SELECT (to check if they are admin)
CREATE POLICY "Enable select for authenticated profiles"
ON public.admin_profiles FOR SELECT TO authenticated USING (true);

-- Allow any authenticated user to INSERT (Bootstrap Phase Only - Secure in Prod)
CREATE POLICY "Enable write for admin profiles"
ON public.admin_profiles FOR INSERT TO authenticated
WITH CHECK (true);

-- Allow Admins to Update/Delete
CREATE POLICY "Enable update delete for admin profiles"
ON public.admin_profiles FOR UPDATE TO authenticated
USING (auth.jwt()->>'email' IN (SELECT email FROM admin_profiles));

CREATE POLICY "Enable delete for admin profiles"
ON public.admin_profiles FOR DELETE TO authenticated
USING (auth.jwt()->>'email' IN (SELECT email FROM admin_profiles));


-- ==========================================
-- 2. PENDAFTARAN TABLE
-- ==========================================
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

-- Ensure custom_data exists (if table already created)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pendaftaran' AND column_name = 'custom_data') THEN
        ALTER TABLE public.pendaftaran ADD COLUMN custom_data JSONB DEFAULT '{}'::JSONB;
    END IF;
END $$;

ALTER TABLE public.pendaftaran ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable insert for public" ON public.pendaftaran;
DROP POLICY IF EXISTS "Enable select for authenticated" ON public.pendaftaran;
DROP POLICY IF EXISTS "Enable update for authenticated" ON public.pendaftaran;
DROP POLICY IF EXISTS "Enable delete for authenticated" ON public.pendaftaran;
DROP POLICY IF EXISTS "Enable public read by nik" ON public.pendaftaran;

-- 1. Allow anyone (anon) to insert data
CREATE POLICY "Enable insert for public"
ON public.pendaftaran FOR INSERT TO anon
WITH CHECK (true);

-- 1b. Allow Admins (authenticated) to insert data (Manual Entry)
CREATE POLICY "Enable insert for authenticated"
ON public.pendaftaran FOR INSERT TO authenticated
WITH CHECK (auth.jwt()->>'email' IN (SELECT email FROM admin_profiles));

-- 2. Allow Admins to view all data
CREATE POLICY "Enable select for authenticated"
ON public.pendaftaran FOR SELECT TO authenticated
USING (auth.jwt()->>'email' IN (SELECT email FROM admin_profiles));

-- 3. Allow Admins to update data
CREATE POLICY "Enable update for authenticated"
ON public.pendaftaran FOR UPDATE TO authenticated
USING (auth.jwt()->>'email' IN (SELECT email FROM admin_profiles))
WITH CHECK (auth.jwt()->>'email' IN (SELECT email FROM admin_profiles));

-- 4. Allow Admins to delete data
CREATE POLICY "Enable delete for authenticated"
ON public.pendaftaran FOR DELETE TO authenticated
USING (auth.jwt()->>'email' IN (SELECT email FROM admin_profiles));


-- ==========================================
-- 3. APP SETTINGS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for public settings" ON public.app_settings;
DROP POLICY IF EXISTS "Enable full access for admin settings" ON public.app_settings;

CREATE POLICY "Enable read for public settings"
ON public.app_settings FOR SELECT TO anon USING (true);

-- Relaxed policy to prevent lockout: Allow ANY authenticated user to edit settings
-- (Assuming only admins can login via Supabase Auth in this context)
CREATE POLICY "Enable full access for admin settings"
ON public.app_settings FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

INSERT INTO public.app_settings (key, value)
VALUES ('registration_status', '"open"')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.app_settings (key, value)
VALUES ('school_profile', '{"nama_sekolah": "SD INPRES LELINGLUAN", "alamat": "Jl. Contoh No. 123, Desa Lelingluan", "kepala_sekolah": "SOFERET S DOMAKUBUN, S.Pd", "logo_url": "https://via.placeholder.com/150"}')
ON CONFLICT (key) DO NOTHING;


-- ==========================================
-- 4. FORM FIELDS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.form_fields (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    label TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    required BOOLEAN DEFAULT false,
    options TEXT,
    section TEXT DEFAULT 'default',
    order_index INTEGER DEFAULT 0
);

ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for public form_fields" ON public.form_fields;
DROP POLICY IF EXISTS "Enable full access for admin form_fields" ON public.form_fields;

CREATE POLICY "Enable read for public form_fields"
ON public.form_fields FOR SELECT TO anon USING (true);

CREATE POLICY "Enable full access for admin form_fields"
ON public.form_fields FOR ALL TO authenticated
USING (auth.jwt()->>'email' IN (SELECT email FROM admin_profiles))
WITH CHECK (auth.jwt()->>'email' IN (SELECT email FROM admin_profiles));

-- Seed Initial Form Fields
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
        ('No. Kartu Keluarga (KK)', 'no_kk', 'number', true, 'parents', 9, NULL),
        ('Nama Ayah', 'nama_ayah', 'text', true, 'parents', 10, NULL),
        ('Tahun Lahir Ayah', 'tahun_lahir_ayah', 'number', false, 'parents', 11, NULL),
        ('Pekerjaan Ayah', 'pekerjaan_ayah', 'text', false, 'parents', 12, NULL),
        ('Nama Ibu', 'nama_ibu', 'text', true, 'parents', 13, NULL),
        ('NIK Ibu', 'nik_ibu', 'number', false, 'parents', 14, NULL),
        ('Tahun Lahir Ibu', 'tahun_lahir_ibu', 'number', false, 'parents', 15, NULL),
        ('Pekerjaan Ibu', 'pekerjaan_ibu', 'text', false, 'parents', 16, NULL),
        ('No. HP / WhatsApp', 'no_hp', 'number', true, 'parents', 17, NULL),
        ('Pas Foto (Maks 2MB)', 'file_foto', 'file', true, 'files', 18, NULL),
        ('Kartu Keluarga (KK)', 'file_kk', 'file', true, 'files', 19, NULL),
        ('Akta Kelahiran', 'file_akte', 'file', true, 'files', 20, NULL);
    END IF;
END $$;


-- ==========================================
-- 5. ANNOUNCEMENTS
-- ==========================================
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
ON public.announcements FOR ALL TO authenticated
USING (auth.jwt()->>'email' IN (SELECT email FROM admin_profiles))
WITH CHECK (auth.jwt()->>'email' IN (SELECT email FROM admin_profiles));


-- ==========================================
-- 6. AUDIT LOGS
-- ==========================================
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

CREATE POLICY "Enable full access for admin audit_logs"
ON public.audit_logs FOR ALL TO authenticated
USING (auth.jwt()->>'email' IN (SELECT email FROM admin_profiles))
WITH CHECK (auth.jwt()->>'email' IN (SELECT email FROM admin_profiles));


-- ==========================================
-- 7. FAQS
-- ==========================================
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
CREATE POLICY "Enable full access for admin faqs" ON public.faqs FOR ALL TO authenticated
USING (auth.jwt()->>'email' IN (SELECT email FROM admin_profiles))
WITH CHECK (auth.jwt()->>'email' IN (SELECT email FROM admin_profiles));


-- ==========================================
-- 8. GALLERY
-- ==========================================
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
CREATE POLICY "Enable full access for admin gallery" ON public.school_gallery FOR ALL TO authenticated
USING (auth.jwt()->>'email' IN (SELECT email FROM admin_profiles))
WITH CHECK (auth.jwt()->>'email' IN (SELECT email FROM admin_profiles));


-- ==========================================
-- 9. LANDING PAGE CONTENT
-- ==========================================
CREATE TABLE IF NOT EXISTS public.landing_page_content (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL
);

ALTER TABLE public.landing_page_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for public landing content" ON public.landing_page_content;
DROP POLICY IF EXISTS "Enable full access for admin landing content" ON public.landing_page_content;

CREATE POLICY "Enable read for public landing content" ON public.landing_page_content FOR SELECT TO anon USING (true);

-- Relaxed policy: Allow any authenticated user (Admin) to edit content
CREATE POLICY "Enable full access for admin landing content" ON public.landing_page_content FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Seed Default Landing Content
INSERT INTO public.landing_page_content (key, value)
VALUES ('hero_section', '{"title": "Membangun Generasi <br class=\"hidden md:block\" /> <span class=\"text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600\">Cerdas & Berkarakter</span>", "subtitle": "Bergabunglah bersama kami di <span class=\"school-name-text font-bold text-slate-800\">SD INPRES LELINGLUAN</span>. Kami berkomitmen mencetak siswa berprestasi dengan lingkungan belajar yang modern dan islami.", "badge": "✨ Penerimaan Peserta Didik Baru 2024"}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.landing_page_content (key, value)
VALUES ('features_section', '{"title": "Mengapa Memilih Kami?", "subtitle": "Keunggulan pendidikan yang kami tawarkan."}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.landing_page_content (key, value)
VALUES ('cta_section', '{"title": "Siap Bergabung Bersama Kami?", "subtitle": "Kuota terbatas. Segera daftarkan putra-putri Anda dan jadilah bagian dari keluarga besar kami."}')
ON CONFLICT (key) DO NOTHING;


-- ==========================================
-- STORAGE SETUP
-- ==========================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('berkas_siswa', 'berkas_siswa', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery_images', 'gallery_images', true)
ON CONFLICT (id) DO NOTHING;


-- STORAGE POLICIES
DROP POLICY IF EXISTS "Enable upload for public" ON storage.objects;
DROP POLICY IF EXISTS "Enable select for authenticated" ON storage.objects;
DROP POLICY IF EXISTS "Enable delete for authenticated" ON storage.objects;
DROP POLICY IF EXISTS "Enable read for public gallery" ON storage.objects;
DROP POLICY IF EXISTS "Enable full access for admin gallery" ON storage.objects;
DROP POLICY IF EXISTS "Enable upload for public berkas" ON storage.objects;
DROP POLICY IF EXISTS "Enable select for authenticated berkas" ON storage.objects;
DROP POLICY IF EXISTS "Enable delete for authenticated berkas" ON storage.objects;

-- 1. BERKAS SISWA POLICIES
CREATE POLICY "Enable upload for public berkas"
ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'berkas_siswa');

CREATE POLICY "Enable upload for authenticated berkas"
ON storage.objects FOR INSERT TO authenticated
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


-- ==========================================
-- FUNCTIONS
-- ==========================================
CREATE OR REPLACE FUNCTION get_status_siswa(search_nik TEXT)
RETURNS TABLE (
  nama_lengkap TEXT,
  nik TEXT,
  status TEXT,
  alamat TEXT,
  asal_sekolah TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT p.nama_lengkap, p.nik, p.status, p.alamat, p.asal_sekolah
  FROM public.pendaftaran p
  WHERE p.nik = search_nik;
END;
$$;

CREATE OR REPLACE FUNCTION check_nik_availability(check_nik TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.pendaftaran WHERE nik = check_nik);
END;
$$;
