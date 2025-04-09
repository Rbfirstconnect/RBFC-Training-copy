/*
  # Fix password hashing in create_new_user function
  
  1. Changes
    - Enable pgcrypto extension for password hashing
    - Update create_new_user function to use proper password hashing
  
  2. Security
    - Uses secure password hashing with pgcrypto
    - Maintains existing RLS policies
*/

-- Enable the pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS create_new_user;

-- Recreate the function with proper password hashing
CREATE OR REPLACE FUNCTION create_new_user(
  email text,
  password text,
  role user_role DEFAULT 'frontline_sales'::user_role
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user json;
  user_id uuid;
BEGIN
  -- Create the user in auth.users
  user_id := gen_random_uuid();
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    aud,
    role
  )
  VALUES (
    user_id,
    '00000000-0000-0000-0000-000000000000',
    email,
    crypt(password, gen_salt('bf')),
    NOW(),
    'authenticated',
    'authenticated'
  );

  -- Create the user in public.users
  INSERT INTO public.users (id, email, role)
  VALUES (user_id, email, role);

  -- Return the created user
  SELECT json_build_object(
    'id', u.id,
    'email', u.email,
    'role', u.role
  )
  INTO new_user
  FROM public.users u
  WHERE u.id = user_id;

  RETURN new_user;
END;
$$;