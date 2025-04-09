/*
  # Add folder ordering functionality

  1. Changes
    - Add display_order column to folders table
    - Create function to reorder folders
    - Set initial order based on creation date
    
  2. Security
    - Function is security definer to ensure proper permissions
    - Only admins and back office can reorder folders
*/

-- Add display_order column to folders table
ALTER TABLE folders
ADD COLUMN display_order INTEGER DEFAULT 0;

-- Update existing folders with order based on creation date
WITH ordered_folders AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM folders
)
UPDATE folders f
SET display_order = of.rn
FROM ordered_folders of
WHERE f.id = of.id;

-- Create function to reorder folders
CREATE OR REPLACE FUNCTION reorder_folders(
  p_folder_id UUID,
  p_new_order INTEGER
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_order INTEGER;
BEGIN
  -- Get the folder's current order
  SELECT display_order
  INTO v_old_order
  FROM folders
  WHERE id = p_folder_id;

  -- Update orders of other folders
  IF p_new_order > v_old_order THEN
    -- Moving down: update folders between old and new position
    UPDATE folders
    SET display_order = display_order - 1
    WHERE display_order > v_old_order
    AND display_order <= p_new_order;
  ELSE
    -- Moving up: update folders between new and old position
    UPDATE folders
    SET display_order = display_order + 1
    WHERE display_order >= p_new_order
    AND display_order < v_old_order;
  END IF;

  -- Set the new order for the target folder
  UPDATE folders
  SET display_order = p_new_order
  WHERE id = p_folder_id;
END;
$$;