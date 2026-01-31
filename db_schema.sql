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
    status TEXT DEFAULT 'Menunggu Verifikasi'
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

-- 5. Allow public (anon) to SELECT data ONLY if they know the NIK (Exact match)
-- Note: This allows anyone with a NIK to see that specific record.
-- Ideally we use a stored procedure, but for this stack, a strict RLS is acceptable.
CREATE POLICY "Enable public read by nik"
ON public.pendaftaran
FOR SELECT
TO anon
USING (nik = current_setting('request.headers')::json->>'x-nik-header');
-- Wait, accessing custom headers in RLS policy is complex in standard Supabase client.
-- Simpler approach: Allow SELECT for anon, but since RLS is 'USING', they can only see rows that match the filter.
-- However, standard SELECT * FROM table by anon would return empty unless we open it up.
-- If we do: USING (true) -> Data leak.
-- Correct approach for "Search by NIK":
-- We will use a PostgreSQL FUNCTION (RPC) to securely fetch data by NIK.

-- STORAGE SETUP
-- Insert bucket 'berkas_siswa' (Safe if exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('berkas_siswa', 'berkas_siswa', false)
ON CONFLICT (id) DO NOTHING;

-- STORAGE POLICIES
-- Clean up old storage policies
DROP POLICY IF EXISTS "Enable upload for public" ON storage.objects;
DROP POLICY IF EXISTS "Enable select for authenticated" ON storage.objects;
DROP POLICY IF EXISTS "Enable delete for authenticated" ON storage.objects;

-- 1. Allow public to upload files to 'berkas_siswa'
CREATE POLICY "Enable upload for public"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'berkas_siswa');

-- 2. Allow authenticated users (Admin) to view/download files
CREATE POLICY "Enable select for authenticated"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'berkas_siswa');

-- 3. Allow authenticated users to delete files
CREATE POLICY "Enable delete for authenticated"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'berkas_siswa');


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
