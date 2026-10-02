import { SPOTIFY_CONFIG, STORAGE_KEYS } from '@/lib/constants';
import type { Track, Album, Artist, Playlist, User, SearchResults, AudioFeatures, Device } from '@/types';

interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenType: string;
}

function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function getStoredTokens(): Tokens | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.AUTH_TOKENS);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function setStoredTokens(tokens: Tokens): void {
  localStorage.setItem(STORAGE_KEYS.AUTH_TOKENS, JSON.stringify(tokens));
}

function clearStoredTokens(): void {
  localStorage.removeItem(STORAGE_KEYS.AUTH_TOKENS);
}

async function refreshAccessToken(refreshToken: string): Promise<Tokens | null> {
  try {
    const response = await fetch(SPOTIFY_CONFIG.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: SPOTIFY_CONFIG.CLIENT_ID,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: Date.now() + data.expires_in * 1000,
      tokenType: data.token_type,
    };
  } catch {
    return null;
  }
}

async function getValidAccessToken(): Promise<string | null> {
  const tokens = getStoredTokens();
  if (!tokens) return null;

  if (Date.now() < tokens.expiresAt - 60000) {
    return tokens.accessToken;
  }

  const newTokens = await refreshAccessToken(tokens.refreshToken);
  if (newTokens) {
    setStoredTokens(newTokens);
    return newTokens.accessToken;
  }

  clearStoredTokens();
  return null;
}

