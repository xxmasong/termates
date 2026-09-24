import type { AuthError } from '../types';
const request = async <T>(path: string, body: object): Promise<T> => { const response = await fetch(path, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); if (!response.ok) throw (await response.json().catch(() => ({ error: 'Request failed.' }))) as AuthError; return response.json().catch(() => undefined) as Promise<T>; };
export const login = (email: string, password: string) => request<{ ok: true }>('/auth/login', { email, password });
export const signup = (name: string, email: string, password: string, plan: string, inviteCode?: string) => request<{ status: 'verify_email' }>('/auth/signup', { name, email, password, plan, ...(inviteCode ? { inviteCode } : {}) });
export const resendVerification = (email: string) => request<undefined>('/auth/verify/resend', { email });
export const forgotPassword = (email: string) => request<undefined>('/auth/password/forgot', { email });
export const resetPassword = (token: string, password: string) => request<undefined>('/auth/password/reset', { token, password });
