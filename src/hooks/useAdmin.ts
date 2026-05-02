import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AdminInviteCode, AdminUser, UserRole } from '../types';
import { deleteInviteCode, deleteUser, generateInviteCodes, listInviteCodes, listUsers, updateUserRole } from '../services/adminService';

export function useAdmin(token: string | null) {
  const [inviteCodes, setInviteCodes] = useState<AdminInviteCode[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generateCount, setGenerateCount] = useState(5);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [codes, userList] = await Promise.all([listInviteCodes(token), listUsers(token)]);
      setInviteCodes(codes);
      setUsers(userList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admin data.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleGenerate = useCallback(async () => {
    if (!token) return;
    setError('');
    try {
      const newCodes = await generateInviteCodes(token, generateCount);
      setInviteCodes((prev) => [...newCodes, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate codes.');
    }
  }, [token, generateCount]);

  const handleDelete = useCallback(async (code: string) => {
    if (!token) return;
    setError('');
    try {
      await deleteInviteCode(token, code);
      setInviteCodes((prev) => prev.filter((c) => c.code !== code));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete code.');
    }
  }, [token]);

  const handleUpdateRole = useCallback(async (userId: string, role: UserRole) => {
    if (!token) return;
    setError('');
    try {
      await updateUserRole(token, userId, role);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role.');
    }
  }, [token]);

  const handleDeleteUser = useCallback(async (userId: string) => {
    if (!token) return;
    setError('');
    try {
      await deleteUser(token, userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user.');
    }
  }, [token]);

  return useMemo(
    () => ({
      inviteCodes,
      users,
      loading,
      error,
      generateCount,
      setGenerateCount,
      loadData,
      handleGenerate,
      handleDelete,
      handleUpdateRole,
      handleDeleteUser,
    }),
    [inviteCodes, users, loading, error, generateCount, loadData, handleGenerate, handleDelete, handleUpdateRole, handleDeleteUser],
  );
}
