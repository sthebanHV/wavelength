import { useEffect, useRef, useCallback } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { localFilesService } from '@/services/localFiles';

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const {
    isPlaying,
    currentTrack,
    volume,
    position,
    crossfade,
    next,
    previous,
    seek,
    setVolume,
    getNextTrack,
  } = usePlayerStore();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const positionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const crossfadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSeekingRef = useRef(false);
  const mediaSessionSupported = typeof navigator !== 'undefined' && 'mediaSession' in navigator;

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.crossOrigin = 'anonymous';
    audioRef.current.preload = 'metadata';
    audioRef.current.volume = volume;

    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      if (!isSeekingRef.current && audioRef.current) {
        usePlayerStore.setState({ position: audioRef.current.currentTime * 1000 });
      }
    };

    const handleEnded = () => {
      if (crossfade && getNextTrack()) {
        if (crossfadeTimeoutRef.current) clearTimeout(crossfadeTimeoutRef.current);
        crossfadeTimeoutRef.current = setTimeout(() => {
          const nextTrack = getNextTrack();
          if (nextTrack) {
            const { next } = usePlayerStore.getState();
            next();
          }
        }, 100);
      } else {
        next();
      }
    };

    const handleError = (e: Event) => {
      console.error('Audio error:', e);
      usePlayerStore.setState({ isPlaying: false });
    };

    const handleLoadedMetadata = () => {
      if (audioRef.current) {
        usePlayerStore.setState({ duration: audioRef.current.duration * 1000 });
      }
    };

    const handleWaiting = () => {
      // Buffering
    };

    const handleCanPlay = () => {
      // Ready to play
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('canplay', handleCanPlay);

    if (mediaSessionSupported) {
      navigator.mediaSession.setActionHandler('play', () => usePlayerStore.getState().togglePlay());
      navigator.mediaSession.setActionHandler('pause', () => usePlayerStore.getState().togglePlay());
      navigator.mediaSession.setActionHandler('nexttrack', () => next());
      navigator.mediaSession.setActionHandler('previoustrack', () => previous());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime) seek(details.seekTime * 1000);
      });
      navigator.mediaSession.setActionHandler('seekforward', () => seek(position + 10000));
      navigator.mediaSession.setActionHandler('seekbackward', () => seek(position - 10000));
    }

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('canplay', handleCanPlay);

      if (crossfadeTimeoutRef.current) clearTimeout(crossfadeTimeoutRef.current);
      if (positionIntervalRef.current) clearInterval(positionIntervalRef.current);

      audio.pause();
      audio.src = '';
      audio.load();
      audioRef.current = null;
    };
  }, []);

  const loadTrack = useCallback(async (track: typeof currentTrack) => {
    if (!track || !audioRef.current) return;

    const audio = audioRef.current;

    if (track.source === 'local') {
      const blobUrl = await localFilesService.getFileUrl(track.id);
      if (blobUrl) {
        audio.src = blobUrl;
      }
    } else if (track.source === 'spotify') {
      if (track.previewUrl) {
        audio.src = track.previewUrl;
      } else {
        console.warn('No preview URL available for Spotify track');
        return;
      }
    }

    audio.load();
  }, []);

  useEffect(() => {
    if (currentTrack) {
      loadTrack(currentTrack);
    }
  }, [currentTrack, loadTrack]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      if (mediaSessionSupported && currentTrack) {
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentTrack.title,
          artist: currentTrack.artist,
          album: currentTrack.album || '',
          artwork: currentTrack.albumArt ? [{ src: currentTrack.albumArt, sizes: '512x512', type: 'image/png' }] : [],
        });
      }
    }
  }, [volume, isPlaying, currentTrack]);

  useEffect(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      const playPromise = audioRef.current.play();
      if (playPromise) {
        playPromise.catch(() => {
          usePlayerStore.setState({ isPlaying: false });
        });
      }
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!audioRef.current || isSeekingRef.current) return;

    const targetTime = position / 1000;
    const currentTime = audioRef.current.currentTime;

    if (Math.abs(currentTime - targetTime) > 1) {
      audioRef.current.currentTime = targetTime;
    }
  }, [position]);

  const handleSeek = useCallback((newPosition: number) => {
    isSeekingRef.current = true;
    seek(newPosition);
    if (audioRef.current) {
      audioRef.current.currentTime = newPosition / 1000;
    }
    setTimeout(() => { isSeekingRef.current = false; }, 100);
  }, [seek]);

  const handleNext = useCallback(() => {
    if (crossfade && getNextTrack()) {
      if (audioRef.current) {
        const fadeOut = () => {
          const startVolume = audioRef.current!.volume;
          const steps = 20;
          const step = startVolume / steps;
          let currentStep = 0;

          const interval = setInterval(() => {
            if (audioRef.current) {
              audioRef.current.volume = Math.max(0, startVolume - step * currentStep);
              currentStep++;
              if (currentStep >= steps) {
                clearInterval(interval);
                next();
                if (audioRef.current) audioRef.current.volume = volume;
              }
            }
          }, 10);
        };
        fadeOut();
      }
    } else {
      next();
    }
  }, [crossfade, volume, next, getNextTrack]);

  const handlePrevious = useCallback(() => {
    previous();
  }, [previous]);

  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  }, [setVolume]);

  return (
    <>
      {children}
      <PlayerControls
        onNext={handleNext}
        onPrevious={handlePrevious}
        onSeek={handleSeek}
        onVolumeChange={handleVolumeChange}
      />
    </>
  );
}

function PlayerControls({
  onNext: _onNext,
  onPrevious: _onPrevious,
  onSeek: _onSeek,
  onVolumeChange: _onVolumeChange,
}: {
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (position: number) => void;
  onVolumeChange: (volume: number) => void;
}) {
  return null;
}