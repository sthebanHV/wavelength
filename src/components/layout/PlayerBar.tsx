'use client';

import { useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { cn, formatDuration } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { usePlayerStore } from '@/stores/playerStore';

export function PlayerBar() {
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

  if (!currentTrack && queue.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 h-20 bg-bg-secondary/95 backdrop-blur-xl border-t border-border-default">
      <div className="h-full max-w-screen-2xl mx-auto flex items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {currentTrack?.albumArt ? (
            <img
              src={currentTrack.albumArt}
              alt={currentTrack.title}
              className="h-14 w-14 rounded-lg object-cover shadow-lg"
            />
          ) : (
            <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center">
              <svg className="h-8 w-8 text-white/80" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-text-primary truncate">{currentTrack?.title || 'Nada reproduciéndose'}</p>
            <p className="text-xs text-text-muted truncate">{currentTrack?.artist || 'Selecciona una canción'}</p>
            {playbackError && <p className="text-[10px] text-error truncate" role="status">{playbackError}</p>}
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn('text-text-secondary hover:text-text-primary', currentTrack && 'text-error/80 hover:text-error')}
                onClick={() => {}}
                aria-label="Añadir a favoritos"
              >
                <Heart className={cn('h-5 w-5 transition-colors', currentTrack && 'fill-error')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Favoritos</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex flex-col items-center gap-2 min-w-0 flex-1 md:flex-2">
          <div className="flex items-center gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(shuffle && 'text-accent', 'text-text-secondary hover:text-text-primary')}
                  onClick={toggleShuffleHandler}
                  aria-label={shuffle ? 'Desactivar aleatorio' : 'Activar aleatorio'}
                >
                  <Shuffle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Aleatorio</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-text-secondary hover:text-text-primary"
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
                  size="lg"
                  className="h-12 w-12 rounded-full"
                  onClick={togglePlay}
                  aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                >
                  {isPlaying ? (
                    <Pause className="h-6 w-6" />
                  ) : (
                    <Play className="h-6 w-6 ml-1" />
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
                  className="text-text-secondary hover:text-text-primary"
                  onClick={next}
                  aria-label="Siguiente"
                >
                  <SkipForward className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Siguiente</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(repeatMode !== 'off' && 'text-accent', 'text-text-secondary hover:text-text-primary')}
                  onClick={toggleRepeatHandler}
                  aria-label={`Repetir: ${repeatMode === 'off' ? 'Desactivado' : repeatMode === 'context' ? 'Lista' : 'Canción'}`}
                >
                  <Repeat className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{repeatMode === 'off' ? 'Repetir desactivado' : repeatMode === 'context' ? 'Repetir lista' : 'Repetir canción'}</TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-center gap-3 w-full max-w-md">
            <span className="text-xs text-text-muted w-10 text-right">{formatDuration(position)}</span>
            <Slider
              max={duration || 100}
              value={[position]}
              onValueChange={handleSeek}
              className="flex-1 h-1.5"
              step={1}
            />
            <span className="text-xs text-text-muted w-10">{formatDuration(duration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="text-text-secondary hover:text-text-primary" aria-label="Dispositivos">
                <Mic className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Dispositivos</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-text-secondary hover:text-text-primary"
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
            className="w-24 h-1.5"
            step={1}
          />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="text-text-secondary hover:text-text-primary" aria-label="Cola de reproducción">
                <ListMusic className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Cola</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="text-text-secondary hover:text-text-primary" aria-label="Pantalla completa">
                <Maximize2 className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Pantalla completa</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}