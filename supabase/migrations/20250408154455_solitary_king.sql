/*
  # Create storage bucket for training images

  1. Changes
    - Create a new storage bucket for training images
    - Set up storage policies for authenticated users and admins/back office
    - Use explicit table aliases to avoid ambiguity
*/

-- Create bucket for training images
INSERT INTO storage.buckets (id, name, public)
VALUES ('training-images', 'training-images', false);

-- Policy to allow authenticated users to read training images
CREATE POLICY "Authenticated users can read training images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'training-images');

-- Policy to allow admins and back office to manage training images
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
);