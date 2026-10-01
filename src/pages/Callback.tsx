'use client';

import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function Callback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      console.error('Spotify auth error:', error);
      return;
    }

    if (code) {
      navigate('/', { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary px-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-accent animate-spin" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Conectando con Spotify...</h2>
          <p className="text-text-muted mb-6">Por favor espera mientras completamos la autenticación</p>
          <Button variant="outline" onClick={() => navigate('/')}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Ir al inicio
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}