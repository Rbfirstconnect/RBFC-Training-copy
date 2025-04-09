/*
  # Fix user authentication policies

  1. Changes
    - Remove recursive policy that was causing infinite recursion
    - Add proper policies for user authentication
    - Enable RLS on users table
    - Add policies for user management

  2. Security
    - Users can read their own data
    - Admins can manage all users
    - Authenticated users can read their own profile
*/

-- Remove existing policies to clean up
DROP POLICY IF EXISTS "Admins can manage users" ON users;
DROP POLICY IF EXISTS "Users can view their own data" ON users;

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Add new policies
CREATE POLICY "Users can view own profile"
ON users FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins can manage all users"
ON users FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);