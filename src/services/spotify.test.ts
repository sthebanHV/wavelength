import { afterEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS } from '@/lib/constants';
import { spotifyService } from '@/services/spotify';

const track = {
  id: 'spotify-track-id',
  name: 'Test track',
  type: 'track',
  artists: [{ id: 'artist-id', name: 'Test artist' }],
  album: {
    id: 'album-id',
    name: 'Test album',
    images: [{ url: 'https://example.com/cover.jpg' }],
  },
  duration_ms: 180000,
  external_urls: { spotify: 'https://open.spotify.com/track/spotify-track-id' },
  preview_url: null,
  track_number: 1,
  disc_number: 1,
  explicit: false,
  popularity: 50,
};

describe('Spotify playlist tracks', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('loads tracks from the current playlist item response shape', async () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(key => key === STORAGE_KEYS.AUTH_TOKENS
      ? JSON.stringify({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 3_600_000,
        tokenType: 'Bearer',
      })
      : null);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        items: [{ added_at: '2026-10-01T00:00:00Z', item: track }],
        total: 1,
      }),
    }));

    const tracks = await spotifyService.getPlaylistTracks('playlist-id');

    expect(tracks).toHaveLength(1);
    expect(tracks[0]).toMatchObject({
      id: 'spotify-track-id',
      title: 'Test track',
      artist: 'Test artist',
      source: 'spotify',
    });
  });

  it('continues to load tracks from the legacy playlist response shape', async () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(key => key === STORAGE_KEYS.AUTH_TOKENS
      ? JSON.stringify({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 3_600_000,
        tokenType: 'Bearer',
      })
      : null);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        items: [{ added_at: '2026-10-01T00:00:00Z', track }],
        total: 1,
      }),
    }));

    const tracks = await spotifyService.getPlaylistTracks('playlist-id');

    expect(tracks).toHaveLength(1);
    expect(tracks[0].id).toBe('spotify-track-id');
  });
});
