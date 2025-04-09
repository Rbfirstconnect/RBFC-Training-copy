/*
  # Fix users table RLS policies

  1. Changes
    - Remove recursive policies that were causing infinite loops
    - Simplify admin policy to use direct role check
    - Update user view policy to use direct id comparison
    
  2. Security
    - Maintains existing security model but fixes implementation
    - Admins can still manage all users
    - Users can still view their own profile
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage all users" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;

-- Create new, non-recursive policies
CREATE POLICY "Admins can manage all users"
ON users
FOR ALL
TO authenticated
USING (auth.jwt()->>'role' = 'admin')
WITH CHECK (auth.jwt()->>'role' = 'admin');

CREATE POLICY "Users can view own profile"
ON users
FOR SELECT
TO authenticated
USING (auth.uid() = id);