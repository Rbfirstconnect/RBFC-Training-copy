/*
  # Add storage bucket and policies for training images

  1. Storage Setup
    - Create `training-images` bucket for storing training-related images
    - Enable public access for reading images
  
  2. Security
    - Add policies to allow:
      - Authenticated users to upload images
      - Public access to read images
      - Admins and back office users to manage all images
*/

-- Enable storage by creating the storage schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS storage;

-- Create the training-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('training-images', 'training-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'training-images'
  AND (auth.role() IN ('authenticated', 'anon'))
);

-- Policy to allow public access to read images
CREATE POLICY "Public access to read images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'training-images');

-- Policy to allow admins and back office to manage all images
CREATE POLICY "Admins and back office can manage all images"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'training-images'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'back_office')
  )
)
WITH CHECK (
  bucket_id = 'training-images'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'back_office')
  )
);