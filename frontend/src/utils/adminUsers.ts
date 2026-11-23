import { supabase } from '../components/supabaseClient';
import type { AdminUserRow, AppRole, UpdateUserAccessInput } from '../types/rbac';

interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
}

interface EntitlementRow {
  user_id: string;
  role: AppRole;
  expires_at: string | null;
}

export async function fetchAdminUsers(): Promise<AdminUserRow[]> {
  const [profilesRes, entitlementsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, full_name, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('user_entitlements')
      .select('user_id, role, expires_at'),
  ]);

  if (profilesRes.error) {
    throw new Error(`Failed to load profiles: ${profilesRes.error.message}`);
  }
  if (entitlementsRes.error) {
    throw new Error(`Failed to load entitlements: ${entitlementsRes.error.message}`);
  }

  const entitlementByUserId = new Map<string, EntitlementRow>();
  for (const row of (entitlementsRes.data ?? []) as EntitlementRow[]) {
    entitlementByUserId.set(row.user_id, row);
  }

  return ((profilesRes.data ?? []) as ProfileRow[]).map((profile) => {
    const entitlement = entitlementByUserId.get(profile.id);
    return {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      role: entitlement?.role ?? 'free_user',
      expires_at: entitlement?.expires_at ?? null,
      created_at: profile.created_at,
    };
  });
}

export async function updateUserAccess({
  userId,
  role,
  expiresAt,
  fullName,
}: UpdateUserAccessInput): Promise<void> {
  const normalizedExpiresAt = role === 'free_user' ? null : expiresAt;

  const { error: entitlementError } = await supabase
    .from('user_entitlements')
    .upsert(
      {
        user_id: userId,
        role,
        expires_at: normalizedExpiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (entitlementError) {
    throw new Error(`Failed to update entitlement: ${entitlementError.message}`);
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      full_name: fullName?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (profileError) {
    throw new Error(`Failed to update profile: ${profileError.message}`);
  }
}