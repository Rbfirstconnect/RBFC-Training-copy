/*
  # Create function to get all users

  Creates a function that joins auth.users with public.users to get complete user information
*/

CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  role user_role,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    au.email,
    COALESCE(u.role, 'frontline_sales'::user_role) as role,
    COALESCE(u.created_at, au.created_at) as created_at
  FROM auth.users au
  LEFT JOIN public.users u ON u.id = au.id
  ORDER BY created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_all_users TO authenticated;

-- Add policy to restrict access to admins only
CREATE POLICY "Only admins can execute get_all_users"
  ON auth.users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'::user_role
    )
  );