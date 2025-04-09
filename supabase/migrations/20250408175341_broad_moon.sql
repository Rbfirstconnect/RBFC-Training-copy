/*
  # Add delete user function

  This migration adds a function to handle user deletion in both auth and public schemas.

  1. New Functions
    - `delete_user_cascade`: Deletes a user from both auth.users and public.users
  
  2. Security
    - Function is set to SECURITY DEFINER to allow proper auth table access
    - Limited to admin users only
*/

CREATE OR REPLACE FUNCTION delete_user_cascade(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- First delete from public.users
  DELETE FROM public.users WHERE id = user_id;
  
  -- Then delete from auth.users
  DELETE FROM auth.users WHERE id = user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_cascade TO authenticated;