export interface YouTubeMusicTrack {
  videoId: string;
  title: string;
  artist: string;
  album?: string;
  durationMs: number;
  thumbnail?: string;
  url: string;
}

export interface YouTubeMusicPlaylist {
  id: string;
  name: string;
  description?: string;
  coverArt?: string;
  totalTracks: number;
  duration: number;
  isPublic: boolean;
}

interface YouTubeMusicStatus {
  connected: boolean;
  connecting: boolean;
  configured: boolean;
  userCode?: string;
  verificationUrl?: string;
  expiresIn?: number;
  interval?: number;
}

interface DeviceAuthorization {
  userCode: string;
  verificationUrl: string;
  expiresIn: number;
  interval: number;
}

async function request<T>(action: string, options: RequestInit = {}, query = ''): Promise<T> {
  const response = await fetch(`/api/ytmusic?action=${encodeURIComponent(action)}${query}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('No se encontró la función de YouTube Music. En local, inicia el proyecto con `vercel dev`; en producción, vuelve a desplegar con la función /api/ytmusic.');
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `YouTube Music respondió con HTTP ${response.status}.`);
  }
  return payload as T;
}

export const ytMusicService = {
  getStatus(): Promise<YouTubeMusicStatus> {
    return request<YouTubeMusicStatus>('status').then(status => {
      if (typeof status.connected !== 'boolean' || typeof status.configured !== 'boolean') {
        throw new Error('La función de YouTube Music devolvió un estado incompleto. Revisa el despliegue de /api/ytmusic.');
      }
      return status;
    });
  },

  startConnection(): Promise<DeviceAuthorization> {
    return request('auth-start', { method: 'POST' });
  },

  pollConnection(): Promise<{ pending: boolean; connected?: boolean }> {
    return request('auth-poll');
  },

  disconnect(): Promise<{ connected: false }> {
    return request('auth-logout', { method: 'POST' });
  },

  async searchTracks(query: string): Promise<YouTubeMusicTrack[]> {
    const params = new URLSearchParams({ q: query });
    const result = await request<{ tracks: YouTubeMusicTrack[] }>('search', {}, `&${params.toString()}`);
    return result.tracks;
  },

  async getPlaylists(): Promise<YouTubeMusicPlaylist[]> {
    const result = await request<{ playlists: YouTubeMusicPlaylist[] }>('playlists');
    return result.playlists;
  },

  createPlaylist(input: {
    name: string;
    description: string;
    isPublic: boolean;
    videoIds: string[];
  }): Promise<{ id: string; url: string }> {
    return request('create-playlist', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
};
