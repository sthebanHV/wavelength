export interface Track {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  album?: string;
  albumId?: string;
  albumArt?: string;
  duration: number;
  durationFormatted?: string;
  source: 'local' | 'spotify';
  sourceId?: string;
  url?: string;
  previewUrl?: string;
  trackNumber?: number;
  discNumber?: number;
  genre?: string;
  year?: number;
  explicit?: boolean;
  popularity?: number;
  addedAt: number;
  playCount?: number;
  lastPlayedAt?: number;
  metadata?: Record<string, unknown>;
}

export interface Album {
  id: string;
  name: string;
  artist: string;
  artistId?: string;
  coverArt?: string;
  releaseDate?: string;
  totalTracks: number;
  duration: number;
  source: 'local' | 'spotify';
  sourceId?: string;
  tracks: Track[];
  addedAt: number;
}

export interface Artist {
  id: string;
  name: string;
  image?: string;
  genres?: string[];
  popularity?: number;
  followers?: number;
  source: 'local' | 'spotify';
  sourceId?: string;
  albums: Album[];
  topTracks: Track[];
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverArt?: string;
  owner?: string;
  ownerId?: string;
  isPublic: boolean;
  collaborative: boolean;
  tracks: Track[];
  totalTracks: number;
  duration: number;
  source: 'local' | 'spotify' | 'youtube';
  sourceId?: string;
  createdAt: number;
  updatedAt: number;
  followers?: number;
}

export interface QueueItem {
  id: string;
  track: Track;
  addedAt: number;
  source: 'user' | 'radio' | 'autoplay' | 'playlist' | 'album';
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTrack: Track | null;
  queue: QueueItem[];
  history: QueueItem[];
  currentIndex: number;
  volume: number;
  position: number;
  duration: number;
  repeatMode: 'off' | 'context' | 'track';
  shuffle: boolean;
  crossfade: boolean;
}

export interface User {
  id: string;
  displayName: string;
  email?: string;
  avatar?: string;
  country?: string;
  product?: 'free' | 'premium';
  followers?: number;
  following?: number;
}

export interface SearchResults {
  tracks: Track[];
  albums: Album[];
  artists: Artist[];
  playlists: Playlist[];
  shows?: unknown[];
  episodes?: unknown[];
}

export type ViewMode = 'grid' | 'list' | 'compact';

export type SortField = 'title' | 'artist' | 'album' | 'duration' | 'addedAt' | 'playCount';
export type SortDirection = 'asc' | 'desc';

export interface LibraryFilters {
  search: string;
  sortField: SortField;
  sortDirection: SortDirection;
  viewMode: ViewMode;
  sourceFilter: 'all' | 'local' | 'spotify';
}

export interface AudioFeatures {
  acousticness: number;
  danceability: number;
  energy: number;
  instrumentalness: number;
  key: number;
  liveness: number;
  loudness: number;
  mode: number;
  speechiness: number;
  tempo: number;
  timeSignature: number;
  valence: number;
}

export interface Device {
  id: string;
  name: string;
  type: 'computer' | 'smartphone' | 'speaker' | 'tv' | 'avr' | 'stb' | 'audioDongle' | 'gameConsole' | 'castVideo' | 'castAudio' | 'automobile' | 'unknown';
  isActive: boolean;
  isPrivateSession: boolean;
  isRestricted: boolean;
  volumePercent: number | null;
  supportsVolume: boolean;
}

export interface PlaylistCreateInput {
  name: string;
  description?: string;
  isPublic?: boolean;
  collaborative?: boolean;
  tracks?: Track[];
}

export interface LibraryStats {
  totalTracks: number;
  totalAlbums: number;
  totalArtists: number;
  totalPlaylists: number;
  totalDuration: number;
  localTracks: number;
  spotifyTracks: number;
  storageUsed: number;
}
