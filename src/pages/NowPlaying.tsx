'use client';

import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Heart,
  Volume2,
  VolumeX,
  ListMusic,
  Mic,
  Maximize2,
  Minimize2,
  Clock,
  Calendar,
  Music,
  Share2,
  MoreHorizontal,
  Download,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Avatar } from '@/components/ui/avatar';
import { formatDuration, formatDurationLong } from '@/lib/utils';
import { usePlayerStore } from '@/stores/playerStore';
import { cn } from '@/lib/utils';
import type { Track } from '@/types';

export function NowPlaying() {
  const { currentTrack, isPlaying, position, duration, volume, shuffle, repeatMode, queue, currentIndex, togglePlay, next, previous, seek, setVolume, setShuffle, setRepeatMode, playFromQueue, removeFromQueue, reorderQueue } = usePlayerStore();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lyrics, setLyrics] = useState<string[]>([]);
  const [activeLyricIndex, setActiveLyricIndex] = useState(-1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          if (e.shiftKey) seek(position + 10000);
          else next();
          break;
        case 'ArrowLeft':
          if (e.shiftKey) seek(position - 10000);
          else previous();
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(Math.min(1, volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(Math.max(0, volume - 0.1));
          break;
        case 'KeyS':
          setShuffle(!shuffle);
          break;
        case 'KeyR': {
          const modes: ('off' | 'context' | 'track')[] = ['off', 'context', 'track'];
          const currentIndex = modes.indexOf(repeatMode);
          setRepeatMode(modes[(currentIndex + 1) % modes.length]);
          break;
        }
        case 'KeyF':
          setIsFullscreen(!isFullscreen);
          break;
        case 'KeyM':
          setVolume(volume > 0 ? 0 : 0.8);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [position, volume, shuffle, repeatMode, togglePlay, next, previous, seek, setVolume, setShuffle, setRepeatMode]);

  useEffect(() => {
    if (currentTrack) {
      generateMockLyrics(currentTrack);
    }
  }, [currentTrack]);

  const generateMockLyrics = (track: typeof currentTrack) => {
    if (!track) return;
    const mockLyrics = [
      '[00:00.00] ' + track.title,
      '[00:04.00] ' + track.artist,
      '[00:08.00] ♪',
      '[00:12.00] Verso 1 de la canción',
      '[00:16.00] Que suena en la radio',
      '[00:20.00] Con un ritmo pegadizo',
      '[00:24.00] Que te hace soñar',
      '[00:28.00] ♪',
      '[00:32.00] Coro que se repite',
      '[00:36.00] En tu mente se queda',
      '[00:40.00] Una melodía bonita',
      '[00:44.00] Que nunca se olvida',
      '[00:48.00] ♪',
      '[00:52.00] Verso 2 continúa',
      '[00:56.00] La historia que contar',
      '[01:00.00] Con emociones fuertes',
      '[01:04.00] Que hacen vibrar',
      '[01:08.00] ♪',
      '[01:12.00] Final de la canción',
      '[01:16.00] Se desvanece el sonido',
      '[01:20.00] Queda el eco en el aire',
      '[01:24.00] Un recuerdo bonito',
    ];
    setLyrics(mockLyrics);
  };

  useEffect(() => {
    if (!lyrics.length || !currentTrack) return;

    const currentTime = position / 1000;
    let newIndex = -1;

    for (let i = 0; i < lyrics.length; i++) {
      const match = lyrics[i].match(/\[(\d{2}):(\d{2})\.(\d{2})\]/);
      if (match) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const lyricTime = minutes * 60 + seconds;

        if (lyricTime <= currentTime) {
          newIndex = i;
        } else {
          break;
        }
      }
    }

    if (newIndex !== activeLyricIndex) {
      setActiveLyricIndex(newIndex);
    }
  }, [position, lyrics, activeLyricIndex]);

  if (!currentTrack && queue.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-primary">
        <div className="text-center text-text-muted">
          <Music className="h-24 w-24 mx-auto mb-4 text-text-muted/20" />
          <h2 className="text-xl font-medium mb-2">Nada reproduciéndose</h2>
          <p className="mb-4">Selecciona una canción para empezar</p>
          <Button variant="primary">
            <Link to="/library" className="inherit">Explorar biblioteca</Link>
          </Button>
        </div>
      </div>
    );
  }

  const progress = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <div className={cn('flex-1 flex flex-col overflow-hidden transition-all duration-300', isFullscreen && 'fixed inset-0 z-50')}>
      <AnimatePresence mode="wait">
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-bg-primary/95 backdrop-blur-xl flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-border-default">
              <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(false)} aria-label="Minimizar">
                <Minimize2 className="h-5 w-5" />
              </Button>
              <h2 className="text-lg font-semibold">Reproduciendo ahora</h2>
              <Button variant="ghost" size="icon" aria-label="Más opciones">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </div>
            <FullscreenPlayer
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              position={position}
              duration={duration}
              volume={volume}
              shuffle={shuffle}
              repeatMode={repeatMode}
              lyrics={lyrics}
              activeLyricIndex={activeLyricIndex}
              onTogglePlay={togglePlay}
              onNext={next}
              onPrevious={previous}
              onSeek={seek}
              onVolumeChange={setVolume}
              onShuffleToggle={setShuffle}
              onRepeatToggle={setRepeatMode}
              progress={progress}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="w-full max-w-2xl mx-auto text-center"
          >
            <AnimatePresence mode="wait">
              {currentTrack?.albumArt && (
                <motion.img
                  key={currentTrack.id}
                  src={currentTrack.albumArt}
                  alt={currentTrack.title}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                  className="w-64 h-64 md:w-80 md:h-80 mx-auto rounded-2xl shadow-2xl shadow-accent/20 object-cover"
                />
              )}
            </AnimatePresence>

            {!currentTrack?.albumArt && (
              <div className="w-64 h-64 md:w-80 md:h-80 mx-auto rounded-2xl bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center shadow-2xl shadow-accent/20">
                <Music className="h-32 w-32 md:h-40 md:w-40 text-white/80" />
              </div>
            )}

            <div className="mt-8 space-y-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentTrack?.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-2"
                >
                  <p className="text-sm text-text-muted uppercase tracking-wider">Reproduciendo ahora</p>
                  <h1 className="text-3xl md:text-4xl font-bold text-text-primary">{currentTrack?.title || 'Nada reproduciéndose'}</h1>
                  <p className="text-lg text-text-secondary">{currentTrack?.artist || 'Artista desconocido'}</p>
                  {currentTrack?.album && (
                    <p className="text-text-muted">{currentTrack.album}</p>
                  )}
                </motion.div>
              </AnimatePresence>

              <div className="flex items-center justify-center gap-4 mt-6">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-text-secondary hover:text-error" aria-label="Añadir a favoritos">
                      <Heart className="h-6 w-6" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Favoritos</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-text-secondary hover:text-text-primary" aria-label="Compartir">
                      <Share2 className="h-6 w-6" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Compartir</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-text-secondary hover:text-text-primary" aria-label="Más opciones">
                      <MoreHorizontal className="h-6 w-6" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Más opciones</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="border-t border-border-default p-6 md:p-8">
          <div className="max-w-2xl mx-auto w-full space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-xs text-text-muted w-10 text-right">{formatDuration(position)}</span>
              <Slider
                max={duration || 100}
                value={[position]}
                onValueChange={(v) => seek(v[0])}
                className="flex-1 h-2"
                step={1}
              />
              <span className="text-xs text-text-muted w-10">{formatDuration(duration)}</span>
            </div>

            <div className="flex items-center justify-center gap-6">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(shuffle && 'text-accent', 'text-text-secondary hover:text-text-primary')}
                    onClick={() => setShuffle(!shuffle)}
                    aria-label={shuffle ? 'Desactivar aleatorio' : 'Activar aleatorio'}
                  >
                    <Shuffle className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Aleatorio</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-text-secondary hover:text-text-primary" onClick={previous} aria-label="Anterior">
                    <SkipBack className="h-6 w-6" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Anterior</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="primary"
                    size="lg"
                    className="h-14 w-14 rounded-full shadow-xl shadow-accent/30"
                    onClick={togglePlay}
                    aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                  >
                    {isPlaying ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 ml-1" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reproducir/Pausar</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-text-secondary hover:text-text-primary" onClick={next} aria-label="Siguiente">
                    <SkipForward className="h-6 w-6" />
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
                    onClick={() => {
                      const modes: ('off' | 'context' | 'track')[] = ['off', 'context', 'track'];
                      const currentIndex = modes.indexOf(repeatMode);
                      setRepeatMode(modes[(currentIndex + 1) % modes.length]);
                    }}
                    aria-label={`Repetir: ${repeatMode === 'off' ? 'Desactivado' : repeatMode === 'context' ? 'Lista' : 'Canción'}`}
                  >
                    <Repeat className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{repeatMode === 'off' ? 'Repetir desactivado' : repeatMode === 'context' ? 'Repetir lista' : 'Repetir canción'}</TooltipContent>
              </Tooltip>
            </div>

            <div className="flex items-center justify-center gap-4 pt-2">
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
                    onClick={() => setVolume(volume > 0 ? 0 : 0.8)}
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
                onValueChange={(v) => setVolume(v[0] / 100)}
                className="w-32 h-2"
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
                  <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(true)} aria-label="Pantalla completa">
                    <Maximize2 className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Pantalla completa</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        {queue.length > 0 && (
          <div className="border-t border-border-default">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Próximas en la cola ({queue.length})</h3>
              </div>
              <ScrollArea className="max-h-64">
                <div className="space-y-2">
                  {queue.slice(currentIndex + 1, currentIndex + 11).map((item, i) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-bg-hover transition-colors cursor-pointer group"
                      onClick={() => playFromQueue(queue.findIndex(q => q.id === item.id))}
                    >
                      <span className="w-8 text-center text-xs text-text-muted">{i + 1}</span>
                      {item.track.albumArt ? (
                        <img src={item.track.albumArt} alt={item.track.title} className="h-10 w-10 rounded-lg object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center">
                          <Music className="h-5 w-5 text-accent/50" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.track.title}</p>
                        <p className="text-xs text-text-muted truncate">{item.track.artist}</p>
                      </div>
                      <span className="text-xs text-text-muted">{formatDuration(item.track.duration)}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FullscreenPlayer({
  currentTrack,
  isPlaying,
  position,
  duration,
  volume,
  shuffle,
  repeatMode,
  lyrics,
  activeLyricIndex,
  onTogglePlay,
  onNext,
  onPrevious,
  onSeek,
  onVolumeChange,
  onShuffleToggle,
  onRepeatToggle,
  progress,
}: {
  currentTrack: Track | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeatMode: 'off' | 'context' | 'track';
  lyrics: string[];
  activeLyricIndex: number;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (pos: number) => void;
  onVolumeChange: (vol: number) => void;
  onShuffleToggle: (shuffle: boolean) => void;
  onRepeatToggle: (mode: 'off' | 'context' | 'track') => void;
  progress: number;
}) {
  const handleSeek = (value: number[]) => onSeek(value[0]);
  const handleVolumeChange = (value: number[]) => onVolumeChange(value[0] / 100);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-4xl mx-auto flex flex-col items-center space-y-8"
        >
          <AnimatePresence mode="wait">
            {currentTrack?.albumArt && (
              <motion.img
                key={currentTrack.id}
                src={currentTrack.albumArt}
                alt={currentTrack.title}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="w-80 h-80 rounded-2xl shadow-2xl shadow-accent/30 object-cover"
              />
            )}
          </AnimatePresence>

          {!currentTrack?.albumArt && (
            <div className="w-80 h-80 rounded-2xl bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center shadow-2xl shadow-accent/30">
              <Music className="h-40 w-40 text-white/80" />
            </div>
          )}

          <div className="w-full max-w-2xl text-center space-y-2">
            <p className="text-sm text-text-muted uppercase tracking-wider">Reproduciendo ahora</p>
            <motion.h1
              key={currentTrack?.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-4xl md:text-5xl font-bold text-text-primary"
            >
              {currentTrack?.title || 'Nada reproduciéndose'}
            </motion.h1>
            <motion.p
              key={currentTrack?.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-xl text-text-secondary"
            >
              {currentTrack?.artist || 'Artista desconocido'}
            </motion.p>
            {currentTrack?.album && (
              <p className="text-text-muted">{currentTrack.album}</p>
            )}
          </div>
        </motion.div>

        <div className="w-full max-w-2xl space-y-6">
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-muted w-12 text-right">{formatDuration(position)}</span>
            <Slider
              max={duration || 100}
              value={[position]}
              onValueChange={handleSeek}
              className="flex-1 h-3"
              step={1}
            />
            <span className="text-xs text-text-muted w-12">{formatDuration(duration)}</span>
          </div>

          <div className="flex items-center justify-center gap-8">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(shuffle && 'text-accent', 'text-text-secondary hover:text-text-primary')}
                  onClick={() => onShuffleToggle(!shuffle)}
                  aria-label={shuffle ? 'Desactivar aleatorio' : 'Activar aleatorio'}
                >
                  <Shuffle className="h-6 w-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Aleatorio</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="text-text-secondary hover:text-text-primary" onClick={onPrevious} aria-label="Anterior">
                  <SkipBack className="h-7 w-7" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Anterior</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="primary"
                  size="lg"
                  className="h-16 w-16 rounded-full shadow-2xl shadow-accent/40"
                  onClick={onTogglePlay}
                  aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                >
                  {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 ml-1" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reproducir/Pausar</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="text-text-secondary hover:text-text-primary" onClick={onNext} aria-label="Siguiente">
                  <SkipForward className="h-7 w-7" />
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
                  onClick={() => {
                    const modes: ('off' | 'context' | 'track')[] = ['off', 'context', 'track'];
                    const currentIndex = modes.indexOf(repeatMode);
                    onRepeatToggle(modes[(currentIndex + 1) % modes.length]);
                  }}
                  aria-label={`Repetir: ${repeatMode === 'off' ? 'Desactivado' : repeatMode === 'context' ? 'Lista' : 'Canción'}`}
                >
                  <Repeat className="h-6 w-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{repeatMode === 'off' ? 'Repetir desactivado' : repeatMode === 'context' ? 'Repetir lista' : 'Repetir canción'}</TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-center justify-center gap-4">
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
                  onClick={() => onVolumeChange(volume > 0 ? 0 : 0.8)}
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
              className="w-40 h-2"
              step={1}
            />
          </div>
        </div>

        {lyrics.length > 0 && (
          <div className="w-full max-w-2xl mt-8">
            <h3 className="text-lg font-semibold mb-4 text-center">Letra</h3>
            <ScrollArea className="h-64 max-h-64">
              <div className="space-y-2 text-center">
                {lyrics.map((line, index) => (
                  <motion.p
                    key={index}
                    className={cn(
                      'text-base transition-all duration-300',
                      index === activeLyricIndex ? 'text-text-primary font-medium' : 'text-text-muted'
                    )}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: index === activeLyricIndex ? 1 : 0.6, y: 0 }}
                  >
                    {line.replace(/\[\d{2}:\d{2}\.\d{2}\]\s*/, '')}
                  </motion.p>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}