async function spotifyFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) throw new Error('Not authenticated');

  const response = await fetch(`${SPOTIFY_CONFIG.API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 401) {
    clearStoredTokens();
    throw new Error('Authentication expired');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.error?.message || `HTTP ${response.status}`);
  }

  if (response.status === 204) return {} as T;
  return response.json();
}

function mapSpotifyTrack(item: SpotifyApi.TrackObjectFull | SpotifyApi.TrackObjectSimplified): Track {
  const fullItem = item as SpotifyApi.TrackObjectFull;
  return {
    id: item.id,
    title: item.name,
    artist: item.artists.map(a => a.name).join(', '),
    artistId: item.artists[0]?.id,
    album: fullItem.album?.name || '',
    albumId: fullItem.album?.id,
    albumArt: fullItem.album?.images[0]?.url,
    duration: item.duration_ms,
    durationFormatted: formatDuration(item.duration_ms),
    source: 'spotify',
    sourceId: item.id,
    url: item.external_urls.spotify,
    previewUrl: item.preview_url || undefined,
    trackNumber: item.track_number,
    discNumber: item.disc_number,
    explicit: item.explicit,
    popularity: fullItem.popularity,
    addedAt: Date.now(),
  };
}

function mapSpotifyAlbum(item: SpotifyApi.AlbumObjectSimplified | SpotifyApi.AlbumObjectFull): Album {
  return {
    id: item.id,
    name: item.name,
    artist: item.artists.map(a => a.name).join(', '),
    artistId: item.artists[0]?.id,
    coverArt: item.images[0]?.url,
    releaseDate: item.release_date,
    totalTracks: item.total_tracks,
    duration: 0,
    source: 'spotify',
    sourceId: item.id,
    tracks: [],
    addedAt: Date.now(),
  };
}

function mapSpotifyArtist(item: SpotifyApi.ArtistObjectFull): Artist {
  return {
    id: item.id,
    name: item.name,
    image: item.images[0]?.url,
    genres: item.genres,
    popularity: item.popularity,
    followers: item.followers?.total,
    source: 'spotify',
    sourceId: item.id,
    albums: [],
    topTracks: [],
  };
}

function mapSpotifyPlaylist(item: SpotifyApi.PlaylistObjectSimplified | SpotifyApi.PlaylistObjectFull): Playlist {
  return {
    id: item.id,
    name: item.name,
    description: item.description || undefined,
    coverArt: item.images?.[0]?.url,
    owner: item.owner.display_name,
    ownerId: item.owner.id,
    isPublic: item.public,
    collaborative: item.collaborative,
    tracks: [],
    totalTracks: item.tracks?.total ?? 0,
    duration: 0,
    source: 'spotify',
    sourceId: item.id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    followers: item.followers?.total,
  };
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export const spotifyService = {
  async initiateAuth(): Promise<void> {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = crypto.randomUUID();

    localStorage.setItem(STORAGE_KEYS.SPOTIFY_AUTH_TRANSACTION, JSON.stringify({ codeVerifier, state }));

    const params = new URLSearchParams({
      client_id: SPOTIFY_CONFIG.CLIENT_ID,
      response_type: 'code',
      redirect_uri: SPOTIFY_CONFIG.REDIRECT_URI,
      scope: SPOTIFY_CONFIG.SCOPES,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
      state,
      show_dialog: 'true',
    });

    window.location.href = `${SPOTIFY_CONFIG.AUTH_URL}?${params.toString()}`;
  },

  async handleCallback(code: string, state: string): Promise<boolean> {
    const stored = localStorage.getItem(STORAGE_KEYS.SPOTIFY_AUTH_TRANSACTION);
    if (!stored) {
      throw new Error('No se encontró la verificación de inicio de sesión. Vuelve a iniciar sesión desde la app.');
    }

    let transaction: { codeVerifier: string; state: string };
    try {
      transaction = JSON.parse(stored) as { codeVerifier: string; state: string };
    } catch {
      localStorage.removeItem(STORAGE_KEYS.SPOTIFY_AUTH_TRANSACTION);
      throw new Error('La verificación de inicio de sesión está dañada. Vuelve a iniciar sesión desde la app.');
    }

    if (state !== transaction.state) {
      localStorage.removeItem(STORAGE_KEYS.SPOTIFY_AUTH_TRANSACTION);
      throw new Error('La verificación de seguridad no coincide. Vuelve a iniciar sesión desde la app.');
    }

    const response = await fetch(SPOTIFY_CONFIG.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: SPOTIFY_CONFIG.CLIENT_ID,
        grant_type: 'authorization_code',
        code,
        redirect_uri: SPOTIFY_CONFIG.REDIRECT_URI,
        code_verifier: transaction.codeVerifier,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null) as {
        error?: string | { message?: string };
        error_description?: string;
      } | null;
      const errorMessage = errorData?.error_description
        || (typeof errorData?.error === 'string' ? errorData.error : errorData?.error?.message)
        || `HTTP ${response.status}`;
      throw new Error(`Spotify rechazó el inicio de sesión: ${errorMessage}`);
    }

    const data = await response.json();
    const tokens: Tokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
      tokenType: data.token_type,
    };

    setStoredTokens(tokens);
    localStorage.removeItem(STORAGE_KEYS.SPOTIFY_AUTH_TRANSACTION);
    return true;
  },

  isAuthenticated(): boolean {
    return !!getStoredTokens();
  },

  async logout(): Promise<void> {
    clearStoredTokens();
  },

  async getCurrentUser(): Promise<User> {
    const data = await spotifyFetch<SpotifyApi.CurrentUsersProfileResponse>('/me');
    return {
      id: data.id,
      displayName: data.display_name || data.id,
      email: data.email,
      avatar: data.images[0]?.url,
      country: data.country,
      product: data.product as 'free' | 'premium',
      followers: data.followers?.total,
    };
  },

  async getUserPlaylists(limit = 50, offset = 0): Promise<Playlist[]> {
    const data = await spotifyFetch<SpotifyApi.ListOfCurrentUsersPlaylistsResponse>(
      `/me/playlists?limit=${limit}&offset=${offset}`
    );
    return data.items.map(mapSpotifyPlaylist);
  },

  async getPlaylist(playlistId: string): Promise<Playlist> {
    const data = await spotifyFetch<SpotifyApi.PlaylistObjectFull>(`/playlists/${playlistId}`);
    const playlist = mapSpotifyPlaylist(data);
    if (data.tracks?.items) {
      playlist.tracks = data.tracks.items
        .filter((t): t is SpotifyApi.PlaylistTrackObject => !!t.track && t.track.type === 'track')
        .map(t => mapSpotifyTrack(t.track as SpotifyApi.TrackObjectFull));
    }
    return playlist;
  },

  async createPlaylist(input: { name: string; description?: string; isPublic?: boolean }): Promise<Playlist> {
    const user = await this.getCurrentUser();
    const data = await spotifyFetch<SpotifyApi.PlaylistObjectFull>(`/users/${user.id}/playlists`, {
      method: 'POST',
      body: JSON.stringify({
        name: input.name,
        description: input.description || '',
        public: input.isPublic ?? false,
      }),
    });
    return mapSpotifyPlaylist(data);
  },

  async addTracksToPlaylist(playlistId: string, trackUris: string[]): Promise<void> {
    await spotifyFetch(`/playlists/${playlistId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({ uris: trackUris }),
    });
  },

  async removeTracksFromPlaylist(playlistId: string, positions: number[]): Promise<void> {
    await spotifyFetch(`/playlists/${playlistId}/tracks`, {
      method: 'DELETE',
      body: JSON.stringify({ tracks: positions.map(p => ({ uri: '', positions: [p] })) }),
    });
  },

  async getPlaylistTracks(playlistId: string, limit = 100, offset = 0): Promise<Track[]> {
    const data = await spotifyFetch<SpotifyApi.PlaylistTrackResponse>(
      `/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`
    );
    return data.items
      .filter((t): t is SpotifyApi.PlaylistTrackObject => !!t.track && t.track.type === 'track')
      .map(t => mapSpotifyTrack(t.track as SpotifyApi.TrackObjectFull));
  },

  async getSavedTracks(limit = 50, offset = 0): Promise<Track[]> {
    const data = await spotifyFetch<SpotifyApi.UsersSavedTracksResponse>(
      `/me/tracks?limit=${limit}&offset=${offset}`
    );
    return data.items.map(item => mapSpotifyTrack(item.track));
  },

  async saveTracks(trackIds: string[]): Promise<void> {
    await spotifyFetch('/me/tracks', {
      method: 'PUT',
      body: JSON.stringify({ ids: trackIds }),
    });
  },

  async removeSavedTracks(trackIds: string[]): Promise<void> {
    await spotifyFetch('/me/tracks', {
      method: 'DELETE',
      body: JSON.stringify({ ids: trackIds }),
    });
  },

  async checkSavedTracks(trackIds: string[]): Promise<boolean[]> {
    const data = await spotifyFetch<boolean[]>(
      `/me/tracks/contains?ids=${trackIds.join(',')}`
    );
    return data;
  },

  async getTopTracks(timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term', limit = 50): Promise<Track[]> {
    const data = await spotifyFetch<SpotifyApi.UsersTopTracksResponse>(
      `/me/top/tracks?time_range=${timeRange}&limit=${limit}`
    );
    return data.items.map(mapSpotifyTrack);
  },

  async getTopArtists(timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term', limit = 50): Promise<Artist[]> {
    const data = await spotifyFetch<SpotifyApi.UsersTopArtistsResponse>(
      `/me/top/artists?time_range=${timeRange}&limit=${limit}`
    );
    return data.items.map(mapSpotifyArtist);
  },

  async getRecentlyPlayed(limit = 50): Promise<Track[]> {
    const data = await spotifyFetch<SpotifyApi.RecentlyPlayedResponse>(
      `/me/player/recently-played?limit=${limit}`
    );
    return data.items.map(item => mapSpotifyTrack(item.track));
  },

  async search(query: string, types: string[] = ['track', 'album', 'artist', 'playlist'], limit = 20): Promise<SearchResults> {
    const typeParam = types.join(',');
    const searchLimit = Math.min(Math.max(Math.floor(limit), 1), 10);
    const data = await spotifyFetch<{
      tracks?: SpotifyApi.TrackSearchResponse;
      albums?: SpotifyApi.AlbumSearchResponse;
      artists?: SpotifyApi.ArtistSearchResponse;
      playlists?: SpotifyApi.PlaylistSearchResponse;
    }>(`/search?q=${encodeURIComponent(query)}&type=${typeParam}&limit=${searchLimit}`);

    return {
      tracks: data.tracks?.items.map(mapSpotifyTrack) || [],
      albums: data.albums?.items.map(mapSpotifyAlbum) || [],
      artists: data.artists?.items.map(mapSpotifyArtist) || [],
      playlists: data.playlists?.items.map(mapSpotifyPlaylist) || [],
    };
  },

  async getTrack(trackId: string): Promise<Track> {
    const data = await spotifyFetch<SpotifyApi.TrackObjectFull>(`/tracks/${trackId}`);
    return mapSpotifyTrack(data);
  },

  async getAlbum(albumId: string): Promise<Album> {
    const data = await spotifyFetch<SpotifyApi.AlbumObjectFull>(`/albums/${albumId}`);
    const album = mapSpotifyAlbum(data);
    if (data.tracks?.items) {
      album.tracks = data.tracks.items.map(t => ({
        ...mapSpotifyTrack(t),
        album: data.name,
        albumId: data.id,
      }));
    }
    return album;
  },

  async getArtist(artistId: string): Promise<Artist> {
    const data = await spotifyFetch<SpotifyApi.ArtistObjectFull>(`/artists/${artistId}`);
    return mapSpotifyArtist(data);
  },

  async getArtistTopTracks(artistId: string): Promise<Track[]> {
    const data = await spotifyFetch<SpotifyApi.ArtistsTopTracksResponse>(`/artists/${artistId}/top-tracks?market=from_token`);
    return data.tracks.map(mapSpotifyTrack);
  },

  async getArtistAlbums(artistId: string, includeGroups: string[] = ['album', 'single', 'appears_on', 'compilation']): Promise<Album[]> {
    const data = await spotifyFetch<SpotifyApi.ArtistsAlbumsResponse>(
      `/artists/${artistId}/albums?include_groups=${includeGroups.join(',')}&market=from_token&limit=50`
    );
    return data.items.map(mapSpotifyAlbum);
  },

  async getAudioFeatures(trackIds: string[]): Promise<AudioFeatures[]> {
    const data = await spotifyFetch<{ audio_features: SpotifyApi.AudioFeaturesResponse[] }>(
      `/audio-features?ids=${trackIds.join(',')}`
    );
    return data.audio_features.map(f => ({
      acousticness: f.acousticness,
      danceability: f.danceability,
      energy: f.energy,
      instrumentalness: f.instrumentalness,
      key: f.key,
      liveness: f.liveness,
      loudness: f.loudness,
      mode: f.mode,
      speechiness: f.speechiness,
      tempo: f.tempo,
      timeSignature: f.time_signature,
      valence: f.valence,
    }));
  },

  async getDevices(): Promise<Device[]> {
    const data = await spotifyFetch<SpotifyApi.UserDevicesResponse>('/me/player/devices');
    return data.devices.map(d => ({
      id: d.id,
      name: d.name,
      type: d.type as Device['type'],
      isActive: d.is_active,
      isPrivateSession: d.is_private_session,
      isRestricted: d.is_restricted,
      volumePercent: d.volume_percent,
      supportsVolume: d.supports_volume,
    }));
  },

  async transferPlayback(deviceIds: string[], play = false): Promise<void> {
    await spotifyFetch('/me/player', {
      method: 'PUT',
      body: JSON.stringify({ device_ids: deviceIds, play }),
    });
  },

  async getPlaybackState(): Promise<SpotifyApi.CurrentPlaybackResponse | null> {
    try {
      return await spotifyFetch<SpotifyApi.CurrentPlaybackResponse>('/me/player');
    } catch {
      return null;
    }
  },

  async play(contextUri?: string, uris?: string[], positionMs?: number): Promise<void> {
    await spotifyFetch('/me/player/play', {
      method: 'PUT',
      body: JSON.stringify({
        context_uri: contextUri,
        uris,
        position_ms: positionMs,
      }),
    });
  },

  async pause(): Promise<void> {
    await spotifyFetch('/me/player/pause', { method: 'PUT' });
  },

  async next(): Promise<void> {
    await spotifyFetch('/me/player/next', { method: 'POST' });
  },

  async previous(): Promise<void> {
    await spotifyFetch('/me/player/previous', { method: 'POST' });
  },

  async seek(positionMs: number): Promise<void> {
    await spotifyFetch(`/me/player/seek?position_ms=${positionMs}`, { method: 'PUT' });
  },

  async setVolume(volumePercent: number): Promise<void> {
    await spotifyFetch(`/me/player/volume?volume_percent=${volumePercent}`, { method: 'PUT' });
  },

  async setRepeat(state: 'off' | 'track' | 'context'): Promise<void> {
    await spotifyFetch(`/me/player/repeat?state=${state}`, { method: 'PUT' });
  },

  async setShuffle(state: boolean): Promise<void> {
    await spotifyFetch(`/me/player/shuffle?state=${state}`, { method: 'PUT' });
  },

  async getRecommendations(seedTracks: string[], seedArtists: string[], seedGenres: string[], limit = 20): Promise<Track[]> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      ...(seedTracks.length && { seed_tracks: seedTracks.join(',') }),
      ...(seedArtists.length && { seed_artists: seedArtists.join(',') }),
      ...(seedGenres.length && { seed_genres: seedGenres.join(',') }),
    });
    const data = await spotifyFetch<SpotifyApi.RecommendationsResponse>(`/recommendations?${params}`);
    return data.tracks.map(mapSpotifyTrack);
  },

  async getAvailableGenreSeeds(): Promise<string[]> {
    const data = await spotifyFetch<{ genres: string[] }>('/recommendations/available-genre-seeds');
    return data.genres;
  },

  async getCategories(limit = 50): Promise<SpotifyApi.CategoryObject[]> {
    const data = await spotifyFetch<SpotifyApi.CategoryResponse>(`/browse/categories?limit=${limit}`);
    return data.categories.items;
  },

  async getCategoryPlaylists(categoryId: string, limit = 50): Promise<Playlist[]> {
    const data = await spotifyFetch<SpotifyApi.CategoryPlaylistsResponse>(
      `/browse/categories/${categoryId}/playlists?limit=${limit}`
    );
    return data.playlists.items.map(mapSpotifyPlaylist);
  },

  async getFeaturedPlaylists(limit = 50): Promise<Playlist[]> {
    const data = await spotifyFetch<SpotifyApi.FeaturedPlaylistsResponse>(
      `/browse/featured-playlists?limit=${limit}`
    );
    return data.playlists.items.map(mapSpotifyPlaylist);
  },

  async getNewReleases(limit = 50): Promise<Album[]> {
    const data = await spotifyFetch<SpotifyApi.NewReleasesResponse>(
      `/browse/new-releases?limit=${limit}`
    );
    return data.albums.items.map(mapSpotifyAlbum);
  },
};

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace SpotifyApi {
    interface TrackObjectFull {
      id: string;
      name: string;
      artists: { id: string; name: string }[];
      album: {
        id: string;
        name: string;
        images: { url: string }[];
        release_date: string;
        total_tracks: number;
      };
      duration_ms: number;
      external_urls: { spotify: string };
      preview_url: string | null;
      track_number: number;
      disc_number: number;
      explicit: boolean;
      popularity: number;
      type: 'track';
    }

    interface AlbumObjectSimplified {
      id: string;
      name: string;
      artists: { id: string; name: string }[];
      images: { url: string }[];
      release_date: string;
      total_tracks: number;
      type: 'album';
    }

    interface AlbumObjectFull extends AlbumObjectSimplified {
      tracks: { items: TrackObjectSimplified[] };
    }

    interface TrackObjectSimplified {
      id: string;
      name: string;
      artists: { id: string; name: string }[];
      album: AlbumObjectSimplified;
      duration_ms: number;
      external_urls: { spotify: string };
      preview_url: string | null;
      track_number: number;
      disc_number: number;
      explicit: boolean;
      type: 'track';
    }

    interface ArtistObjectFull {
      id: string;
      name: string;
      images: { url: string }[];
      genres: string[];
      popularity: number;
      followers: { total: number };
      type: 'artist';
    }

    interface PlaylistObjectSimplified {
      id: string;
      name: string;
      description: string | null;
      images: { url: string }[];
      owner: { id: string; display_name: string };
      public: boolean;
      collaborative: boolean;
      tracks?: { total?: number };
      followers: { total: number };
      type: 'playlist';
    }

    interface PlaylistObjectFull extends PlaylistObjectSimplified {
      tracks: {
        items: PlaylistTrackObject[];
        total: number;
      };
    }

    interface PlaylistTrackObject {
      track: TrackObjectFull | { type: 'episode' } | null;
      added_at: string;
    }

    interface CurrentUsersProfileResponse {
      id: string;
      display_name: string | null;
      email: string;
      images: { url: string }[];
      country: string;
      product: string;
      followers: { total: number };
    }

    interface ListOfCurrentUsersPlaylistsResponse {
      items: PlaylistObjectSimplified[];
      total: number;
      limit: number;
      offset: number;
      next: string | null;
      previous: string | null;
    }

    interface PlaylistTrackResponse {
      items: PlaylistTrackObject[];
      total: number;
      limit: number;
      offset: number;
      next: string | null;
      previous: string | null;
    }

    interface UsersSavedTracksResponse {
      items: { track: TrackObjectFull; added_at: string }[];
      total: number;
      limit: number;
      offset: number;
      next: string | null;
      previous: string | null;
    }

    interface UsersTopTracksResponse {
      items: TrackObjectFull[];
      total: number;
      limit: number;
      offset: number;
      next: string | null;
      previous: string | null;
    }

    interface UsersTopArtistsResponse {
      items: ArtistObjectFull[];
      total: number;
      limit: number;
      offset: number;
      next: string | null;
      previous: string | null;
    }

    interface RecentlyPlayedResponse {
      items: { track: TrackObjectFull; played_at: string }[];
      total: number;
      limit: number;
      offset: number;
      next: string | null;
      previous: string | null;
    }

    interface CurrentPlaybackResponse {
      is_playing: boolean;
      item: TrackObjectFull | null;
      progress_ms: number;
      device: { id: string; name: string; type: string; volume_percent: number | null };
      shuffle_state: boolean;
      repeat_state: 'off' | 'track' | 'context';
    }

    interface UserDevicesResponse {
      devices: {
        id: string;
        name: string;
        type: string;
        is_active: boolean;
        is_private_session: boolean;
        is_restricted: boolean;
        volume_percent: number | null;
        supports_volume: boolean;
      }[];
    }

    interface ArtistsTopTracksResponse {
      tracks: TrackObjectFull[];
    }

    interface ArtistsAlbumsResponse {
      items: AlbumObjectSimplified[];
      total: number;
      limit: number;
      offset: number;
      next: string | null;
      previous: string | null;
    }

    interface AudioFeaturesResponse {
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
      time_signature: number;
      valence: number;
    }

    interface RecommendationsResponse {
      tracks: TrackObjectFull[];
      seeds: { id: string; type: string; initialPoolSize: number; afterFilteringSize: number; afterRelinkingSize: number }[];
    }

    interface TrackSearchResponse {
      items: TrackObjectFull[];
      total: number;
      limit: number;
      offset: number;
      next: string | null;
      previous: string | null;
    }

    interface AlbumSearchResponse {
      items: AlbumObjectSimplified[];
      total: number;
      limit: number;
      offset: number;
      next: string | null;
      previous: string | null;
    }

    interface ArtistSearchResponse {
      items: ArtistObjectFull[];
      total: number;
      limit: number;
      offset: number;
      next: string | null;
      previous: string | null;
    }

    interface PlaylistSearchResponse {
      items: PlaylistObjectSimplified[];
      total: number;
      limit: number;
      offset: number;
      next: string | null;
      previous: string | null;
    }

    interface CategoryObject {
      id: string;
      name: string;
      icons: { url: string }[];
    }

    interface CategoryResponse {
      categories: { items: CategoryObject[]; total: number; limit: number; offset: number; next: string | null; previous: string | null };
    }

    interface CategoryPlaylistsResponse {
      playlists: { items: PlaylistObjectSimplified[]; total: number; limit: number; offset: number; next: string | null; previous: string | null };
    }

    interface FeaturedPlaylistsResponse {
      playlists: { items: PlaylistObjectSimplified[]; total: number; limit: number; offset: number; next: string | null; previous: string | null };
    }

    interface NewReleasesResponse {
      albums: { items: AlbumObjectSimplified[]; total: number; limit: number; offset: number; next: string | null; previous: string | null };
    }
  }
}