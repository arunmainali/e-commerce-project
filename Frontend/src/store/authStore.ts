import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';
import { setAuthToken, removeAuthToken, getAuthToken } from '../services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  signIn: (user: User, token?: string) => void;
  signOut: () => void;
  setHydrated: (val: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isHydrated: false,
      signIn: (user, token) => {
        const authToken = token || getAuthToken() || 'mock-jwt-token';
        setAuthToken(authToken);
        set({ user, token: authToken, isAuthenticated: true, isHydrated: true });
      },
      signOut: () => {
        removeAuthToken();
        set({ user: null, token: null, isAuthenticated: false, isHydrated: true });
      },
      setHydrated: (val: boolean) => set({ isHydrated: val }),
    }),
    {
      name: 'auction-studio-auth',
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (state.token) {
            setAuthToken(state.token);
            if (state.user) {
              state.isAuthenticated = true;
            }
          } else {
            const stored = getAuthToken();
            if (stored) {
              state.token = stored;
              if (state.user) {
                state.isAuthenticated = true;
              }
            }
          }
          state.isHydrated = true;
        }
      },
    }
  )
);
