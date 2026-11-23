import React, { useEffect, useState } from 'react';
import { APP_ROLES } from '../../types/rbac';
import type { AdminUserRow, AppRole } from '../../types/rbac';

interface UserRoleEditorModalProps {
  user: AdminUserRow | null;
  onClose: () => void;
  onSave: (payload: {
    userId: string;
    role: AppRole;
    expiresAt: string | null;
  }) => Promise<void>;
}

function toDatetimeLocalValue(isoString: string | null): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function fromDatetimeLocalValue(localValue: string): string | null {
  if (!localValue) return null;
  const date = new Date(localValue);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export const UserRoleEditorModal: React.FC<UserRoleEditorModalProps> = ({
  user,
  onClose,
  onSave,
}) => {
  const [role, setRole] = useState<AppRole>('free_user');
  const [neverExpires, setNeverExpires] = useState<boolean>(true);
  const [expiresLocal, setExpiresLocal] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setRole(user.role);
    setNeverExpires(user.role !== 'paid_user' || user.expires_at === null);
    setExpiresLocal(user.role === 'paid_user' ? toDatetimeLocalValue(user.expires_at) : '');
    setError(null);
  }, [user]);

  if (!user) return null;

  const isPaidUser = role === 'paid_user';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // expires_at is only used/enforced for paid_user
      const expiresAt =
        isPaidUser && !neverExpires ? fromDatetimeLocalValue(expiresLocal) : null;

      await onSave({
        userId: user.id,
        role,
        expiresAt,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-user-role-title"
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 text-gray-900 shadow-xl">
        <h2 id="edit-user-role-title" className="text-lg font-semibold">
          Edit User Role
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          {user.full_name ? `${user.full_name} · ` : ''}
          {user.email ?? user.id}
        </p>
        <p className="mt-0.5 text-xs text-gray-400">
          Email and full name are managed via Supabase Auth.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => {
                const nextRole = e.target.value as AppRole;
                setRole(nextRole);
                if (nextRole !== 'paid_user') {
                  setNeverExpires(true);
                  setExpiresLocal('');
                }
              }}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            >
              {APP_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {isPaidUser && (
            <div className="space-y-2 rounded border border-gray-200 bg-gray-50 p-3">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={neverExpires}
                  onChange={(e) => setNeverExpires(e.target.checked)}
                />
                Never expires
              </label>

              {!neverExpires && (
                <div>
                  <label className="block text-xs font-medium text-gray-600">
                    Expiration Date &amp; Time
                  </label>
                  <input
                    type="datetime-local"
                    value={expiresLocal}
                    onChange={(e) => setExpiresLocal(e.target.value)}
                    required
                    className="mt-1 w-full rounded border border-gray-300 bg-white px-2.5 py-1.5 text-sm"
                  />
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="rounded bg-red-50 p-2 text-xs text-red-700">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};