import { useEffect, useRef, useCallback, useState } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useAuthStore } from '@/stores/authStore';
import { localFilesService } from '@/services/localFiles';
import { spotifyService } from '@/services/spotify';
import type { Track } from '@/types';

interface SpotifySdkTrack {
  id: string;
  name: string;
  uri: string;
  artists: { name: string }[];
  album: { images: { url: string }[] };
}

interface SpotifySdkState {
  paused: boolean;
  position: number;
  duration: number;
  track_window?: { current_track?: SpotifySdkTrack };
}

interface SpotifySdkPlayer {
  addListener(event: 'ready', callback: (data: { device_id: string }) => void): boolean;
  addListener(event: 'not_ready', callback: (data: { device_id: string }) => void): boolean;
  addListener(event: 'player_state_changed', callback: (state: SpotifySdkState | null) => void): boolean;
  addListener(event: 'initialization_error' | 'authentication_error' | 'account_error' | 'playback_error', callback: (data: { message: string }) => void): boolean;
  connect(): Promise<boolean>;
  disconnect(): void;
  activateElement(): Promise<void>;
  resume(): Promise<void>;
  pause(): Promise<void>;
  nextTrack(): Promise<void>;
  previousTrack(): Promise<void>;
  seek(position: number): Promise<void>;
  setVolume(volume: number): Promise<void>;
}

interface SpotifySdk {
  Player: new (options: {
    name: string;
    volume: number;
    getOAuthToken: (callback: (token: string) => void) => void;
  }) => SpotifySdkPlayer;
}

