/*
  # Add module hierarchy and role permissions

  1. Changes
    - Add parent_id to modules table for hierarchy
    - Add role_permissions columns for view and edit access
    - Add foreign key constraint for parent_id
    - Update RLS policies

  2. Security
    - Enable RLS
    - Add policies for role-based access
*/

-- Add parent_id to modules table
ALTER TABLE modules
ADD COLUMN parent_id uuid REFERENCES modules(id) ON DELETE CASCADE,
ADD COLUMN view_roles user_role[] NOT NULL DEFAULT ARRAY['admin'::user_role],
ADD COLUMN edit_roles user_role[] NOT NULL DEFAULT ARRAY['admin'::user_role];

-- Update RLS policies for modules
DROP POLICY IF EXISTS "Users can view authorized modules" ON modules;
DROP POLICY IF EXISTS "Admins and back office can manage modules" ON modules;

-- Allow users to view modules based on their role
CREATE POLICY "Users can view authorized modules"
ON modules
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = ANY(modules.view_roles)
  )
);

-- Allow users to edit modules based on their role
CREATE POLICY "Users can edit authorized modules"
ON modules
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = ANY(modules.edit_roles)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = ANY(modules.edit_roles)
  )
);

-- Update sub_modules table to inherit permissions from parent module
DROP POLICY IF EXISTS "Users can view authorized sub_modules" ON sub_modules;
DROP POLICY IF EXISTS "Admins and back office can manage sub_modules" ON sub_modules;

CREATE POLICY "Users can view authorized sub_modules"
ON sub_modules
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM modules
    WHERE modules.id = sub_modules.module_id
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = ANY(modules.view_roles)
    )
  )
);

CREATE POLICY "Users can edit authorized sub_modules"
ON sub_modules
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM modules
    WHERE modules.id = sub_modules.module_id
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = ANY(modules.edit_roles)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM modules
    WHERE modules.id = sub_modules.module_id
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = ANY(modules.edit_roles)
    )
  )
);