import { describe, expect, it } from 'vitest';
import { hasSpotifyTrackEnded } from './spotifyPlayback';

describe('hasSpotifyTrackEnded', () => {
  const defaults = {
    expectedTrackId: 'track-1',
    lastPosition: 0,
    fallbackPosition: 0,
    fallbackDuration: 180_000,
    wasPlaying: true,
    isPlaying: true,
  };

  it('detects a paused track at its end', () => {
    expect(hasSpotifyTrackEnded({
      ...defaults,
      state: { trackId: 'track-1', paused: true, position: 179_000, duration: 180_000 },
    })).toBe(true);
  });

  it('detects the SDK dropping its state after playback reaches the end', () => {
    expect(hasSpotifyTrackEnded({
      ...defaults,
      state: null,
      lastPosition: 179_000,
    })).toBe(true);
  });

  it('does not advance for another track or before the end', () => {
    expect(hasSpotifyTrackEnded({
      ...defaults,
      state: { trackId: 'track-2', paused: true, position: 179_000, duration: 180_000 },
    })).toBe(false);
    expect(hasSpotifyTrackEnded({
      ...defaults,
      state: { trackId: 'track-1', paused: true, position: 170_000, duration: 180_000 },
    })).toBe(false);
  });

  it('does not treat a missing SDK state as an ended paused track', () => {
    expect(hasSpotifyTrackEnded({
      ...defaults,
      state: null,
      wasPlaying: false,
      isPlaying: false,
      lastPosition: 179_000,
    })).toBe(false);
  });

  it('does not treat seeking backward as reaching the end', () => {
    expect(hasSpotifyTrackEnded({
      ...defaults,
      state: { trackId: 'track-1', paused: false, position: 20_000, duration: 180_000 },
      lastPosition: 20_000,
      fallbackPosition: 179_000,
    })).toBe(false);
  });
});
