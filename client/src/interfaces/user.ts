export type Theme = 'light' | 'dark' | 'system';
export type Role = 'admin' | 'manager' | 'staff';

export interface User {
  id: number;
  slug: string;
  name: string;
  email: string;
  email_verified_at: string | null;
  role: Role;
  phone: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}