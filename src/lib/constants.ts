export const SPOTIFY_CONFIG = {
  CLIENT_ID: import.meta.env.VITE_SPOTIFY_CLIENT_ID || '',
  REDIRECT_URI: import.meta.env.VITE_SPOTIFY_REDIRECT_URI || `${window.location.origin}/callback`,
  SCOPES: [
    'user-read-private',
    'user-read-email',
    'user-top-read',
    'user-read-recently-played',
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing',
    'playlist-read-private',
    'playlist-read-collaborative',
    'playlist-modify-public',
    'playlist-modify-private',
    'user-library-read',
    'user-library-modify',
    'user-follow-read',
    'user-follow-modify',
    'streaming',
    'app-remote-control',
  ].join(' '),
  AUTH_URL: 'https://accounts.spotify.com/authorize',
  TOKEN_URL: 'https://accounts.spotify.com/api/token',
  API_BASE: 'https://api.spotify.com/v1',
};

export const STORAGE_KEYS = {
  THEME: 'wavelength-theme',
  AUTH_TOKENS: 'wavelength-spotify-tokens',
  AUTH_STATE: 'wavelength-auth-state',
  SPOTIFY_AUTH_TRANSACTION: 'wavelength-spotify-auth-transaction',
  PLAYER_STATE: 'wavelength-player-state',
  LIBRARY_FILTERS: 'wavelength-library-filters',
  QUEUE: 'wavelength-queue',
  HISTORY: 'wavelength-history',
  SETTINGS: 'wavelength-settings',
  RECENT_SEARCHES: 'wavelength-recent-searches',
} as const;

export const ROUTES = {
  HOME: '/',
  LIBRARY: '/library',
  SEARCH: '/search',
  PLAYLISTS: '/playlists',
  PLAYLIST_DETAIL: '/playlists/:id',
  ALBUMS: '/albums',
  ALBUM_DETAIL: '/albums/:id',
  ARTISTS: '/artists',
  ARTIST_DETAIL: '/artists/:id',
  NOW_PLAYING: '/now-playing',
  SETTINGS: '/settings',
  CALLBACK: '/callback',
  UPLOAD: '/upload',
} as const;

export const KEYBOARD_SHORTCUTS = {
  PLAY_PAUSE: 'Space',
  NEXT: 'ArrowRight',
  PREVIOUS: 'ArrowLeft',
  VOLUME_UP: 'ArrowUp',
  VOLUME_DOWN: 'ArrowDown',
  SEEK_FORWARD: 'Shift+ArrowRight',
  SEEK_BACKWARD: 'Shift+ArrowLeft',
  SHUFFLE: 's',
  REPEAT: 'r',
  LIKE: 'l',
  SEARCH: '/',
  FULLSCREEN: 'f',
  MUTE: 'm',
} as const;

export const AUDIO_FORMATS = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/flac',
  'audio/ogg',
  'audio/mp4',
  'audio/m4a',
  'audio/aac',
  'audio/webm',
] as const;

export const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
export const MAX_PLAYLIST_TRACKS = 10000;

export const ANIMATION_DURATIONS = {
  fast: 150,
  normal: 250,
  slow: 350,
} as const;

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;