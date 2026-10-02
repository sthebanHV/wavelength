'use client';

import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Heart,
  ListMusic,
  Music,
  Pause,
  Play,
  Repeat,
  SkipBack,
  SkipForward,
  Shuffle,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { usePlayerStore } from '@/stores/playerStore';
import { formatDuration } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function NowPlaying() {
  const navigate = useNavigate();
  const {
    currentTrack,
    isPlaying,
    position,
    duration,
    volume,
    shuffle,
    repeatMode,
    queue,
    currentIndex,
    playbackError,
    togglePlay,
    next,
    previous,
    seek,
    setVolume,
    setShuffle,
    setRepeatMode,
    playFromQueue,
    removeFromQueue,
    clearQueue,
  } = usePlayerStore();
  const favoriteTracks = useFavoritesStore(state => state.tracks);
  const favoriteError = useFavoritesStore(state => state.error);
  const toggleFavorite = useFavoritesStore(state => state.toggleFavorite);
  const isFavorite = currentTrack
    ? favoriteTracks.some(track => track.id === currentTrack.id && track.source === currentTrack.source)
    : false;
  const upcoming = queue
    .map((item, index) => ({ item, index }))
    .filter(({ index }) => index > currentIndex);

  const toggleRepeat = () => {
    const modes = ['off', 'context', 'track'] as const;
    const currentModeIndex = modes.indexOf(repeatMode);
    setRepeatMode(modes[(currentModeIndex + 1) % modes.length]);
  };

  const toggleMute = () => setVolume(volume > 0 ? 0 : 0.8);

  if (!currentTrack) {
    return (
      <div className="flex min-h-[calc(100dvh-5rem)] flex-col items-center justify-center text-center">
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-accent/20 bg-accent/10 text-accent">
          <Music className="h-9 w-9" />
        </div>
        <h1 className="text-2xl font-semibold">Nada reproduciéndose</h1>
        <p className="mt-2 max-w-sm text-sm text-text-muted">
          Elige una canción para ver los controles y la cola de reproducción aquí.
        </p>
        <Link
          to="/search"
          className="mt-5 inline-flex items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white shadow-lg shadow-accent/30 transition-colors hover:bg-accent-hover"
        >
          Buscar música
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto grid min-h-[calc(100dvh-5rem)] max-w-[1500px] grid-cols-1 gap-4 pb-2 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.8fr)]">
      <div className="flex min-w-0 flex-col gap-4">
        <section className="relative grid min-h-[340px] overflow-hidden rounded-2xl border border-border-default bg-[#090711]/90 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.2)] sm:p-7 lg:grid-cols-[minmax(220px,0.85fr)_minmax(0,1fr)] lg:items-center lg:gap-8">
          {currentTrack.albumArt && (
            <img
              src={currentTrack.albumArt}
              alt=""
              className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-15 blur-3xl"
            />
          )}
          <div className="relative mx-auto aspect-square w-full max-w-[300px] overflow-hidden rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/20 to-bg-tertiary shadow-[0_0_45px_rgba(176,38,255,0.16)] lg:max-w-none">
            {currentTrack.albumArt ? (
              <img
                src={currentTrack.albumArt}
                alt={`Portada de ${currentTrack.album || currentTrack.title}`}
                className={cn(
                  'h-full w-full object-contain p-1 transition-transform duration-700',
                  isPlaying && 'scale-[1.025]'
                )}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-accent/70">
                <Music className="h-20 w-20" />
              </div>
            )}
          </div>

          <div className="relative mt-6 flex min-w-0 flex-col justify-center lg:mt-0">
            <div className="mb-3 flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-2 text-text-secondary"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Button>
              <span className="rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
                {currentTrack.source === 'spotify' ? 'Spotify' : 'Tu biblioteca'}
              </span>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
              {currentTrack.artist}
            </p>
            <h1 className="mt-2 line-clamp-2 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              {currentTrack.title}
            </h1>
            <p className="mt-2 truncate text-sm text-text-secondary">
              {currentTrack.album || 'Reproduciendo ahora'}
            </p>

            <div className="mt-7 flex items-center gap-3">
              <span className="w-10 text-right text-xs tabular-nums text-text-muted">{formatDuration(position)}</span>
              <Slider
                aria-label="Progreso de reproducción"
                max={duration || currentTrack.duration || 100}
                value={[Math.min(position, duration || currentTrack.duration || 100)]}
                onValueChange={([value]) => seek(value)}
                className="h-2 flex-1"
                step={1}
              />
              <span className="w-10 text-xs tabular-nums text-text-muted">{formatDuration(duration || currentTrack.duration)}</span>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <Button
                variant="ghost"
                size="icon"
                className={cn('text-text-secondary', shuffle && 'text-accent')}
                onClick={() => setShuffle(!shuffle)}
                aria-label={shuffle ? 'Desactivar aleatorio' : 'Activar aleatorio'}
                aria-pressed={shuffle}
              >
                <Shuffle className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-text-secondary" onClick={previous} aria-label="Anterior">
                <SkipBack className="h-6 w-6" />
              </Button>
              <Button
                variant="primary"
                size="icon"
                className="player-play-toggle h-14 w-14 shrink-0 rounded-full p-0"
                data-playing={isPlaying}
                onClick={togglePlay}
                aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
              >
                {isPlaying
                  ? <Pause className="h-6 w-6 shrink-0" strokeWidth={2.5} />
                  : <Play className="ml-0.5 h-6 w-6 shrink-0" strokeWidth={2.5} />}
              </Button>
              <Button variant="ghost" size="icon" className="text-text-secondary" onClick={next} aria-label="Siguiente">
                <SkipForward className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn('text-text-secondary', repeatMode !== 'off' && 'text-accent')}
                onClick={toggleRepeat}
                aria-label={`Repetir: ${repeatMode === 'off' ? 'Desactivado' : repeatMode === 'context' ? 'Lista' : 'Canción'}`}
                aria-pressed={repeatMode !== 'off'}
              >
                <Repeat className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn('text-text-secondary', isFavorite && 'text-accent')}
                onClick={() => void toggleFavorite(currentTrack).catch(() => undefined)}
                aria-label={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
              >
                <Heart className={cn('h-5 w-5', isFavorite && 'fill-current')} />
              </Button>
            </div>
            {(playbackError || favoriteError) && (
              <p className="mt-3 text-xs text-error" role="status">{playbackError || favoriteError}</p>
            )}
          </div>
        </section>

        <section className="flex min-h-[190px] flex-1 flex-col rounded-2xl border border-border-default bg-surface/80 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 border-b border-border-default pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Music className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-semibold">Letra</h2>
                <p className="text-xs text-text-muted">Información de la canción</p>
              </div>
            </div>
            <span className="hidden rounded-full border border-border-default px-3 py-1 text-xs text-text-muted sm:inline-flex">
              Letra sincronizada no disponible
            </span>
          </div>
          <div className="flex flex-1 flex-col justify-center py-6">
            <p className="text-lg font-medium text-text-secondary">{currentTrack.title}</p>
            <p className="mt-1 text-sm text-text-muted">{currentTrack.artist}</p>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-text-muted">
              No hay una letra disponible para esta canción. Los controles y el progreso siguen sincronizados con la reproducción.
            </p>
          </div>
        </section>
      </div>

      <aside className="flex min-h-[420px] min-w-0 flex-col overflow-hidden rounded-2xl border border-border-default bg-[#090711]/90 shadow-[0_20px_60px_rgba(0,0,0,0.18)] xl:max-h-[calc(100dvh-5.5rem)]">
        <div className="flex items-center justify-between gap-3 border-b border-border-default p-4">
          <div className="flex items-center gap-3">
            <ListMusic className="h-5 w-5 text-accent" />
            <div>
              <h2 className="font-semibold">Cola de reproducción</h2>
              <p className="text-xs text-text-muted">{upcoming.length} {upcoming.length === 1 ? 'canción siguiente' : 'canciones siguientes'}</p>
            </div>
          </div>
          {queue.length > 0 && (
            <Button variant="ghost" size="icon" onClick={clearQueue} aria-label="Vaciar cola y detener reproducción">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-1 p-2">
            <div className="flex items-center gap-3 rounded-xl border border-accent/25 bg-accent/10 p-2.5">
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-bg-tertiary">
                {currentTrack.albumArt ? (
                  <img src={currentTrack.albumArt} alt="" className="h-full w-full object-cover" />
                ) : <Music className="m-auto h-full w-5 text-accent" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{currentTrack.title}</p>
                <p className="truncate text-xs text-text-muted">{currentTrack.artist}</p>
              </div>
              {isPlaying && (
                <span className="player-waveform shrink-0" aria-label="Reproduciendo">
                  <i /><i /><i /><i /><i />
                </span>
              )}
            </div>

            {upcoming.length > 0 ? upcoming.map(({ item, index }, upcomingIndex) => (
              <div
                key={item.id}
                className="group flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-bg-hover"
              >
                <button
                  type="button"
                  className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-bg-tertiary"
                  onClick={() => playFromQueue(index)}
                  aria-label={`Reproducir ${item.track.title}`}
                >
                  {item.track.albumArt
                    ? <img src={item.track.albumArt} alt="" className="h-full w-full object-cover" />
                    : <Music className="m-auto h-full w-5 text-accent" />}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <Play className="h-4 w-4 fill-current" />
                  </span>
                </button>
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => playFromQueue(index)}
                >
                  <span className="block truncate text-sm font-medium">{item.track.title}</span>
                  <span className="block truncate text-xs text-text-muted">{item.track.artist}</span>
                </button>
                <span className="hidden shrink-0 text-xs tabular-nums text-text-muted sm:block">
                  {formatDuration(item.track.duration)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-text-muted opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                  onClick={() => removeFromQueue(index)}
                  aria-label={`Quitar ${item.track.title} de la cola`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <span className="sr-only">Posición {upcomingIndex + 1}</span>
              </div>
            )) : (
              <div className="flex min-h-40 flex-col items-center justify-center px-6 text-center">
                <ListMusic className="mb-3 h-8 w-8 text-text-muted/50" />
                <p className="text-sm font-medium text-text-secondary">No hay canciones siguientes</p>
                <p className="mt-1 text-xs text-text-muted">Añade canciones desde una búsqueda o lista.</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex items-center gap-3 border-t border-border-default p-4">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-text-secondary"
            onClick={toggleMute}
            aria-label={volume > 0 ? 'Silenciar' : 'Activar sonido'}
          >
            {volume > 0 ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </Button>
          <Slider
            aria-label="Volumen"
            max={100}
            value={[volume * 100]}
            onValueChange={([value]) => setVolume(value / 100)}
            className="h-2 flex-1"
            step={1}
          />
          <span className="w-9 text-right text-xs tabular-nums text-text-muted">{Math.round(volume * 100)}%</span>
        </div>
      </aside>
    </div>
  );
}
