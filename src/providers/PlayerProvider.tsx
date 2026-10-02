import { useEffect, useRef, useCallback, useState } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useAuthStore } from '@/stores/authStore';
import { localFilesService } from '@/services/localFiles';
import { spotifyService } from '@/services/spotify';
import { useFavoritesStore } from '@/stores/favoritesStore';
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
  getCurrentState(): Promise<SpotifySdkState | null>;
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
  const endingSpotifyTrackIdRef = useRef<string | null>(null);
  const autoplayInProgressRef = useRef<string | null>(null);
  const positionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const crossfadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSeekingRef = useRef(false);
  const mediaSessionSupported = typeof navigator !== 'undefined' && 'mediaSession' in navigator;

  const advanceAtEnd = useCallback(async () => {
    const initialState = usePlayerStore.getState();
    const endedTrack = initialState.currentTrack;
    if (!endedTrack || autoplayInProgressRef.current === endedTrack.id) return;

    if (initialState.repeatMode === 'track') {
      if (endedTrack.source === 'spotify' && activePlaybackModeRef.current === 'spotify') {
        const player = spotifyPlayerRef.current;
        void player?.seek(0).then(() => player.resume()).catch(error => {
          usePlayerStore.getState().setPlaybackError(
            error instanceof Error ? `No se pudo repetir la canción: ${error.message}` : 'No se pudo repetir la canción.'
          );
          usePlayerStore.setState({ isPlaying: false });
        });
      } else if (audioRef.current) {
        audioRef.current.currentTime = 0;
        void audioRef.current.play().catch(error => {
          usePlayerStore.getState().setPlaybackError(
            error instanceof Error ? `No se pudo repetir la canción: ${error.message}` : 'No se pudo repetir la canción.'
          );
          usePlayerStore.setState({ isPlaying: false });
        });
      }
      usePlayerStore.setState({ isPlaying: true, position: 0 });
      return;
    }

    if (initialState.getNextTrack()) {
      initialState.next();
      return;
    }

    const autoplaySetting = localStorage.getItem('wavelength-autoplay');
    if (autoplaySetting === 'false') {
      usePlayerStore.setState({ isPlaying: false, position: initialState.duration });
      return;
    }

    autoplayInProgressRef.current = endedTrack.id;
    usePlayerStore.setState({ isPlaying: false });

    try {
      const pool = new Map<string, Track>();
      let spotifyLookupError: string | null = null;
      const addTracks = (tracks: Track[]) => {
        for (const track of tracks) {
          pool.set(`${track.source}:${track.id}`, track);
        }
      };

      const state = usePlayerStore.getState();
      const unavailableIds = new Set([
        ...state.queue.map(item => `${item.track.source}:${item.track.id}`),
        ...state.history.slice(0, 15).map(item => `${item.track.source}:${item.track.id}`),
        `${endedTrack.source}:${endedTrack.id}`,
      ]);
      const hasAvailableCandidate = () => [...pool.keys()].some(key => !unavailableIds.has(key));

      addTracks(useFavoritesStore.getState().tracks);

      if (endedTrack.source === 'spotify' && spotifyService.isAuthenticated()) {
        if (endedTrack.sourceId || endedTrack.id) {
          try {
            addTracks(await spotifyService.getRecommendations(
              [endedTrack.sourceId || endedTrack.id],
              endedTrack.artistId ? [endedTrack.artistId] : [],
              [],
              30
            ));
          } catch (error) {
            spotifyLookupError ??= error instanceof Error ? error.message : 'No se pudieron cargar recomendaciones.';
            // Recommendations may be unavailable for some Spotify apps; use the user's catalog below.
          }
        }

        if (!hasAvailableCandidate()) {
          try {
            addTracks(await spotifyService.getTopTracks('short_term', 50));
          } catch (error) {
            spotifyLookupError ??= error instanceof Error ? error.message : 'No se pudieron cargar tus canciones más escuchadas.';
            // Saved and recently played tracks remain available as fallback sources.
          }
        }
        if (!hasAvailableCandidate()) {
          try {
            addTracks(await spotifyService.getSavedTracks(50));
          } catch (error) {
            spotifyLookupError ??= error instanceof Error ? error.message : 'No se pudieron cargar tus canciones guardadas.';
            // Continue to local tracks and favorites if Spotify library access is unavailable.
          }
        }
        if (!hasAvailableCandidate()) {
          try {
            addTracks(await spotifyService.getRecentlyPlayed(50));
          } catch (error) {
            spotifyLookupError ??= error instanceof Error ? error.message : 'No se pudo cargar el historial de Spotify.';
            // Report a clear playback error if all catalog sources are unavailable.
          }
        }
      }

      if (endedTrack.source === 'local' || !hasAvailableCandidate()) {
        addTracks(await localFilesService.getAllTracks());
      }

      const currentState = usePlayerStore.getState();
      const currentUnavailableIds = new Set([
        ...currentState.queue.map(item => `${item.track.source}:${item.track.id}`),
        ...currentState.history.slice(0, 15).map(item => `${item.track.source}:${item.track.id}`),
        `${currentState.currentTrack?.source}:${currentState.currentTrack?.id}`,
      ]);
      const availableTracks = [...pool.entries()]
        .filter(([key]) => !currentUnavailableIds.has(key))
        .map(([, track]) => track);
      const lessRecentTracks = availableTracks.filter(
        track => !currentState.history.slice(0, 15).some(item => item.track.id === track.id && item.track.source === track.source)
      );
      const preferredTracks = (lessRecentTracks.length > 0 ? lessRecentTracks : availableTracks)
        .filter(track => track.source === endedTrack.source);
      const candidates = preferredTracks.length > 0
        ? preferredTracks
        : lessRecentTracks.length > 0 ? lessRecentTracks : availableTracks;

      const latestTrack = usePlayerStore.getState().currentTrack;
      if (latestTrack?.id !== endedTrack.id || latestTrack.source !== endedTrack.source) return;
      if (candidates.length === 0) {
        if (usePlayerStore.getState().playRandomFromQueue()) return;
        usePlayerStore.getState().setPlaybackError(
          spotifyLookupError
            ? `No se pudieron cargar canciones aleatorias de Spotify: ${spotifyLookupError}`
            : 'La cola terminó y no hay canciones aleatorias disponibles. Agrega música a favoritos o a tu biblioteca para continuar automáticamente.'
        );
        return;
      }

      const randomTrack = candidates[Math.floor(Math.random() * candidates.length)];
      usePlayerStore.getState().playNextTrack(randomTrack, 'autoplay');
    } catch (error) {
      usePlayerStore.getState().setPlaybackError(
        error instanceof Error
          ? `No se pudo encontrar otra canción para reproducir: ${error.message}`
          : 'No se pudo encontrar otra canción para reproducir.'
      );
    } finally {
      autoplayInProgressRef.current = null;
    }
  }, []);

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
          } else {
            void advanceAtEnd();
          }
        }, 100);
      } else {
        void advanceAtEnd();
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
          && (wasSpotifyPlayingRef.current || store.isPlaying)
          && state.duration > 0
          && Math.max(state.position, lastSpotifyPositionRef.current) >= state.duration - 3000;
        wasSpotifyPlayingRef.current = !state.paused;
        lastSpotifyPositionRef.current = state.position;
        if (ended) {
          if (endingSpotifyTrackIdRef.current !== sdkTrackId) {
            endingSpotifyTrackIdRef.current = sdkTrackId;
            void advanceAtEnd();
          }
          return;
        }
        if (!state.paused) endingSpotifyTrackIdRef.current = null;
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
  }, [advanceAtEnd, isAuthenticated]);

  useEffect(() => {
    endingSpotifyTrackIdRef.current = null;
    lastSpotifyPositionRef.current = 0;
    wasSpotifyPlayingRef.current = false;
  }, [currentTrack?.id, currentTrack?.source]);

  useEffect(() => {
    const expectedTrackId = currentTrack?.source === 'spotify' ? currentTrack.id : null;
    if (!expectedTrackId || !isPlaying) return;

    const interval = setInterval(() => {
      if (activePlaybackModeRef.current !== 'spotify') return;
      const player = spotifyPlayerRef.current;
      if (!player) return;

      void player.getCurrentState().then(state => {
        const actualTrackId = state?.track_window?.current_track?.id;
        if (!state || actualTrackId !== expectedTrackId) return;

        const currentState = usePlayerStore.getState();
        const nearEnd = state.duration > 0
          && Math.max(state.position, lastSpotifyPositionRef.current) >= state.duration - 500;
        if (
          nearEnd
          && currentState.isPlaying
          && currentState.currentTrack?.source === 'spotify'
          && currentState.currentTrack.id === expectedTrackId
          && endingSpotifyTrackIdRef.current !== expectedTrackId
        ) {
          endingSpotifyTrackIdRef.current = expectedTrackId;
          void advanceAtEnd();
        }
      }).catch(error => {
        usePlayerStore.getState().setPlaybackError(
          error instanceof Error ? `No se pudo revisar el estado de Spotify: ${error.message}` : 'No se pudo revisar el estado de Spotify.'
        );
      });
    }, 250);

    return () => clearInterval(interval);
  }, [advanceAtEnd, currentTrack, isPlaying]);

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