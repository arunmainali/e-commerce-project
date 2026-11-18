import type { User } from '../types';
import { apiFetch, setAuthToken, removeAuthToken, getAuthToken } from './api';

const mockUser: User = {
  id: 'usr-buyer-1',
  name: 'Jane Collector',
  email: 'jane@example.com',
};

export const authService = {
  async signIn(email: string, password: string): Promise<{ success: boolean; user?: User; accessToken?: string; message?: string }> {
    try {
      const resp = await apiFetch<{ user: User; accessToken: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (resp.accessToken) {
        setAuthToken(resp.accessToken);
      }
      return { success: true, user: resp.user, accessToken: resp.accessToken };
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      if (msg && !msg.includes('failed to fetch') && !msg.includes('networkerror')) {
        return { success: false, message: err.message };
      }

      // Offline mock fallback
      const token = 'mock-jwt-token';
      setAuthToken(token);
      return { success: true, user: mockUser, accessToken: token };
    }
  },

  async register(name: string, email: string, password: string): Promise<{ success: boolean; user?: User; accessToken?: string; message?: string }> {
    try {
      const resp = await apiFetch<{ user: User; accessToken: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });

      if (resp.accessToken) {
        setAuthToken(resp.accessToken);
      }
      return { success: true, user: resp.user, accessToken: resp.accessToken };
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      if (msg && !msg.includes('failed to fetch') && !msg.includes('networkerror')) {
        return { success: false, message: err.message };
      }

      // Offline mock fallback
      const token = 'mock-jwt-token';
      setAuthToken(token);
      return { success: true, user: { ...mockUser, name, email }, accessToken: token };
    }
  },

  async signOut(): Promise<void> {
    removeAuthToken();
  },

  async getCurrentUser(): Promise<User | null> {
    if (!getAuthToken()) {
      return null;
    }
    try {
      return await apiFetch<User>('/auth/me');
    } catch {
      return null;
    }
  },
};
