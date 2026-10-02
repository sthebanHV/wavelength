import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useFavoritesStore } from '@/stores/favoritesStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const checkAuth = useAuthStore(state => state.checkAuth);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const login = useAuthStore(state => state.login);
  const loadSpotifyFavorites = useFavoritesStore(state => state.loadSpotifyFavorites);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('connectSpotify') !== '1') return;

    url.searchParams.delete('connectSpotify');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    void login();
  }, [login]);

  useEffect(() => {
    if (isAuthenticated) void loadSpotifyFavorites();
  }, [isAuthenticated, loadSpotifyFavorites]);

  return <>{children}</>;
}