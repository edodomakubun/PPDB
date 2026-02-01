-- Fix: Allow Admins to UPLOAD files to berkas_siswa bucket
-- Run this in Supabase SQL Editor

CREATE POLICY "Enable upload for authenticated berkas"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'berkas_siswa');
