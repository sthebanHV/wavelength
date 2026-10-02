import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { spotifyService } from '@/services/spotify';
import type { Track } from '@/types';

interface FavoritesState {
  tracks: Track[];
  spotifyTrackIds: string[];
  isLoading: boolean;
  error: string | null;
  loadSpotifyFavorites: () => Promise<void>;
  toggleFavorite: (track: Track) => Promise<void>;
  isFavorite: (trackId: string) => boolean;
  clearError: () => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      tracks: [],
      spotifyTrackIds: [],
      isLoading: false,
      error: null,

      loadSpotifyFavorites: async () => {
        if (!spotifyService.isAuthenticated()) return;
        set({ isLoading: true, error: null });
        try {
          const spotifyTracks = await spotifyService.getAllSavedTracks();
          set(state => ({
            tracks: Array.from(
              new Map([...state.tracks, ...spotifyTracks].map(track => [`${track.source}:${track.id}`, track])).values()
            ),
            spotifyTrackIds: spotifyTracks.map(track => track.id),
            isLoading: false,
          }));
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'No se pudieron cargar tus canciones favoritas.',
          });
        }
      },

      toggleFavorite: async (track) => {
        const isSaved = get().tracks.some(favorite => favorite.id === track.id && favorite.source === track.source);
        const isSavedOnSpotify = track.source === 'spotify' && get().spotifyTrackIds.includes(track.id);
        set({ isLoading: true, error: null });

        if (isSaved) {
          if (isSavedOnSpotify && spotifyService.isAuthenticated()) {
            try {
              await spotifyService.removeSavedTracks([track.id]);
            } catch (error) {
              set({
                isLoading: false,
                error: error instanceof Error
                  ? `No se pudo quitar de los favoritos de Spotify: ${error.message}`
                  : 'No se pudo quitar de los favoritos de Spotify.',
              });
              throw error;
            }
          }
          set(state => ({
            tracks: state.tracks.filter(favorite => favorite.id !== track.id || favorite.source !== track.source),
            spotifyTrackIds: state.spotifyTrackIds.filter(id => id !== track.id),
            isLoading: false,
          }));
          return;
        }

        set(state => ({
          tracks: [track, ...state.tracks.filter(favorite => favorite.id !== track.id || favorite.source !== track.source)],
          isLoading: track.source === 'spotify' && spotifyService.isAuthenticated(),
          error: null,
        }));

        if (track.source !== 'spotify') return;

        if (!spotifyService.isAuthenticated()) {
          set({ error: 'Guardada en Wavelength. Conecta Spotify para sincronizarla con tus favoritos de Spotify.' });
          return;
        }

        try {
          await spotifyService.saveTracks([track.id]);
          set(state => ({
            spotifyTrackIds: state.spotifyTrackIds.includes(track.id)
              ? state.spotifyTrackIds
              : [...state.spotifyTrackIds, track.id],
            isLoading: false,
            error: null,
          }));
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error
              ? `Guardada en Wavelength, pero Spotify no pudo sincronizarla: ${error.message}`
              : 'Guardada en Wavelength, pero Spotify no pudo sincronizarla.',
          });
        }
      },

      isFavorite: (trackId) => get().tracks.some(track => track.id === trackId),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'wavelength-favorite-tracks',
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({ tracks: state.tracks, spotifyTrackIds: state.spotifyTrackIds }),
    }
  )
);
