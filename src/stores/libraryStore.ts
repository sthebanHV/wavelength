import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/lib/constants';
import type { Track, Album, Artist, Playlist, LibraryFilters, ViewMode, SortField, SortDirection } from '@/types';

interface LibraryState {
  tracks: Track[];
  albums: Album[];
  artists: Artist[];
  playlists: Playlist[];
  filters: LibraryFilters;
  isLoading: boolean;
  lastUpdated: number;

  setTracks: (tracks: Track[]) => void;
  addTracks: (tracks: Track[]) => void;
  removeTrack: (trackId: string) => void;
  updateTrack: (track: Track) => void;

  setAlbums: (albums: Album[]) => void;
  setArtists: (artists: Artist[]) => void;
  setPlaylists: (playlists: Playlist[] | ((prev: Playlist[]) => Playlist[])) => void;
  addPlaylist: (playlist: Playlist) => void;
  updatePlaylist: (playlist: Playlist) => void;
  removePlaylist: (playlistId: string) => void;

  setFilters: (filters: Partial<LibraryFilters>) => void;
  setSearch: (search: string) => void;
  setSort: (field: SortField, direction?: SortDirection) => void;
  setViewMode: (mode: ViewMode) => void;
  setSourceFilter: (filter: LibraryFilters['sourceFilter']) => void;
  resetFilters: () => void;

  setLoading: (loading: boolean) => void;
  refresh: () => void;

  getFilteredTracks: () => Track[];
  getFilteredAlbums: () => Album[];
  getFilteredArtists: () => Artist[];
  getFilteredPlaylists: () => Playlist[];
}

const defaultFilters: LibraryFilters = {
  search: '',
  sortField: 'addedAt',
  sortDirection: 'desc',
  viewMode: 'grid',
  sourceFilter: 'all',
};

function applyFilters<T>(items: T[], filters: LibraryFilters): T[] {
  let result = [...items];

  if (filters.sourceFilter !== 'all') {
    result = result.filter(item => (item as { source?: string }).source === filters.sourceFilter);
  }

  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    result = result.filter(item =>
      ((item as { title?: string }).title?.toLowerCase().includes(searchLower) ||
        (item as { name?: string }).name?.toLowerCase().includes(searchLower) ||
        (item as { artist?: string }).artist?.toLowerCase().includes(searchLower) ||
        (item as { album?: string }).album?.toLowerCase().includes(searchLower))
    );
  }

  result.sort((a, b) => {
    let aVal: string | number = (a as Record<string, unknown>)[filters.sortField] as string | number || 0;
    let bVal: string | number = (b as Record<string, unknown>)[filters.sortField] as string | number || 0;

    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();

    if (aVal < bVal) return filters.sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return filters.sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  return result;
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      tracks: [],
      albums: [],
      artists: [],
      playlists: [],
      filters: defaultFilters,
      isLoading: false,
      lastUpdated: 0,

      setTracks: (tracks) => set({ tracks, lastUpdated: Date.now() }),

      addTracks: (tracks) => set(state => {
        const existingIds = new Set(state.tracks.map(t => t.id));
        const newTracks = tracks.filter(t => !existingIds.has(t.id));
        return { tracks: [...state.tracks, ...newTracks], lastUpdated: Date.now() };
      }),

      removeTrack: (trackId) => set(state => ({
        tracks: state.tracks.filter(t => t.id !== trackId),
        lastUpdated: Date.now(),
      })),

      updateTrack: (track) => set(state => ({
        tracks: state.tracks.map(t => t.id === track.id ? track : t),
        lastUpdated: Date.now(),
      })),

      setAlbums: (albums) => set({ albums }),

      setArtists: (artists) => set({ artists }),

      setPlaylists: (playlists) => set(state => ({
      playlists: typeof playlists === 'function' ? playlists(state.playlists) : playlists
    })),

      addPlaylist: (playlist) => set(state => ({
        playlists: [playlist, ...state.playlists],
      })),

      updatePlaylist: (playlist) => set(state => ({
        playlists: state.playlists.map(p => p.id === playlist.id ? playlist : p),
      })),

      removePlaylist: (playlistId) => set(state => ({
        playlists: state.playlists.filter(p => p.id !== playlistId),
      })),

      setFilters: (filters) => set(state => ({
        filters: { ...state.filters, ...filters },
      })),

      setSearch: (search) => set(state => ({
        filters: { ...state.filters, search },
      })),

      setSort: (field, direction) => set(state => ({
        filters: {
          ...state.filters,
          sortField: field,
          sortDirection: direction || (state.filters.sortField === field && state.filters.sortDirection === 'asc' ? 'desc' : 'asc'),
        },
      })),

      setViewMode: (viewMode) => set(state => ({
        filters: { ...state.filters, viewMode },
      })),

      setSourceFilter: (sourceFilter) => set(state => ({
        filters: { ...state.filters, sourceFilter },
      })),

      resetFilters: () => set({ filters: defaultFilters }),

      setLoading: (isLoading) => set({ isLoading }),

      refresh: () => set({ lastUpdated: Date.now() }),

      getFilteredTracks: () => applyFilters(get().tracks, get().filters),

      getFilteredAlbums: () => applyFilters(get().albums, get().filters),

      getFilteredArtists: () => applyFilters(get().artists, get().filters),

      getFilteredPlaylists: () => applyFilters(get().playlists, get().filters),
    }),
    {
      name: STORAGE_KEYS.SETTINGS,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        filters: state.filters,
      }),
    }
  )
);