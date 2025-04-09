/*
  # Add folder system for modules

  1. New Tables
    - `folders`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `description` (text, optional)
      - `created_at` (timestamp)
      - `created_by` (uuid, references users)
      - `updated_at` (timestamp)
      - `updated_by` (uuid, references users)

  2. Changes
    - Add `folder_id` to modules table
    - Update RLS policies

  3. Security
    - Enable RLS on folders table
    - Add policies for folder management
*/

-- Create folders table
CREATE TABLE IF NOT EXISTS folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id)
);

-- Add folder_id to modules
ALTER TABLE modules ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES folders(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- Policies for folders
CREATE POLICY "Users can view folders"
  ON folders
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins and back office can manage folders"
  ON folders
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'back_office')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'back_office')
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_folders_updated_at
  BEFORE UPDATE ON folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();