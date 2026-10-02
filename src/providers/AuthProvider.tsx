import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useFavoritesStore } from '@/stores/favoritesStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const checkAuth = useAuthStore(state => state.checkAuth);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const loadSpotifyFavorites = useFavoritesStore(state => state.loadSpotifyFavorites);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isAuthenticated) void loadSpotifyFavorites();
  }, [isAuthenticated, loadSpotifyFavorites]);

  return <>{children}</>;
}