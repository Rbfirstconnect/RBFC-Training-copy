/*
  # Add steps column to sub_modules

  1. Changes
    - Add steps column to sub_modules table with JSONB type
    - Update RLS policies for sub_modules
*/

-- Add steps column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sub_modules' 
    AND column_name = 'steps'
  ) THEN
    ALTER TABLE sub_modules ADD COLUMN steps JSONB;
  END IF;
END $$;

-- Update RLS policies
DROP POLICY IF EXISTS "Users can view authorized sub_modules" ON sub_modules;
DROP POLICY IF EXISTS "Admins and back office can manage sub_modules" ON sub_modules;

CREATE POLICY "Users can view authorized sub_modules"
ON sub_modules FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM role_permissions rp
    JOIN users u ON u.role = rp.role
    WHERE u.id = auth.uid()
    AND rp.module_id = sub_modules.module_id
    AND rp.can_view = true
  )
);

CREATE POLICY "Admins and back office can manage sub_modules"
ON sub_modules FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'back_office')
  )
);