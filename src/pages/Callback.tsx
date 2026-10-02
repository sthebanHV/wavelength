'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/stores/authStore';

export function Callback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const handleCallback = useAuthStore(state => state.handleCallback);
  const setError = useAuthStore(state => state.setError);
  const isLoading = useAuthStore(state => state.isLoading);
  const error = useAuthStore(state => state.error);
  const callbackStarted = useRef(false);

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      setError(`Spotify rechazó la autorización: ${error}`);
      return;
    }

    if (code && state && !callbackStarted.current) {
      callbackStarted.current = true;
      handleCallback(code, state).then(success => {
        if (success) {
          navigate('/', { replace: true });
        }
      });
      return;
    }

    if (!code || !state) {
      setError('No se recibió el código de autorización de Spotify. Intenta iniciar sesión otra vez.');
    }
  }, [searchParams, navigate, handleCallback, setError]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary px-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
            {isLoading && !error
              ? <Loader2 className="h-8 w-8 text-accent animate-spin" />
              : <ExternalLink className="h-8 w-8 text-accent" />}
          </div>
          <h2 className="text-xl font-semibold mb-2">
            {error ? 'No se pudo conectar con Spotify' : 'Conectando con Spotify...'}
          </h2>
          <p className="text-text-muted mb-6">
            {error || 'Por favor espera mientras completamos la autenticación'}
          </p>
          {error && (
            <Button variant="outline" onClick={() => navigate('/', { replace: true })}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Volver al inicio
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}