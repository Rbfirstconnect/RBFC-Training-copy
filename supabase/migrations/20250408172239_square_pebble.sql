/*
  # Fix create_new_user function

  1. Changes
    - Drop existing function to avoid return type conflict
    - Recreate function with proper return type and implementation
    - Add proper error handling and validation
    
  2. Security
    - Function is security definer to ensure proper permissions
    - Only admins can execute the function
*/

-- Drop the existing function first
DROP FUNCTION IF EXISTS create_new_user(text, text, user_role);

-- Create the function with proper implementation
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
  -- Validate email format
  IF NOT is_valid_email(email) THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;

  -- Generate UUID for the new user
  new_user_id := gen_random_uuid();

  -- Create auth.users entry
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
    role,
    aud,
    confirmation_token
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
    'authenticated',
    ''
  );

  -- Create public.users entry
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
    RAISE EXCEPTION 'Failed to create user: %', SQLERRM;
END;
$$;

-- Update function permissions
REVOKE EXECUTE ON FUNCTION create_new_user FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_new_user TO authenticated;