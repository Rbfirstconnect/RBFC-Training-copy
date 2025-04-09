/*
  # Handle new user signup

  This migration adds a trigger to automatically:
  1. Create a new user record in the public.users table
  2. Set the default role to 'frontline_sales' for new signups
  
  Changes:
  - Creates a trigger function to handle new user creation
  - Adds a trigger to auth.users table
  - Includes proper error handling
*/

-- First, ensure we have the required extensions
CREATE EXTENSION IF NOT EXISTS "plpgsql";

-- Drop existing trigger and function if they exist to ensure clean state
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_signup();

-- Create the function with proper error handling
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  default_role user_role := 'frontline_sales'::user_role;
BEGIN
  -- Add error handling block
  BEGIN
    INSERT INTO public.users (
      id,
      email,
      role,
      created_at
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(
        (NEW.raw_user_meta_data->>'role')::user_role,
        default_role
      ),
      COALESCE(NEW.created_at, now())
    );
  EXCEPTION 
    WHEN unique_violation THEN
      -- Skip if user already exists
      RETURN NEW;
    WHEN others THEN
      RAISE EXCEPTION 'Error creating user: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- Create the trigger with a more specific name
CREATE TRIGGER on_auth_user_created_insert_user
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_signup();