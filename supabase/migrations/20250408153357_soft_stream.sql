/*
  # Fix recursive users table policy

  1. Changes
    - Remove recursive policy that was causing infinite loops
    - Create new policies for user management that avoid recursion
    
  2. Security
    - Maintain RLS security while avoiding recursive queries
    - Ensure admins can still manage all users
    - Users can still view their own data
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Admins can manage all users" ON users;

-- Create new non-recursive policies for admins
CREATE POLICY "Admins can manage users" ON users
FOR ALL TO authenticated
USING (auth.jwt() ->> 'role' = 'admin')
WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- The existing policy for users viewing their own data is fine and can stay:
-- "Users can view their own data" with qual "(uid() = id)"