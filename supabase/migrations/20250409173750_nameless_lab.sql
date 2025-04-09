/*
  # Restrict reordering to admin users

  1. Changes
    - Modify reorder_folders function to check for admin role
    - Modify reorder_modules function to check for admin role
    
  2. Security
    - Only admins can reorder folders and modules
    - Throws error for non-admin users
*/

-- Drop existing functions
DROP FUNCTION IF EXISTS reorder_folders(UUID, INTEGER);
DROP FUNCTION IF EXISTS reorder_modules(UUID, INTEGER);

-- Recreate reorder_folders with admin check
CREATE OR REPLACE FUNCTION reorder_folders(
  p_folder_id UUID,
  p_new_order INTEGER
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_order INTEGER;
  v_user_role user_role;
BEGIN
  -- Check if user is admin
  SELECT role INTO v_user_role
  FROM public.users
  WHERE id = auth.uid();

  IF v_user_role != 'admin' THEN
    RAISE EXCEPTION 'Only administrators can reorder folders';
  END IF;

  -- Get the folder's current order
  SELECT display_order
  INTO v_old_order
  FROM folders
  WHERE id = p_folder_id;

  -- Update orders of other folders
  IF p_new_order > v_old_order THEN
    UPDATE folders
    SET display_order = display_order - 1
    WHERE display_order > v_old_order
    AND display_order <= p_new_order;
  ELSE
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

-- Recreate reorder_modules with admin check
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
  v_user_role user_role;
BEGIN
  -- Check if user is admin
  SELECT role INTO v_user_role
  FROM public.users
  WHERE id = auth.uid();

  IF v_user_role != 'admin' THEN
    RAISE EXCEPTION 'Only administrators can reorder modules';
  END IF;

  -- Get the module's current folder and order
  SELECT folder_id, display_order
  INTO v_folder_id, v_old_order
  FROM modules
  WHERE id = p_module_id;

  -- Update orders of other modules in the same folder
  IF p_new_order > v_old_order THEN
    UPDATE modules
    SET display_order = display_order - 1
    WHERE folder_id = v_folder_id
    AND display_order > v_old_order
    AND display_order <= p_new_order;
  ELSE
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