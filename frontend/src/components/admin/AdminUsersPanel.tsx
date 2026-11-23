import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { APP_ROLES } from '../../types/rbac';
import type { AdminUserRow, AppRole } from '../../types/rbac';
import { fetchAdminUsers, updateUserAccess } from '../../utils/adminUsers';
import { UserRoleEditorModal } from './UserRoleEditorModal';

function formatPaidExpiration(user: AdminUserRow): {
  label: string;
  isExpired: boolean;
} {
  if (user.role !== 'paid_user') {
    return { label: 'N/A', isExpired: false };
  }
  if (!user.expires_at) {
    return { label: 'Never', isExpired: false };
  }
  const date = new Date(user.expires_at);
  const isExpired = date.getTime() <= Date.now();
  return {
    label: date.toLocaleString(),
    isExpired,
  };
}

export const AdminUsersPanel: React.FC = () => {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [search, setSearch] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<'all' | AppRole>('all');
  const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchAdminUsers();
      setUsers(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesQuery =
        !q ||
        (u.email?.toLowerCase().includes(q) ?? false) ||
        (u.full_name?.toLowerCase().includes(q) ?? false) ||
        u.id.toLowerCase().includes(q);
      return matchesRole && matchesQuery;
    });
  }, [users, search, roleFilter]);

  const handleSaveRole = async (payload: {
    userId: string;
    role: AppRole;
    expiresAt: string | null;
  }) => {
    await updateUserAccess({
      userId: payload.userId,
      role: payload.role,
      expiresAt: payload.role === 'paid_user' ? payload.expiresAt : null,
      fullName: null,
    });
    await loadUsers();
    setToast('User role updated.');
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 text-gray-900">
      <div className="mx-auto max-w-6xl rounded-xl bg-white p-6 shadow">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Admin · User Roles</h1>
            <p className="text-sm text-gray-500">
              Assign roles and manage paid entitlement expiration dates.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadUsers()}
              className="rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Refresh
            </button>
            <Link
              to="/"
              className="rounded bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Back to Map
            </Link>
          </div>
        </div>

        {toast && (
          <div className="mt-4 rounded border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
            {toast}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email, full name, or ID..."
            className="w-full max-w-sm rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as 'all' | AppRole)}
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="all">All roles</option>
            {APP_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-500">Loading users...</div>
          ) : error ? (
            <div className="p-8 text-center text-sm text-red-600">{error}</div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">No matching users.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Paid Expiration</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((user) => {
                  const exp = formatPaidExpiration(user);
                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {user.full_name || '—'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {user.email ?? user.id}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block rounded bg-gray-100 px-2 py-1 font-mono text-xs text-gray-800">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            exp.isExpired
                              ? 'font-medium text-red-600'
                              : 'text-gray-700'
                          }
                        >
                          {exp.label}
                          {exp.isExpired ? ' (expired)' : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedUser(user)}
                          className="rounded border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                        >
                          Edit Role
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <UserRoleEditorModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onSave={handleSaveRole}
        />
      </div>
    </div>
  );
};