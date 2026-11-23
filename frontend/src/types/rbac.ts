export type AppRole = 'free_user' | 'paid_user' | 'administrator';

export const APP_ROLES: AppRole[] = ['free_user', 'paid_user', 'administrator'];

export interface AdminUserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  role: AppRole;
  expires_at: string | null; // ISO timestamp or null (never expires)
  created_at: string;
}

export interface UpdateUserAccessInput {
  userId: string;
  role: AppRole;
  expiresAt: string | null;
  fullName: string | null;
}