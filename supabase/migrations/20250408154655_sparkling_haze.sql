/*
  # Fix storage policies for training images

  1. Storage Setup
    - Creates 'training-images' storage bucket if it doesn't exist
  
  2. Security
    - Drops existing policies to avoid conflicts
    - Re-creates policies for image management and viewing
*/

-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name)
SELECT 'training-images', 'training-images'
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'training-images'
);

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins and back office can manage training images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view training images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read training images" ON storage.objects;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policy to allow admins and back office to manage images
CREATE POLICY "Admins and back office can manage training images"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'training-images' AND (
    EXISTS (
      SELECT 1 
      FROM auth.users AS au
      JOIN public.users AS pu ON pu.id = au.id
      WHERE au.id = auth.uid()
      AND pu.role IN ('admin', 'back_office')
    )
  )
)
WITH CHECK (
  bucket_id = 'training-images' AND (
    EXISTS (
      SELECT 1 
      FROM auth.users AS au
      JOIN public.users AS pu ON pu.id = au.id
      WHERE au.id = auth.uid()
      AND pu.role IN ('admin', 'back_office')
    )
  )
);

-- Create policy to allow all authenticated users to view images
CREATE POLICY "Users can view training images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'training-images');