declare global {
  interface Window {
    Spotify?: SpotifySdk;
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

const SPOTIFY_SDK_URL = 'https://sdk.scdn.co/spotify-player.js';

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
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const [spotifySdkUnavailable, setSpotifySdkUnavailable] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const spotifyPlayerRef = useRef<SpotifySdkPlayer | null>(null);
  const [spotifyDeviceId, setSpotifyDeviceId] = useState<string | null>(null);
  const activePlaybackModeRef = useRef<'audio' | 'spotify' | 'loading'>('audio');
  const lastSpotifyTrackIdRef = useRef<string | null>(null);
  const spotifySdkTrackIdRef = useRef<string | null>(null);
  const spotifyPlaybackPendingTrackIdRef = useRef<string | null>(null);
  const lastSpotifyPositionRef = useRef(0);
  const wasSpotifyPlayingRef = useRef(false);
  const positionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const crossfadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSeekingRef = useRef(false);
  const mediaSessionSupported = typeof navigator !== 'undefined' && 'mediaSession' in navigator;

  const playSpotifyPreview = useCallback(async (track: Track, message: string): Promise<boolean> => {
    const audio = audioRef.current;
    if (!track.previewUrl || !audio) return false;
    activePlaybackModeRef.current = 'audio';
    audio.src = track.previewUrl;
    audio.load();
    try {
      await audio.play();
      usePlayerStore.setState({ isPlaying: true, position: 0, duration: track.duration });
      usePlayerStore.getState().setPlaybackError(message);
      return true;
    } catch {
      usePlayerStore.setState({
        isPlaying: false,
        playbackError: 'Spotify no pudo iniciar el avance de esta canción.',
      });
      return false;
    }
  }, []);

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
      if (activePlaybackModeRef.current === 'spotify') return;
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
      usePlayerStore.setState({
        isPlaying: false,
        playbackError: 'No se pudo cargar el audio. Comprueba que el archivo o avance esté disponible.',
      });
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

  useEffect(() => {
    if (!isAuthenticated || spotifyPlayerRef.current) return;

    let cancelled = false;
    let player: SpotifySdkPlayer | null = null;
    let activatePlayer: (() => void) | null = null;

    const initializePlayer = () => {
      if (cancelled || !window.Spotify || spotifyPlayerRef.current) return;

      player = new window.Spotify.Player({
        name: 'Wavelength Web Player',
        volume: usePlayerStore.getState().volume,
        getOAuthToken: callback => {
          spotifyService.getAccessToken().then(callback).catch(error => {
            usePlayerStore.getState().setPlaybackError(
              error instanceof Error ? error.message : 'No se pudo obtener el acceso a Spotify.'
            );
          });
        },
      });
      spotifyPlayerRef.current = player;
      activatePlayer = () => {
        void player?.activateElement().catch(error => {
          usePlayerStore.getState().setPlaybackError(
            error instanceof Error ? `No se pudo activar el reproductor: ${error.message}` : 'No se pudo activar el reproductor.'
          );
        });
      };
      document.addEventListener('pointerdown', activatePlayer, true);

      player.addListener('ready', ({ device_id }) => {
        setSpotifySdkUnavailable(false);
        setSpotifyDeviceId(device_id);
        lastSpotifyTrackIdRef.current = null;
      });
      player.addListener('not_ready', ({ device_id }) => {
        setSpotifyDeviceId(current => current === device_id ? null : current);
      });
      player.addListener('player_state_changed', state => {
        if (!state) return;
        const sdkTrackId = state.track_window?.current_track?.id;
        const store = usePlayerStore.getState();
        if (
          activePlaybackModeRef.current !== 'spotify'
          || !sdkTrackId
          || (store.currentTrack?.source === 'spotify' && sdkTrackId !== store.currentTrack.id)
          || (spotifyPlaybackPendingTrackIdRef.current === sdkTrackId && state.paused)
        ) {
          return;
        }
        spotifySdkTrackIdRef.current = sdkTrackId;
        const ended = state.paused
          && wasSpotifyPlayingRef.current
          && state.duration > 0
          && state.position >= state.duration - 1500;
        wasSpotifyPlayingRef.current = !state.paused;
        lastSpotifyPositionRef.current = state.position;
        if (ended) {
          if (store.repeatMode === 'track') {
            void player?.seek(0).then(() => player?.resume());
            usePlayerStore.setState({ isPlaying: true, position: 0 });
            return;
          }
          if (store.getNextTrack()) {
            store.next();
            return;
          }
        }
        usePlayerStore.setState({
          isPlaying: !state.paused,
          position: state.position,
          duration: state.duration,
        });
      });
      player.addListener('initialization_error', ({ message }) => {
        setSpotifySdkUnavailable(true);
        usePlayerStore.getState().setPlaybackError(
          message.toLowerCase().includes('keysystem') || message.toLowerCase().includes('failed to initialize player')
            ? 'Este navegador no habilitó el DRM que Spotify necesita para reproducir canciones completas. Prueba Chrome o Edge actualizado.'
            : `No se pudo iniciar el reproductor de Spotify: ${message}`
        );
      });
      player.addListener('authentication_error', ({ message }) => {
        setSpotifySdkUnavailable(true);
        usePlayerStore.getState().setPlaybackError(`Spotify no autorizó la reproducción: ${message}`);
      });
      player.addListener('account_error', ({ message }) => {
        setSpotifySdkUnavailable(true);
        usePlayerStore.getState().setPlaybackError(`La reproducción completa requiere Spotify Premium: ${message}`);
      });
      player.addListener('playback_error', ({ message }) => {
        usePlayerStore.getState().setPlaybackError(`Spotify no pudo reproducir esta canción: ${message}`);
      });
      void player.connect();
    };

    if (window.Spotify) {
      initializePlayer();
    } else {
      window.onSpotifyWebPlaybackSDKReady = initializePlayer;
      if (!document.querySelector(`script[src="${SPOTIFY_SDK_URL}"]`)) {
        const script = document.createElement('script');
        script.src = SPOTIFY_SDK_URL;
        script.async = true;
        script.onerror = () => {
          setSpotifySdkUnavailable(true);
          usePlayerStore.getState().setPlaybackError('No se pudo cargar el reproductor web de Spotify.');
        };
        document.body.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      if (window.onSpotifyWebPlaybackSDKReady === initializePlayer) {
        window.onSpotifyWebPlaybackSDKReady = undefined;
      }
      if (activatePlayer) document.removeEventListener('pointerdown', activatePlayer, true);
      player?.disconnect();
      if (spotifyPlayerRef.current === player) {
        spotifyPlayerRef.current = null;
        setSpotifyDeviceId(null);
        lastSpotifyTrackIdRef.current = null;
      }
    };
  }, [isAuthenticated]);

  const loadTrack = useCallback(async (track: typeof currentTrack) => {
    if (!track || !audioRef.current) return;

    const audio = audioRef.current;
    activePlaybackModeRef.current = 'loading';

    if (track.source === 'local') {
      lastSpotifyTrackIdRef.current = null;
      try {
        const blobUrl = await localFilesService.getFileUrl(track.id);
        if (!blobUrl) throw new Error('No se encontró el archivo de audio local.');
        audio.src = blobUrl;
        audio.load();
        activePlaybackModeRef.current = 'audio';
        if (usePlayerStore.getState().isPlaying) {
          await audio.play();
        }
      } catch (error) {
        activePlaybackModeRef.current = 'audio';
        usePlayerStore.setState({
          isPlaying: false,
          playbackError: error instanceof Error ? error.message : 'No se pudo reproducir el archivo local.',
        });
      }
    } else if (track.source === 'spotify') {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }

  }, []);

  useEffect(() => {
    if (currentTrack) {
      loadTrack(currentTrack);
    }
  }, [currentTrack, loadTrack]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      if (currentTrack?.source === 'spotify') {
        void spotifyPlayerRef.current?.setVolume(volume);
      }
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

    if (currentTrack?.source === 'spotify') {
      if (
        activePlaybackModeRef.current === 'spotify'
        && spotifySdkTrackIdRef.current === currentTrack.id
        && spotifyPlaybackPendingTrackIdRef.current !== currentTrack.id
      ) {
        const player = spotifyPlayerRef.current;
        const operation = isPlaying ? player?.resume() : player?.pause();
        void operation?.catch(error => {
          usePlayerStore.getState().setPlaybackError(
            error instanceof Error ? `No se pudo controlar la reproducción de Spotify: ${error.message}` : 'No se pudo controlar la reproducción de Spotify.'
          );
        });
      } else if (audioRef.current.hasAttribute('src')) {
        if (isPlaying) {
          void audioRef.current.play().catch(() => usePlayerStore.setState({ isPlaying: false }));
        } else {
          audioRef.current.pause();
        }
      }
      return;
    }
    if (activePlaybackModeRef.current === 'loading') return;

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
  }, [isPlaying, currentTrack]);

  useEffect(() => {
    if (currentTrack?.source !== 'spotify') {
      activePlaybackModeRef.current = 'audio';
      lastSpotifyTrackIdRef.current = null;
      return;
    }
    if (!isAuthenticated) {
      usePlayerStore.getState().setPlaybackError('Conecta tu cuenta de Spotify para reproducir esta canción.');
      usePlayerStore.setState({ isPlaying: false });
      return;
    }

    const player = spotifyPlayerRef.current;
    const deviceId = spotifyDeviceId;
    if (!player || !deviceId) {
      if (!spotifySdkUnavailable || !isPlaying || lastSpotifyTrackIdRef.current === currentTrack.id) return;
      lastSpotifyTrackIdRef.current = currentTrack.id;
      void playSpotifyPreview(
        currentTrack,
        'El reproductor completo de Spotify no está disponible; reproduciendo el avance si existe.'
      ).then(previewStarted => {
        if (previewStarted) return;
        activePlaybackModeRef.current = 'loading';
        usePlayerStore.getState().setPlaybackError(
          'Spotify no pudo iniciar el reproductor completo y esta canción no ofrece avance. Prueba Chrome o Edge actualizado y verifica que tu cuenta tenga Spotify Premium.'
        );
        usePlayerStore.setState({ isPlaying: false });
      });
      return;
    }
    if (!isPlaying) return;

    if (lastSpotifyTrackIdRef.current === currentTrack.id) {
      return;
    }

    lastSpotifyTrackIdRef.current = currentTrack.id;
    activePlaybackModeRef.current = 'spotify';
    usePlayerStore.getState().setPlaybackError(null);
    audioRef.current?.pause();

    const playOnDevice = async (track: Track) => {
      spotifyPlaybackPendingTrackIdRef.current = track.id;
      try {
        await spotifyService.transferPlayback([deviceId]);
        await spotifyService.play(undefined, [`spotify:track:${track.id}`], undefined, deviceId);
        spotifyPlaybackPendingTrackIdRef.current = null;
        if (usePlayerStore.getState().currentTrack?.id === track.id) {
          usePlayerStore.setState({ isPlaying: true });
        }
      } catch (error) {
        spotifyPlaybackPendingTrackIdRef.current = null;
        lastSpotifyTrackIdRef.current = null;
        const previewStarted = await playSpotifyPreview(
          track,
          'No se pudo iniciar la reproducción completa de Spotify; reproduciendo el avance disponible.'
        );
        if (previewStarted) {
          lastSpotifyTrackIdRef.current = track.id;
          setSpotifySdkUnavailable(true);
          return;
        }
        lastSpotifyTrackIdRef.current = null;
        const message = error instanceof Error ? error.message : 'No se pudo iniciar la reproducción.';
        usePlayerStore.getState().setPlaybackError(
          message.includes('Premium') || message.includes('403')
            ? 'La reproducción completa en la página requiere Spotify Premium.'
            : `No se pudo reproducir desde Spotify: ${message}`
        );
        usePlayerStore.setState({ isPlaying: false });
      }
    };

    void playOnDevice(currentTrack);
  }, [currentTrack, isAuthenticated, isPlaying, playSpotifyPreview, spotifyDeviceId, spotifySdkUnavailable]);

  useEffect(() => {
    if (isSeekingRef.current) return;
    if (currentTrack?.source === 'spotify') {
      if (
        activePlaybackModeRef.current === 'spotify'
        && Math.abs(position - lastSpotifyPositionRef.current) > 500
      ) {
        lastSpotifyPositionRef.current = position;
        void spotifyPlayerRef.current?.seek(position).catch(error => {
          usePlayerStore.getState().setPlaybackError(
            error instanceof Error ? `No se pudo cambiar el minuto de reproducción: ${error.message}` : 'No se pudo cambiar el minuto de reproducción.'
          );
        });
      }
      return;
    }
    if (!audioRef.current) return;

    const targetTime = position / 1000;
    const currentTime = audioRef.current.currentTime;

    if (Math.abs(currentTime - targetTime) > 1) {
      audioRef.current.currentTime = targetTime;
    }
  }, [position, currentTrack]);

  const handleSeek = useCallback((newPosition: number) => {
    isSeekingRef.current = true;
    seek(newPosition);
    if (currentTrack?.source === 'spotify' && activePlaybackModeRef.current === 'spotify') {
      void spotifyPlayerRef.current?.seek(newPosition);
    } else if (audioRef.current) {
      audioRef.current.currentTime = newPosition / 1000;
    }
    setTimeout(() => { isSeekingRef.current = false; }, 100);
  }, [currentTrack, seek]);

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
    if (currentTrack?.source === 'spotify') void spotifyPlayerRef.current?.setVolume(newVolume);
  }, [currentTrack, setVolume]);

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