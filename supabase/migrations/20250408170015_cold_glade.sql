/*
  # Fix module roles implementation

  1. Changes
    - Drop existing role-related triggers and functions
    - Add new function for role validation
    - Update modules table constraints
    - Add proper validation for role arrays
    
  2. Security
    - Maintain RLS policies
    - Ensure role hierarchy is properly enforced
*/

-- Drop existing function and trigger
DROP TRIGGER IF EXISTS expand_module_roles_trigger ON modules;
DROP FUNCTION IF EXISTS expand_module_roles();
DROP FUNCTION IF EXISTS expand_role_array(user_role[]);
DROP FUNCTION IF EXISTS get_higher_roles(user_role);
DROP FUNCTION IF EXISTS get_lower_roles(user_role);

-- Create function to validate roles
CREATE OR REPLACE FUNCTION validate_role_array(roles user_role[])
RETURNS user_role[] AS $$
DECLARE
  valid_roles user_role[];
  role user_role;
BEGIN
  -- Initialize with empty array
  valid_roles := ARRAY[]::user_role[];
  
  -- Add each role only once
  FOREACH role IN ARRAY roles
  LOOP
    IF NOT (role = ANY(valid_roles)) THEN
      valid_roles := array_append(valid_roles, role);
    END IF;
  END LOOP;
  
  -- Sort roles
  SELECT array_agg(r ORDER BY 
    CASE r 
      WHEN 'admin'::user_role THEN 1
      WHEN 'back_office'::user_role THEN 2
      WHEN 'rm'::user_role THEN 3
      WHEN 'asm'::user_role THEN 4
      WHEN 'dm'::user_role THEN 5
      WHEN 'market_lead'::user_role THEN 6
      WHEN 'frontline_sales'::user_role THEN 7
    END)
  INTO valid_roles
  FROM unnest(valid_roles) r;
  
  RETURN valid_roles;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add check constraint to ensure arrays are valid
ALTER TABLE modules 
  ADD CONSTRAINT valid_view_roles 
  CHECK (view_roles @> ARRAY['admin']::user_role[]),
  ADD CONSTRAINT valid_edit_roles 
  CHECK (edit_roles @> ARRAY['admin']::user_role[]);

-- Create trigger function to validate roles before insert/update
CREATE OR REPLACE FUNCTION validate_module_roles()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure admin is always included
  IF NOT ('admin'::user_role = ANY(NEW.view_roles)) THEN
    NEW.view_roles := array_append(NEW.view_roles, 'admin'::user_role);
  END IF;
  
  IF NOT ('admin'::user_role = ANY(NEW.edit_roles)) THEN
    NEW.edit_roles := array_append(NEW.edit_roles, 'admin'::user_role);
  END IF;
  
  -- Validate and clean up arrays
  NEW.view_roles := validate_role_array(NEW.view_roles);
  NEW.edit_roles := validate_role_array(NEW.edit_roles);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER validate_module_roles_trigger
  BEFORE INSERT OR UPDATE OF view_roles, edit_roles
  ON modules
  FOR EACH ROW
  EXECUTE FUNCTION validate_module_roles();