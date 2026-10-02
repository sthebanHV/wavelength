import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/lib/constants';
import type { User } from '@/types';
import { spotifyService } from '@/services/spotify';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (returnTo?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  handleCallback: (code: string, state: string) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (returnTo = '/') => {
        set({ isLoading: true, error: null });
        try {
          await spotifyService.initiateAuth(returnTo);
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'No se pudo iniciar sesión con Spotify.',
            isLoading: false,
          });
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await spotifyService.logout();
          set({ user: null, isAuthenticated: false, isLoading: false });
        } catch {
          set({ isLoading: false });
        }
      },

      checkAuth: async () => {
        const authenticated = spotifyService.isAuthenticated();
        if (!authenticated) {
          set({ isAuthenticated: false, user: null });
          return;
        }

        set({ isLoading: true });
        try {
          const user = await spotifyService.getCurrentUser();
          set({ user, isAuthenticated: true, isLoading: false });
        } catch {
          await spotifyService.logout();
          set({ isAuthenticated: false, user: null, isLoading: false });
        }
      },

      setUser: (user) => set({ user, isAuthenticated: true }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      handleCallback: async (code, state) => {
        set({ isLoading: true, error: null });
        try {
          const success = await spotifyService.handleCallback(code, state);
          if (success) {
            const user = await spotifyService.getCurrentUser();
            set({ user, isAuthenticated: true, isLoading: false });
            return true;
          } else {
            set({ error: 'Authentication failed', isLoading: false });
            return false;
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'No se pudo completar el inicio de sesión con Spotify.',
            isLoading: false,
          });
          return false;
        }
      },
    }),
    {
      name: STORAGE_KEYS.AUTH_STATE,
      storage: createJSONStorage(() => localStorage),
      partialize: () => ({}),
    }
  )
);
