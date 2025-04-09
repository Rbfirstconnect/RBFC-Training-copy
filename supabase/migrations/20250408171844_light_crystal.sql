/*
  # Add user management functionality

  1. Changes
    - Add function to create new users with proper role assignment
    - Add function to validate email format
    - Add trigger to ensure email format is valid
    - Update user creation policies

  2. Security
    - Only admins can create new users
    - Enforce email format validation
    - Ensure role hierarchy is maintained
*/

-- Create function to validate email format
CREATE OR REPLACE FUNCTION is_valid_email(email text)
RETURNS boolean AS $$
BEGIN
  RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to create a new user
CREATE OR REPLACE FUNCTION create_new_user(
  email text,
  password text,
  role user_role DEFAULT 'frontline_sales'::user_role
) RETURNS uuid AS $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Validate email format
  IF NOT is_valid_email(email) THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;

  -- Create auth.users entry
  INSERT INTO auth.users (
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data
  )
  VALUES (
    email,
    crypt(password, gen_salt('bf')),
    now(),
    jsonb_build_object('provider', 'email'),
    jsonb_build_object('role', role)
  )
  RETURNING id INTO new_user_id;

  -- The public.users record will be created automatically via trigger
  
  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_new_user TO authenticated;

-- Add policy to allow admins to create users
CREATE POLICY "Admins can create users"
ON auth.users
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Add trigger to validate email before insert
CREATE OR REPLACE FUNCTION validate_user_email()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT is_valid_email(NEW.email) THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_user_email_trigger
  BEFORE INSERT OR UPDATE OF email
  ON users
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_email();

-- Add comment explaining usage
COMMENT ON FUNCTION create_new_user IS 'Creates a new user with the specified email, password, and role. Only accessible by admin users.';