import type { AdminInviteCode, AdminUser, UserRole } from '../types';

interface ApiErrorResponse {
  error?: string;
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function readJsonResponse<T extends ApiErrorResponse>(response: Response, fallbackMessage: string): Promise<T> {
  const data = await response.json() as T;
  if (!response.ok) {
    throw new Error(data.error || fallbackMessage);
  }
  return data;
}

export async function listInviteCodes(token: string): Promise<AdminInviteCode[]> {
  const response = await fetch('/api/admin/invite-codes', { headers: { Authorization: `Bearer ${token}` } });
  const data = await readJsonResponse<{ codes: AdminInviteCode[]; error?: string }>(response, 'Unable to load invite codes.');
  return data.codes;
}

export async function generateInviteCodes(token: string, count: number): Promise<AdminInviteCode[]> {
  const response = await fetch('/api/admin/invite-codes', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ count }),
  });
  const data = await readJsonResponse<{ codes: AdminInviteCode[]; error?: string }>(response, 'Unable to generate invite codes.');
  return data.codes;
}

export async function deleteInviteCode(token: string, code: string): Promise<void> {
  const response = await fetch(`/api/admin/invite-codes/${encodeURIComponent(code)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  await readJsonResponse<ApiErrorResponse>(response, 'Unable to delete invite code.');
}

export async function listUsers(token: string): Promise<AdminUser[]> {
  const response = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } });
  const data = await readJsonResponse<{ users: AdminUser[]; error?: string }>(response, 'Unable to load users.');
  return data.users;
}

export async function updateUserRole(token: string, id: string, role: UserRole): Promise<void> {
  const response = await fetch(`/api/admin/users/${id}/role`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ role }),
  });
  await readJsonResponse<ApiErrorResponse>(response, 'Unable to update user role.');
}

export async function deleteUser(token: string, id: string): Promise<void> {
  const response = await fetch(`/api/admin/users/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  await readJsonResponse<ApiErrorResponse>(response, 'Unable to delete user.');
}
