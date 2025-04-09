/*
  # Fix search path for create_new_user function

  1. Changes
    - Set search path to include extensions schema
    - Ensure pgcrypto functions are accessible
    - Update function definition with proper schema access
*/

-- Drop existing function
DROP FUNCTION IF EXISTS create_new_user(text, text, user_role);

-- Recreate function with proper search path
CREATE OR REPLACE FUNCTION create_new_user(
  email text,
  password text,
  role user_role DEFAULT 'frontline_sales'::user_role
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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