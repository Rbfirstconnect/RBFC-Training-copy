/*
  # Add module ordering functionality

  1. Changes
    - Add display_order column to modules table
    - Update existing modules with default order
    - Add function to reorder modules
    
  2. Security
    - Maintain existing RLS policies
*/

-- Add display_order column to modules table
ALTER TABLE modules
ADD COLUMN display_order INTEGER DEFAULT 0;

-- Update existing modules with order based on creation date
WITH ordered_modules AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY folder_id ORDER BY created_at) as rn
  FROM modules
)
UPDATE modules m
SET display_order = om.rn
FROM ordered_modules om
WHERE m.id = om.id;

-- Create function to reorder modules
CREATE OR REPLACE FUNCTION reorder_modules(
  p_module_id UUID,
  p_new_order INTEGER
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_folder_id UUID;
  v_old_order INTEGER;
BEGIN
  -- Get the module's current folder and order
  SELECT folder_id, display_order
  INTO v_folder_id, v_old_order
  FROM modules
  WHERE id = p_module_id;

  -- Update orders of other modules in the same folder
  IF p_new_order > v_old_order THEN
    -- Moving down: update modules between old and new position
    UPDATE modules
    SET display_order = display_order - 1
    WHERE folder_id = v_folder_id
    AND display_order > v_old_order
    AND display_order <= p_new_order;
  ELSE
    -- Moving up: update modules between new and old position
    UPDATE modules
    SET display_order = display_order + 1
    WHERE folder_id = v_folder_id
    AND display_order >= p_new_order
    AND display_order < v_old_order;
  END IF;

  -- Set the new order for the target module
  UPDATE modules
  SET display_order = p_new_order
  WHERE id = p_module_id;
END;
$$;