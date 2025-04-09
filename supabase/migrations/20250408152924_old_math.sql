/*
  # Initial Schema Setup for Training Portal

  1. Tables
    - users
      - Custom fields for user profile and role
    - modules
      - Main training modules
    - sub_modules
      - Sub-sections within modules
    - role_permissions
      - Module access control by role
    
  2. Security
    - Enable RLS on all tables
    - Set up access policies
*/

-- Create enum for user roles
CREATE TYPE user_role AS ENUM (
  'admin',
  'back_office',
  'rm',
  'asm',
  'dm',
  'market_lead',
  'frontline_sales'
);

-- Create users table
CREATE TABLE users (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'frontline_sales',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create modules table
CREATE TABLE modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- Create sub_modules table
CREATE TABLE sub_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  steps JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- Create role_permissions table
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL,
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  can_view BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, module_id)
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Policies for users table
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can manage all users" ON users
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Policies for modules
CREATE POLICY "Users can view authorized modules" ON modules
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM role_permissions rp
      JOIN users u ON u.role = rp.role
      WHERE u.id = auth.uid()
      AND rp.module_id = modules.id
      AND rp.can_view = true
    )
  );

CREATE POLICY "Admins and back office can manage modules" ON modules
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'back_office')
    )
  );

-- Policies for sub_modules
CREATE POLICY "Users can view authorized sub_modules" ON sub_modules
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM role_permissions rp
      JOIN users u ON u.role = rp.role
      WHERE u.id = auth.uid()
      AND rp.module_id = sub_modules.module_id
      AND rp.can_view = true
    )
  );

CREATE POLICY "Admins and back office can manage sub_modules" ON sub_modules
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'back_office')
    )
  );

-- Policies for role_permissions
CREATE POLICY "Only admins can manage role permissions" ON role_permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_modules_updated_at
  BEFORE UPDATE ON modules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sub_modules_updated_at
  BEFORE UPDATE ON sub_modules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();