import { API_URL } from './api';
import type { CVData } from './types';
export interface AccountUser { id: string; name: string; email: string | null; local: boolean }
export interface Session { user: AccountUser | null; sso: { label: string } | null }
export interface CVSummary { id: string; title: string; revision: number; updatedAt: string }
export interface SavedCV extends CVSummary { cv: CVData }
export class AccountError extends Error {
  code: string;
  status: number;
  constructor(code: string, status: number) { super(code); this.code = code; this.status = status; }
}
let expectedAccount: string | null = null;
export function setExpectedAccount(id: string | null) { expectedAccount = id; }
export async function accountRequest<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method, credentials: 'same-origin',
    headers: { ...(expectedAccount ? { 'X-OpenCV-User': expectedAccount } : {}), ...(method === 'GET' ? {} : { 'Content-Type': 'application/json', 'X-OpenCV-Request': '1' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new AccountError(data.error || 'server_error', response.status);
  }
  return response.status === 204 ? undefined as T : response.json();
}
