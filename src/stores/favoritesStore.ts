import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { spotifyService } from '@/services/spotify';
import type { Track } from '@/types';

interface FavoritesState {
  tracks: Track[];
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
      isLoading: false,
      error: null,

      loadSpotifyFavorites: async () => {
        if (!spotifyService.isAuthenticated()) return;
        set({ isLoading: true, error: null });
        try {
          const spotifyTracks = await spotifyService.getAllSavedTracks();
          set(state => ({
            tracks: [...state.tracks.filter(track => track.source !== 'spotify'), ...spotifyTracks],
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
        set({ isLoading: true, error: null });
        try {
          if (track.source === 'spotify') {
            if (!spotifyService.isAuthenticated()) {
              throw new Error('Conecta tu cuenta de Spotify para guardar esta canción en Favoritos.');
            }
            if (isSaved) await spotifyService.removeSavedTracks([track.id]);
            else await spotifyService.saveTracks([track.id]);
          }
          set(state => ({
            tracks: isSaved
              ? state.tracks.filter(favorite => favorite.id !== track.id || favorite.source !== track.source)
              : [track, ...state.tracks],
            isLoading: false,
          }));
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'No se pudo actualizar Favoritos.',
          });
          throw error;
        }
      },

      isFavorite: (trackId) => get().tracks.some(track => track.id === trackId),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'wavelength-favorite-tracks',
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({ tracks: state.tracks }),
    }
  )
);
