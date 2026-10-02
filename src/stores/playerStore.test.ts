import { afterEach, describe, expect, it } from 'vitest';
import { usePlayerStore } from '@/stores/playerStore';
import type { Track } from '@/types';

const tracks: Track[] = [
  {
    id: 'track-one',
    title: 'Track One',
    artist: 'Artist',
    duration: 180000,
    source: 'spotify',
    addedAt: 1,
  },
  {
    id: 'track-two',
    title: 'Track Two',
    artist: 'Artist',
    duration: 200000,
    source: 'spotify',
    addedAt: 2,
  },
];

describe('player queue actions', () => {
  afterEach(() => usePlayerStore.getState().clearQueue());

  it('starts an album or playlist from its first track and keeps all tracks queued', () => {
    usePlayerStore.getState().playTracks(tracks, 'playlist');

    const state = usePlayerStore.getState();
    expect(state.currentTrack?.id).toBe('track-one');
    expect(state.isPlaying).toBe(true);
    expect(state.queue.map(item => item.track.id)).toEqual(['track-one', 'track-two']);
    expect(state.queue.every(item => item.source === 'playlist')).toBe(true);
  });
});
