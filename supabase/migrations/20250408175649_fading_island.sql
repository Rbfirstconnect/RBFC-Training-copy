/*
  # Fix get_all_users function return type

  1. Changes
    - Drop existing get_all_users function
    - Recreate function with correct return type
    - Maintain security settings and permissions

  2. Security
    - Function remains security definer
    - Maintains proper search path
    - Keeps existing permissions
*/

-- First drop the existing function
DROP FUNCTION IF EXISTS get_all_users();

-- Recreate the function with the correct return type
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (
  id uuid,
  email text,
  role text,
  created_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.role::text,
    u.created_at
  FROM public.users u
  ORDER BY u.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_all_users TO authenticated;