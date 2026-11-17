import type { User } from '../types';

function delay(ms = 200): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

const mockUser: User = {
  id: 'user-001',
  name: 'Jane Collector',
  email: 'jane@example.com',
};

export const authService = {
  async signIn(_email: string, _password: string): Promise<{ success: boolean; user?: User; message?: string }> {
    await delay(400);
    // Accept any credentials for mock
    return { success: true, user: mockUser };
  },

  async register(_name: string, _email: string, _password: string): Promise<{ success: boolean; user?: User; message?: string }> {
    await delay(400);
    return { success: true, user: { ...mockUser, name: _name, email: _email } };
  },

  async signOut(): Promise<void> {
    await delay(100);
  },

  async getCurrentUser(): Promise<User | null> {
    await delay(100);
    return null;
  },
};
