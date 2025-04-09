/*
  # Add role hierarchy function and trigger

  1. New Functions
    - `get_higher_roles`: Returns an array of roles that are higher in hierarchy than the given role
    - `expand_role_array`: Expands an array of roles to include all higher roles for each role

  2. Changes
    - Add trigger to automatically include higher roles when roles are assigned to modules
*/

-- Create function to get higher roles based on hierarchy
CREATE OR REPLACE FUNCTION get_higher_roles(base_role user_role)
RETURNS user_role[] AS $$
BEGIN
  CASE base_role
    WHEN 'frontline_sales' THEN
      RETURN ARRAY['market_lead', 'dm', 'asm', 'rm', 'back_office', 'admin']::user_role[];
    WHEN 'market_lead' THEN
      RETURN ARRAY['dm', 'asm', 'rm', 'back_office', 'admin']::user_role[];
    WHEN 'dm' THEN
      RETURN ARRAY['asm', 'rm', 'back_office', 'admin']::user_role[];
    WHEN 'asm' THEN
      RETURN ARRAY['rm', 'back_office', 'admin']::user_role[];
    WHEN 'rm' THEN
      RETURN ARRAY['back_office', 'admin']::user_role[];
    WHEN 'back_office' THEN
      RETURN ARRAY['admin']::user_role[];
    WHEN 'admin' THEN
      RETURN ARRAY[]::user_role[];
    ELSE
      RETURN ARRAY[]::user_role[];
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to expand role array with higher roles
CREATE OR REPLACE FUNCTION expand_role_array(roles user_role[])
RETURNS user_role[] AS $$
DECLARE
  result user_role[];
  role user_role;
BEGIN
  result := roles;
  
  FOREACH role IN ARRAY roles
  LOOP
    result := array_cat(result, get_higher_roles(role));
  END LOOP;
  
  -- Remove duplicates and sort
  SELECT ARRAY_AGG(DISTINCT r ORDER BY r::text)
  INTO result
  FROM unnest(result) r;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add trigger to automatically expand roles when modules are created or updated
CREATE OR REPLACE FUNCTION expand_module_roles()
RETURNS TRIGGER AS $$
BEGIN
  NEW.view_roles := expand_role_array(NEW.view_roles);
  NEW.edit_roles := expand_role_array(NEW.edit_roles);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER expand_module_roles_trigger
  BEFORE INSERT OR UPDATE OF view_roles, edit_roles
  ON modules
  FOR EACH ROW
  EXECUTE FUNCTION expand_module_roles();