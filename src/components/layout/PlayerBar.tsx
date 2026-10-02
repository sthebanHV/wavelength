'use client';

import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Heart,
  Volume2,
  VolumeX,
  Mic,
  ListMusic,
  Maximize2,
  ExternalLink,
} from 'lucide-react';
import { cn, formatDuration } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { usePlayerStore } from '@/stores/playerStore';
import { useFavoritesStore } from '@/stores/favoritesStore';

export function PlayerBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isPlaylistComposer = location.pathname === '/playlists/new';
  const {
    currentTrack,
    isPlaying,
    position,
    duration,
    volume,
    shuffle,
    repeatMode,
    playbackError,
    togglePlay,
    next,
    previous,
    seek,
    setVolume,
    setShuffle,
    setRepeatMode,
    queue,
  } = usePlayerStore();
  const favoriteTracks = useFavoritesStore(state => state.tracks);
  const toggleFavorite = useFavoritesStore(state => state.toggleFavorite);
  const favoriteError = useFavoritesStore(state => state.error);
  const isFavorite = currentTrack && favoriteTracks.some(track => track.id === currentTrack.id && track.source === currentTrack.source);

  const volumeBeforeMute = useRef(0.8);

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0] / 100;
    setVolume(newVolume);
  };

  const handleSeek = (value: number[]) => {
    seek(value[0]);
  };

  const toggleMute = () => {
    const { volume, setVolume } = usePlayerStore.getState();
    if (volume > 0) {
      volumeBeforeMute.current = volume;
      setVolume(0);
    } else {
      setVolume(volumeBeforeMute.current);
    }
  };

  const toggleShuffleHandler = () => setShuffle(!shuffle);
  const toggleRepeatHandler = () => {
    const modes: ('off' | 'context' | 'track')[] = ['off', 'context', 'track'];
    const currentIndex = modes.indexOf(repeatMode);
    setRepeatMode(modes[(currentIndex + 1) % modes.length]);
  };

  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album || '',
        artwork: currentTrack.albumArt ? [{ src: currentTrack.albumArt, sizes: '512x512', type: 'image/png' }] : [],
      });
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [currentTrack, isPlaying]);

  if (!currentTrack && queue.length === 0 && location.pathname !== '/playlists/new') {
    return null;
  }

  return (
    <div className={`player-bar fixed bottom-0 left-0 right-0 z-30 h-20 overflow-hidden border-t border-border-default bg-surface/95 shadow-[0_-12px_36px_rgba(0,0,0,0.18)] backdrop-blur-xl ${isPlaylistComposer ? 'playlist-composer__player-bar' : ''}`}>
      <div className="h-full max-w-screen-2xl mx-auto flex items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {currentTrack?.albumArt ? (
            <img
              src={currentTrack.albumArt}
              alt={currentTrack.title}
              data-playing={isPlaying}
              className="player-cover-art h-14 w-14 rounded-lg border border-accent/25 object-cover shadow-[0_0_20px_rgba(176,38,255,0.16)]"
            />
          ) : (
            <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center">
              <svg className="h-8 w-8 text-white/80" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-text-primary truncate">{currentTrack?.title || 'Nada reproduciéndose'}</p>
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-xs text-text-muted">{currentTrack?.artist || 'Selecciona una canción'}</p>
              {isPlaying && currentTrack && (
                <span className="player-waveform shrink-0" aria-label="Reproduciendo">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
              )}
            </div>
            {playbackError && (
              <div className="flex items-center gap-2 text-[10px]" role="status">
                <p className="text-error truncate">{playbackError}</p>
                {currentTrack?.source === 'spotify' && currentTrack.url && (
                  <a
                    href={currentTrack.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex flex-shrink-0 items-center gap-1 text-accent hover:underline"
                    aria-label={`Abrir ${currentTrack.title} en Spotify`}
                  >
                    <ExternalLink className="h-3 w-3" />
                    Spotify
                  </a>
                )}
              </div>
            )}
            {favoriteError && <p className="text-[10px] text-error truncate" role="alert">{favoriteError}</p>}
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn('text-text-secondary hover:text-text-primary', currentTrack && 'text-error/80 hover:text-error')}
                onClick={() => currentTrack && void toggleFavorite(currentTrack).catch(() => undefined)}
                aria-label={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                disabled={!currentTrack}
              >
                <Heart className={cn('h-5 w-5 transition-colors', isFavorite && 'fill-error text-error')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Favoritos</TooltipContent>
          </Tooltip>
        </div>

        <div className={`flex min-w-0 flex-1 flex-col items-center gap-2 ${isPlaylistComposer ? 'playlist-composer__transport' : ''}`}>
          <div className="flex shrink-0 items-center gap-1 sm:gap-3">
            {!isPlaylistComposer && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn('shrink-0 text-text-secondary hover:text-text-primary', shuffle && 'text-accent')}
                    onClick={toggleShuffleHandler}
                    aria-label={shuffle ? 'Desactivar aleatorio' : 'Activar aleatorio'}
                  >
                    <Shuffle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Aleatorio</TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-text-secondary hover:text-text-primary"
                  onClick={previous}
                  aria-label="Anterior"
                >
                  <SkipBack className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Anterior</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="primary"
                  size="icon"
                  className="player-play-toggle h-12 w-12 shrink-0 rounded-full p-0"
                  data-playing={isPlaying}
                  onClick={togglePlay}
                  aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                >
                  {isPlaying ? (
                    <Pause className="h-6 w-6 shrink-0" strokeWidth={2.5} />
                  ) : (
                    <Play className="ml-0.5 h-6 w-6 shrink-0" strokeWidth={2.5} />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reproducir/Pausar</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-text-secondary hover:text-text-primary"
                  onClick={next}
                  aria-label="Siguiente"
                >
                  <SkipForward className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Siguiente</TooltipContent>
            </Tooltip>

            {!isPlaylistComposer && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn('shrink-0 text-text-secondary hover:text-text-primary', repeatMode !== 'off' && 'text-accent')}
                    onClick={toggleRepeatHandler}
                    aria-label={`Repetir: ${repeatMode === 'off' ? 'Desactivado' : repeatMode === 'context' ? 'Lista' : 'Canción'}`}
                  >
                    <Repeat className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{repeatMode === 'off' ? 'Repetir desactivado' : repeatMode === 'context' ? 'Repetir lista' : 'Repetir canción'}</TooltipContent>
              </Tooltip>
            )}
          </div>

          <div className="flex w-full min-w-0 max-w-md items-center gap-2 sm:gap-3">
            <span className="text-xs text-text-muted w-10 text-right">{formatDuration(position)}</span>
            <Slider
              max={duration || 100}
              value={[position]}
              onValueChange={handleSeek}
              disabled={!currentTrack || duration <= 0}
              className="flex-1 h-1.5"
              step={1}
            />
            <span className="text-xs text-text-muted w-10">{formatDuration(duration)}</span>
          </div>
          <div className="player-progress-track" aria-hidden="true">
            <div
              className="player-progress-value"
              style={{ width: `${duration > 0 ? Math.min(100, Math.max(0, (position / duration) * 100)) : 0}%` }}
            />
          </div>
        </div>

        <div className={`flex min-w-0 flex-1 items-center justify-end gap-1 sm:gap-2 ${isPlaylistComposer ? 'playlist-composer__options' : ''}`}>
          {!isPlaylistComposer && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0 text-text-secondary hover:text-text-primary" aria-label="Dispositivos">
                  <Mic className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Dispositivos</TooltipContent>
            </Tooltip>
          )}

          {isPlaylistComposer && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className={cn('shrink-0 text-text-secondary hover:text-text-primary', shuffle && 'text-accent')} onClick={toggleShuffleHandler} aria-label={shuffle ? 'Desactivar aleatorio' : 'Activar aleatorio'}>
                    <Shuffle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Aleatorio</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className={cn('shrink-0 text-text-secondary hover:text-text-primary', repeatMode !== 'off' && 'text-accent')} onClick={toggleRepeatHandler} aria-label={`Repetir: ${repeatMode === 'off' ? 'Desactivado' : repeatMode === 'context' ? 'Lista' : 'Canción'}`}>
                    <Repeat className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{repeatMode === 'off' ? 'Repetir desactivado' : repeatMode === 'context' ? 'Repetir lista' : 'Repetir canción'}</TooltipContent>
              </Tooltip>
            </>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-text-secondary hover:text-text-primary"
                onClick={toggleMute}
                aria-label={volume > 0 ? 'Silenciar' : 'Activar sonido'}
              >
                {volume > 0 ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{volume > 0 ? 'Silenciar' : 'Activar sonido'}</TooltipContent>
          </Tooltip>

          <Slider
            max={100}
            value={[volume * 100]}
            onValueChange={handleVolumeChange}
            className="hidden h-1.5 w-24 shrink-0 sm:flex"
            step={1}
          />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="hidden shrink-0 text-text-secondary hover:text-text-primary sm:inline-flex" aria-label="Cola de reproducción">
                <ListMusic className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Cola</TooltipContent>
          </Tooltip>

          {!isPlaylistComposer && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden shrink-0 text-text-secondary hover:text-text-primary sm:inline-flex"
                  onClick={() => navigate('/now-playing')}
                  aria-label="Pantalla completa"
                >
                  <Maximize2 className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Pantalla completa</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}
