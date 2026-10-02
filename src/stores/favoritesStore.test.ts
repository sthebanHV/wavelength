import { afterEach, describe, expect, it, vi } from 'vitest';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { spotifyService } from '@/services/spotify';
import type { Track } from '@/types';

const track: Track = {
  id: 'spotify-track',
  title: 'Test song',
  artist: 'Test artist',
  duration: 180000,
  source: 'spotify',
  addedAt: 1,
};

describe('favorites store', () => {
  afterEach(() => {
    useFavoritesStore.setState({ tracks: [], spotifyTrackIds: [], isLoading: false, error: null });
    vi.restoreAllMocks();
  });

  it('keeps Spotify tracks in Wavelength favorites when Spotify is not connected', async () => {
    vi.spyOn(spotifyService, 'isAuthenticated').mockReturnValue(false);

    await useFavoritesStore.getState().toggleFavorite(track);

    expect(useFavoritesStore.getState().tracks).toEqual([track]);
    expect(useFavoritesStore.getState().error).toContain('Guardada en Wavelength');
  });

  it('saves a Spotify favorite to both Wavelength and Spotify when connected', async () => {
    vi.spyOn(spotifyService, 'isAuthenticated').mockReturnValue(true);
    const saveTracks = vi.spyOn(spotifyService, 'saveTracks').mockResolvedValue();

    await useFavoritesStore.getState().toggleFavorite(track);

    expect(saveTracks).toHaveBeenCalledWith([track.id]);
    expect(useFavoritesStore.getState().tracks).toEqual([track]);
    expect(useFavoritesStore.getState().spotifyTrackIds).toEqual([track.id]);
    expect(useFavoritesStore.getState().error).toBeNull();
  });

  it('keeps a favorite locally and reports a Spotify sync failure', async () => {
    vi.spyOn(spotifyService, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(spotifyService, 'saveTracks').mockRejectedValue(new Error('Forbidden'));

    await useFavoritesStore.getState().toggleFavorite(track);

    expect(useFavoritesStore.getState().tracks).toEqual([track]);
    expect(useFavoritesStore.getState().spotifyTrackIds).toEqual([]);
    expect(useFavoritesStore.getState().error).toContain('Spotify no pudo sincronizarla: Forbidden');
  });
});
