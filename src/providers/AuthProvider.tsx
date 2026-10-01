import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { checkAuth, handleCallback } = useAuthStore();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.error('Spotify auth error:', error);
      return;
    }

    if (code && state) {
      handleCallback(code, state).then(success => {
        if (success) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      });
    }
  }, [searchParams, handleCallback]);

  return <>{children}</>;
}