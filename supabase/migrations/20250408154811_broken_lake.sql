/*
  # Fix storage permissions for image uploads

  1. Storage Setup
    - Create training-images bucket with public access
    - Drop existing policies to avoid conflicts
    - Create new policies with proper permissions

  2. Security Policies
    - Allow authenticated users to upload images
    - Allow public access to view images
    - Allow admins and back office to manage all images
*/

-- Create bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('training-images', 'training-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Public access to read images" ON storage.objects;
DROP POLICY IF EXISTS "Admins and back office can manage all images" ON storage.objects;
DROP POLICY IF EXISTS "Admins and back office can manage training images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view training images" ON storage.objects;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'training-images');

-- Allow public access to view images
CREATE POLICY "Public access to read images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'training-images');

-- Allow admins and back office to manage all images
CREATE POLICY "Admins and back office can manage all images"
ON storage.objects 
FOR ALL
TO authenticated
USING (
  bucket_id = 'training-images' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'back_office')
  )
)
WITH CHECK (
  bucket_id = 'training-images' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'back_office')
  )
);