/*
  # Fix role hierarchy implementation

  1. Changes
    - Update get_higher_roles function to correctly handle role hierarchy (admin highest, frontline lowest)
    - Update expand_role_array function to maintain correct hierarchy order
*/

-- Create function to get higher roles based on hierarchy (admin highest, frontline lowest)
CREATE OR REPLACE FUNCTION get_lower_roles(base_role user_role)
RETURNS user_role[] AS $$
BEGIN
  CASE base_role
    WHEN 'admin' THEN
      RETURN ARRAY['back_office', 'rm', 'asm', 'dm', 'market_lead', 'frontline_sales']::user_role[];
    WHEN 'back_office' THEN
      RETURN ARRAY['rm', 'asm', 'dm', 'market_lead', 'frontline_sales']::user_role[];
    WHEN 'rm' THEN
      RETURN ARRAY['asm', 'dm', 'market_lead', 'frontline_sales']::user_role[];
    WHEN 'asm' THEN
      RETURN ARRAY['dm', 'market_lead', 'frontline_sales']::user_role[];
    WHEN 'dm' THEN
      RETURN ARRAY['market_lead', 'frontline_sales']::user_role[];
    WHEN 'market_lead' THEN
      RETURN ARRAY['frontline_sales']::user_role[];
    WHEN 'frontline_sales' THEN
      RETURN ARRAY[]::user_role[];
    ELSE
      RETURN ARRAY[]::user_role[];
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to expand role array with lower roles
CREATE OR REPLACE FUNCTION expand_role_array(roles user_role[])
RETURNS user_role[] AS $$
DECLARE
  result user_role[];
  role user_role;
BEGIN
  result := roles;
  
  FOREACH role IN ARRAY roles
  LOOP
    result := array_cat(result, get_lower_roles(role));
  END LOOP;
  
  -- Remove duplicates and sort in hierarchical order (admin first, frontline last)
  SELECT ARRAY_AGG(DISTINCT r ORDER BY 
    CASE r 
      WHEN 'admin' THEN 1
      WHEN 'back_office' THEN 2
      WHEN 'rm' THEN 3
      WHEN 'asm' THEN 4
      WHEN 'dm' THEN 5
      WHEN 'market_lead' THEN 6
      WHEN 'frontline_sales' THEN 7
    END)
  INTO result
  FROM unnest(result) r;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;