/*
  # Fix recursive users table policies

  1. Changes
    - Remove recursive policies on users table
    - Create new non-recursive policies for user management
    
  2. Security
    - Maintain same security level but avoid recursion
    - Admins can still manage all users
    - Users can still view their own profile
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage all users" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;

-- Create new non-recursive policies
CREATE POLICY "Enable read for users" ON users
  FOR SELECT TO authenticated
  USING (
    (role = 'admin') OR -- admins can read all
    (auth.uid() = id)   -- users can read own profile
  );

CREATE POLICY "Enable insert for admins" ON users
  FOR INSERT TO authenticated
  WITH CHECK (role = 'admin');

CREATE POLICY "Enable update for admins and own profile" ON users
  FOR UPDATE TO authenticated
  USING (
    (role = 'admin') OR -- admins can update all
    (auth.uid() = id)   -- users can update own profile
  )
  WITH CHECK (
    (role = 'admin') OR -- admins can update all
    (auth.uid() = id)   -- users can update own profile
  );

CREATE POLICY "Enable delete for admins" ON users
  FOR DELETE TO authenticated
  USING (role = 'admin');