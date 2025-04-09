/*
  # Fix user creation function

  1. Changes
    - Drop existing function to avoid conflicts
    - Create new function with proper UUID handling
    - Add proper error handling and validation
    - Ensure proper order of operations
    
  2. Security
    - Maintain security definer setting
    - Keep execution permission for authenticated users
*/

-- Drop existing function
DROP FUNCTION IF EXISTS create_new_user(text, text, user_role);

-- Create new function with proper implementation
CREATE OR REPLACE FUNCTION create_new_user(
  email TEXT,
  password TEXT,
  role user_role DEFAULT 'frontline_sales'::user_role
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id uuid;
  user_data json;
BEGIN
  -- Input validation
  IF NOT is_valid_email(email) THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;

  -- Generate new UUID first
  new_user_id := gen_random_uuid();

  -- Create auth.users entry first
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    aud,
    role
  )
  VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    email,
    crypt(password, gen_salt('bf')),
    now(),
    jsonb_build_object('provider', 'email'),
    jsonb_build_object('role', role),
    now(),
    now(),
    'authenticated',
    'authenticated'
  );

  -- Then create public.users entry with the same UUID
  INSERT INTO public.users (
    id,
    email,
    role,
    created_at
  )
  VALUES (
    new_user_id,
    email,
    role,
    now()
  )
  RETURNING json_build_object(
    'id', id,
    'email', email,
    'role', role,
    'created_at', created_at
  ) INTO user_data;

  RETURN user_data;

EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Email already exists';
  WHEN others THEN
    -- Include the error message for debugging
    RAISE EXCEPTION 'Failed to create user: %', SQLERRM;
END;
$$;

-- Revoke public access and grant to authenticated users
REVOKE EXECUTE ON FUNCTION create_new_user FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_new_user TO authenticated;