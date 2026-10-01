'use client';

import { useState, useEffect } from 'react';
import {
  Moon,
  Sun,
  Monitor,
  Music,
  Database,
  Shield,
  Bell,
  Trash2,
  Download,
  Upload,
  Info,
  ExternalLink,
  ChevronRight,
  Palette,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Avatar } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useThemeStore } from '@/stores/themeStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useAuthStore } from '@/stores/authStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { localFilesService } from '@/services/localFiles';
import { formatBytes } from '@/lib/utils';

const loadStats = async (setStats: React.Dispatch<React.SetStateAction<{
  totalTracks: number;
  totalAlbums: number;
  totalArtists: number;
  totalPlaylists: number;
  totalDuration: number;
  storageUsed: number;
} | null>>, setLoadingStats: React.Dispatch<React.SetStateAction<boolean>>) => {
  setLoadingStats(true);
  try {
    const localStats = await localFilesService.getStats();
    setStats(localStats);
  } catch (error) {
    console.error('Error loading stats:', error);
  } finally {
    setLoadingStats(false);
  }
};

export function Settings() {
  const { theme, setTheme } = useThemeStore();
  const { volume, crossfade, setCrossfade, repeatMode, setRepeatMode } = usePlayerStore();
  const { user, isAuthenticated, logout, login } = useAuthStore();
  const { tracks, refresh: refreshLibrary } = useLibraryStore();

  const [showClearDialog, setShowClearDialog] = useState(false);
  const [stats, setStats] = useState<{
    totalTracks: number;
    totalAlbums: number;
    totalArtists: number;
    totalPlaylists: number;
    totalDuration: number;
    storageUsed: number;
  } | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    const stored = localStorage.getItem('wavelength-notifications');
    return stored ? JSON.parse(stored) : true;
  });
  const [autoPlayNext, setAutoPlayNext] = useState(() => {
    const stored = localStorage.getItem('wavelength-autoplay');
    return stored ? JSON.parse(stored) : true;
  });
  const [showLyrics, setShowLyrics] = useState(() => {
    const stored = localStorage.getItem('wavelength-lyrics');
    return stored ? JSON.parse(stored) : true;
  });
  const [hardwareAcceleration, setHardwareAcceleration] = useState(() => {
    const stored = localStorage.getItem('wavelength-hw-accel');
    return stored ? JSON.parse(stored) : true;
  });

  useEffect(() => {
    loadStats(setStats, setLoadingStats);
  }, []);

  useEffect(() => {
    localStorage.setItem('wavelength-notifications', JSON.stringify(notificationsEnabled));
  }, [notificationsEnabled]);

  useEffect(() => {
    localStorage.setItem('wavelength-autoplay', JSON.stringify(autoPlayNext));
  }, [autoPlayNext]);

  useEffect(() => {
    localStorage.setItem('wavelength-lyrics', JSON.stringify(showLyrics));
  }, [showLyrics]);

  useEffect(() => {
    localStorage.setItem('wavelength-hw-accel', JSON.stringify(hardwareAcceleration));
  }, [hardwareAcceleration]);

  const handleClearLibrary = async () => {
    await localFilesService.clearAll();
    refreshLibrary();
    loadStats(setStats, setLoadingStats);
    setShowClearDialog(false);
  };

  const handleExportData = () => {
    const data = {
      tracks,
      playlists: useLibraryStore.getState().playlists,
      albums: useLibraryStore.getState().albums,
      artists: useLibraryStore.getState().artists,
      exportDate: new Date().toISOString(),
      version: '1.0.0',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wavelength-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        console.log('Import data:', data);
        refreshLibrary();
        loadStats(setStats, setLoadingStats);
      } catch (error) {
        console.error('Import error:', error);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-full overflow-y-auto">
      <ScrollArea className="h-full">
        <div className="max-w-4xl mx-auto space-y-8 p-1">
          <div>
            <h1 className="text-2xl font-bold mb-2">Configuración</h1>
            <p className="text-sm text-text-muted">Personaliza tu experiencia en Wavelength</p>
          </div>

          <section aria-label="Apariencia">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Apariencia
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Card variant="hover">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-accent/10 text-accent">
                        <Palette className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-medium">Tema</h3>
                        <p className="text-sm text-text-muted">Elige el modo de color</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(['dark', 'light', 'system'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTheme(t)}
                        className={cn(
                          'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                          theme === t
                            ? 'border-accent bg-accent/10'
                            : 'border-border-default hover:border-border-strong hover:bg-bg-hover'
                        )}
                      >
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{
                            background: t === 'dark' ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
                              : t === 'light' ? 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'
                                : 'linear-gradient(135deg, #1a1a2e 0%, #f8f9fa 100%)'
                          }}
                        >
                          {t === 'dark' && <Moon className="h-5 w-5 text-white" />}
                          {t === 'light' && <Sun className="h-5 w-5 text-gray-800" />}
                          {t === 'system' && <Monitor className="h-5 w-5 text-gray-600" />}
                        </div>
                        <span className="text-sm font-medium capitalize">{t}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card variant="hover">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-accent/10 text-accent">
                        <Music className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-medium">Reproducción</h3>
                        <p className="text-sm text-text-muted">Comportamiento del reproductor</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <p className="font-medium">Transición cruzada</p>
                        <p className="text-sm text-text-muted">Transición suave entre canciones</p>
                      </div>
                      <Switch checked={crossfade} onCheckedChange={setCrossfade} />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <p className="font-medium">Reproducción automática</p>
                        <p className="text-sm text-text-muted">Continuar con canciones similares al terminar la cola</p>
                      </div>
                      <Switch checked={autoPlayNext} onCheckedChange={(v) => setAutoPlayNext(v)} />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <p className="font-medium">Mostrar letra</p>
                        <p className="text-sm text-text-muted">Visualizar letras sincronizadas</p>
                      </div>
                      <Switch checked={showLyrics} onCheckedChange={(v) => setShowLyrics(v)} />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <p className="font-medium">Aceleración por hardware</p>
                        <p className="text-sm text-text-muted">Mejor rendimiento de audio (requiere reinicio)</p>
                      </div>
                      <Switch checked={hardwareAcceleration} onCheckedChange={(v) => setHardwareAcceleration(v)} />
                    </label>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          <section aria-label="Audio">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Music className="h-5 w-5" />
              Audio
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Card variant="hover">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-accent/10 text-accent">
                        <Music className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-medium">Volumen predeterminado</h3>
                        <p className="text-sm text-text-muted">Nivel de volumen al iniciar la app</p>
                      </div>
                    </div>
                    <span className="text-lg font-mono text-accent">{Math.round(volume * 100)}%</span>
                  </div>
                  <Slider
                    max={100}
                    value={[volume * 100]}
                    onValueChange={(v) => {
                      const vol = v[0] / 100;
                      usePlayerStore.getState().setVolume(vol);
                    }}
                    className="mb-2"
                  />
                  <div className="flex justify-between text-xs text-text-muted">
                    <span>Silencio</span>
                    <span>Máximo</span>
                  </div>
                </CardContent>
              </Card>

              <Card variant="hover">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-accent/10 text-accent">
                        <Music className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-medium">Modo repetición</h3>
                        <p className="text-sm text-text-muted">Comportamiento al finalizar</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(['off', 'context', 'track'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setRepeatMode(mode)}
                        className={cn(
                          'p-4 rounded-xl border-2 transition-all text-center',
                          repeatMode === mode
                            ? 'border-accent bg-accent/10'
                            : 'border-border-default hover:border-border-strong hover:bg-bg-hover'
                        )}
                      >
                        <div className="text-2xl mb-1">
                          {mode === 'off' && <svg className="h-6 w-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
                          {mode === 'context' && <svg className="h-6 w-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
                          {mode === 'track' && (
                            <svg className="h-6 w-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          )}
                        </div>
                        <span className="text-sm font-medium capitalize">{mode}</span>
                        <span className="text-xs text-text-muted">
                          {mode === 'off' ? 'Apagado' : mode === 'context' ? 'Lista' : 'Canción'}
                        </span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          <section aria-label="Cuenta">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Cuenta
            </h2>
            <Card variant="hover">
              <CardContent className="p-6">
                {isAuthenticated && user ? (
                  <div className="flex items-center gap-4">
                    <Avatar src={user.avatar} name={user.displayName} size="xl" />
                    <div className="flex-1">
                      <h3 className="font-semibold">{user.displayName}</h3>
                      <p className="text-sm text-text-muted">{user.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="accent" size="sm">{user.product || 'Premium'}</Badge>
                        {user.country && <Badge variant="outline" size="sm">{user.country}</Badge>}
                      </div>
                    </div>
                    <Button variant="outline" onClick={logout}>
                      Cerrar sesión
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="p-3 rounded-xl bg-accent/10 text-accent mx-auto mb-4 w-16 h-16 flex items-center justify-center">
                      <Shield className="h-8 w-8" />
                    </div>
                    <h3 className="font-semibold mb-1">Conecta tu cuenta</h3>
                    <p className="text-sm text-text-muted mb-4">Accede a tu biblioteca de Spotify, listas y más</p>
                    <Button variant="primary" size="lg" onClick={login}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Conectar con Spotify
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <section aria-label="Almacenamiento">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Database className="h-5 w-5" />
              Almacenamiento y datos
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              <Card variant="hover">
                <CardContent className="p-6 text-center">
                  <div className="p-2 rounded-xl bg-accent/10 text-accent mx-auto mb-3 w-12 h-12 flex items-center justify-center">
                    <Database className="h-6 w-6" />
                  </div>
                  <p className="text-3xl font-bold text-text-primary">{loadingStats ? '—' : stats?.totalTracks || 0}</p>
                  <p className="text-sm text-text-muted">Canciones locales</p>
                </CardContent>
              </Card>
              <Card variant="hover">
                <CardContent className="p-6 text-center">
                  <div className="p-2 rounded-xl bg-accent/10 text-accent mx-auto mb-3 w-12 h-12 flex items-center justify-center">
                    <Music className="h-6 w-6" />
                  </div>
                  <p className="text-3xl font-bold text-text-primary">{loadingStats ? '—' : stats?.totalPlaylists || 0}</p>
                  <p className="text-sm text-text-muted">Listas de reproducción</p>
                </CardContent>
              </Card>
              <Card variant="hover">
                <CardContent className="p-6 text-center">
                  <div className="p-2 rounded-xl bg-accent/10 text-accent mx-auto mb-3 w-12 h-12 flex items-center justify-center">
                    <Download className="h-6 w-6" />
                  </div>
                  <p className="text-3xl font-bold text-text-primary">{loadingStats ? '—' : formatBytes(stats?.storageUsed || 0)}</p>
                  <p className="text-sm text-text-muted">Espacio usado</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 mt-4">
              <Card variant="hover">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Exportar datos
                  </CardTitle>
                  <CardDescription>Descarga una copia de seguridad de tu biblioteca local</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" onClick={handleExportData} className="w-full justify-start gap-2">
                    <Download className="h-4 w-4" />
                    Exportar biblioteca (JSON)
                  </Button>
                </CardContent>
              </Card>

              <Card variant="hover">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Importar datos
                  </CardTitle>
                  <CardDescription>Restaura tu biblioteca desde una copia de seguridad</CardDescription>
                </CardHeader>
                <CardContent>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    id="import-file"
                    onChange={(e) => e.target.files?.[0] && handleImportData(e.target.files[0])}
                  />
                  <Button variant="outline" onClick={() => document.getElementById('import-file')?.click()} className="w-full justify-start gap-2">
                    <Upload className="h-4 w-4" />
                    Importar biblioteca (JSON)
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card variant="hover" className="border-error/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-error">
                  <Trash2 className="h-5 w-5" />
                  Limpiar biblioteca local
                </CardTitle>
                <CardDescription>Elimina permanentemente todas las canciones, listas y metadatos locales</CardDescription>
              </CardHeader>
              <CardContent>
                <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
                  <DialogTrigger asChild>
                    <Button variant="danger" className="w-full justify-start gap-2">
                      <Trash2 className="h-4 w-4" />
                      Eliminar todo
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>¿Estás seguro?</DialogTitle>
                      <DialogDescription>Esta acción eliminará permanentemente todas tus canciones locales, listas de reproducción, metadatos y portada de álbumes. No se puede deshacer.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="ghost" onClick={() => setShowClearDialog(false)}>Cancelar</Button>
                      <Button variant="danger" onClick={handleClearLibrary}>Eliminar todo</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </section>

          <section aria-label="Notificaciones">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificaciones
            </h2>
            <Card variant="hover">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <p className="font-medium">Notificaciones de reproducción</p>
                      <p className="text-sm text-text-muted">Mostrar notificación al cambiar de canción</p>
                    </div>
                    <Switch
                      checked={notificationsEnabled}
                      onCheckedChange={(v) => setNotificationsEnabled(v)}
                    />
                  </label>
                </div>
              </CardContent>
            </Card>
          </section>

          <section aria-label="Acerca de">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Info className="h-5 w-5" />
              Acerca de
            </h2>
            <Card variant="hover">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-accent to-accent-hover w-16 h-16 flex items-center justify-center">
                    <Music className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Wavelength</h3>
                    <p className="text-sm text-text-muted">Versión 1.0.0</p>
                    <p className="text-xs text-text-muted mt-1">Reproductor de música moderno con integración Spotify</p>
                  </div>
                </div>
                <Separator />
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <h4 className="font-medium">Enlaces</h4>
                    <div className="space-y-2">
                      <a href="#" className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors">
                        <ExternalLink className="h-4 w-4" />
                        GitHub
                      </a>
                      <a href="#" className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors">
                        <Info className="h-4 w-4" />
                        Licencia MIT
                      </a>
                      <a href="#" className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors">
                        <Shield className="h-4 w-4" />
                        Privacidad
                      </a>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-medium">Tecnologías</h4>
                    <div className="flex flex-wrap gap-2">
                      {['React 18', 'TypeScript', 'Vite', 'Tailwind CSS', 'Zustand', 'Radix UI', 'TanStack Query', 'Drizzle ORM', 'IndexedDB'].map((tech) => (
                        <Badge key={tech} variant="outline" size="sm">{tech}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}