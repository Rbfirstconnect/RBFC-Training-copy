export interface User {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export type UserRole = 'admin' | 'back_office' | 'rm' | 'asm' | 'market_lead' | 'frontline_sales';

export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  'admin': 'Admin',
  'back_office': 'Back Office',
  'rm': 'Regional Head',
  'asm': 'Area Head',
  'market_lead': 'Market Head',
  'frontline_sales': 'Sales Executive'
};

export interface Module {
  id: string;
  title: string;
  description: string;
  parent_id: string | null;
  view_roles: UserRole[];
  edit_roles: UserRole[];
  created_at: string;
  created_by: string;
}

export interface Folder {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface SubModule {
  id: string;
  module_id: string;
  title: string;
  content: string;
  steps: InstructionStep[];
  created_at: string;
  created_by: string;
}

export interface InstructionStep {
  order: number;
  description: string;
  image_url?: string;
}