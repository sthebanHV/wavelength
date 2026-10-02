'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, ExternalLink, Loader2, Youtube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ytMusicService } from '@/services/ytMusic';

interface ConnectionStatus {
  connected: boolean;
  connecting: boolean;
  configured: boolean;
  userCode?: string;
  verificationUrl?: string;
  expiresIn?: number;
  interval?: number;
}

interface AuthorizationChallenge {
  userCode: string;
  verificationUrl: string;
  interval: number;
  expiresAt: number;
}

const emptyStatus: ConnectionStatus = { connected: false, connecting: false, configured: false };

export function YouTubeMusicConnectionCard() {
  const [status, setStatus] = useState<ConnectionStatus>(emptyStatus);
  const [challenge, setChallenge] = useState<AuthorizationChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiAvailable, setApiAvailable] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    ytMusicService.getStatus()
      .then(result => {
        if (!active) return;
        setApiAvailable(true);
        setStatus(result);
        if (result.connecting && result.userCode && result.verificationUrl) {
          setChallenge({
            userCode: result.userCode,
            verificationUrl: result.verificationUrl,
            interval: result.interval || 5,
            expiresAt: Date.now() + (result.expiresIn || 0) * 1000,
          });
        }
      })
      .catch(statusError => {
        if (active) {
          setApiAvailable(false);
          setError(statusError instanceof Error ? statusError.message : 'No se pudo consultar el estado de YouTube Music.');
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!challenge) return;
    let active = true;
    const poll = async () => {
      if (Date.now() >= challenge.expiresAt) {
        setChallenge(null);
        setStatus(current => ({ ...current, connecting: false }));
        setError('El código venció. Inicia la conexión de nuevo.');
        return;
      }
      try {
        const result = await ytMusicService.pollConnection();
        if (!active || result.pending) return;
        setStatus(current => ({ ...current, connected: Boolean(result.connected), connecting: false }));
        setChallenge(null);
        setError(null);
      } catch (pollError) {
        if (!active) return;
        setChallenge(null);
        setStatus(current => ({ ...current, connecting: false }));
        setError(pollError instanceof Error ? pollError.message : 'No se pudo completar la conexión con YouTube Music.');
      }
    };
    const timer = window.setInterval(() => { void poll(); }, challenge.interval * 1000);
    return () => { active = false; window.clearInterval(timer); };
  }, [challenge]);

  const connect = async () => {
    setWorking(true);
    setError(null);
    try {
      const result = await ytMusicService.startConnection();
      setStatus(current => ({ ...current, connecting: true }));
      setChallenge({
        ...result,
        expiresAt: Date.now() + result.expiresIn * 1000,
      });
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : 'No se pudo iniciar la conexión con YouTube Music.');
    } finally {
      setWorking(false);
    }
  };

  const disconnect = async () => {
    setWorking(true);
    setError(null);
    try {
      await ytMusicService.disconnect();
      setChallenge(null);
      setStatus(current => ({ ...current, connected: false, connecting: false }));
    } catch (disconnectError) {
      setError(disconnectError instanceof Error ? disconnectError.message : 'No se pudo desconectar YouTube Music.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2"><Youtube className="h-5 w-5 text-error" /> YouTube Music</CardTitle>
            <CardDescription className="mt-1">Conecta tu cuenta para consultar y guardar playlists.</CardDescription>
          </div>
          {status.connected && <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success"><CheckCircle2 className="h-3.5 w-3.5" /> Conectado</span>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Consultando conexión…</p>
        ) : !apiAvailable ? (
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm text-text-secondary">
            En local, ejecuta <code>vercel dev</code> para iniciar la función de conexión. En producción, comprueba que <code>/api/ytmusic</code> se haya desplegado.
          </div>
        ) : !status.configured ? (
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm text-text-secondary">
            Configura <code>YTMUSIC_CLIENT_ID</code>, <code>YTMUSIC_CLIENT_SECRET</code> y <code>YTMUSIC_SESSION_SECRET</code> en Vercel para habilitar la conexión.
          </div>
        ) : challenge ? (
          <div className="space-y-3 rounded-xl border border-border-default bg-bg-secondary p-4">
            <div>
              <p className="text-sm text-text-secondary">Abre la página de autorización e ingresa este código:</p>
              <p className="mt-2 font-mono text-xl font-semibold tracking-[0.18em] text-text-primary">{challenge.userCode}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a className="inline-flex items-center gap-2 rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary hover:border-accent" href={challenge.verificationUrl} target="_blank" rel="noreferrer">
                Abrir Google <ExternalLink className="h-4 w-4" />
              </a>
              <Button variant="ghost" size="sm" onClick={() => { void disconnect(); }} disabled={working}>Cancelar</Button>
              <span className="text-xs text-text-muted">La página comprobará la autorización automáticamente.</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-text-muted">{status.connected ? 'Tu cuenta ya puede usar las playlists de YouTube Music.' : 'La búsqueda está disponible; conecta tu cuenta para guardar playlists.'}</p>
            {status.connected ? (
              <Button variant="outline" onClick={() => { void disconnect(); }} disabled={working}>{working ? 'Desconectando…' : 'Desconectar'}</Button>
            ) : (
              <Button variant="primary" onClick={() => { void connect(); }} disabled={working} loading={working}>Conectar YouTube Music</Button>
            )}
          </div>
        )}
        {error && <p className="flex items-start gap-2 text-sm text-error" role="alert"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
      </CardContent>
    </Card>
  );
}
