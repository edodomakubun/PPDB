-- Fix: Allow Admins to INSERT data into pendaftaran
-- Run this in Supabase SQL Editor

CREATE POLICY "Enable insert for authenticated"
ON public.pendaftaran
FOR INSERT
TO authenticated
WITH CHECK (auth.jwt()->>'email' IN (SELECT email FROM admin_profiles));
