import { afterEach, describe, expect, it, vi } from 'vitest';
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
  afterEach(() => {
    vi.restoreAllMocks();
    usePlayerStore.getState().clearQueue();
  });

  it('starts an album or playlist from its first track and keeps all tracks queued', () => {
    usePlayerStore.getState().playTracks(tracks, 'playlist');

    const state = usePlayerStore.getState();
    expect(state.currentTrack?.id).toBe('track-one');
    expect(state.isPlaying).toBe(true);
    expect(state.queue.map(item => item.track.id)).toEqual(['track-one', 'track-two']);
    expect(state.queue.every(item => item.source === 'playlist')).toBe(true);
  });

  it('appends and starts an autoplay track while keeping the previous track in history', () => {
    usePlayerStore.getState().playTracks(tracks.slice(0, 1), 'playlist');
    usePlayerStore.getState().playNextTrack(tracks[1]);

    const state = usePlayerStore.getState();
    expect(state.currentTrack?.id).toBe('track-two');
    expect(state.currentIndex).toBe(1);
    expect(state.queue.map(item => item.track.id)).toEqual(['track-one', 'track-two']);
    expect(state.queue[1].source).toBe('autoplay');
    expect(state.history[0].track.id).toBe('track-one');
    expect(state.isPlaying).toBe(true);
  });

  it('continues with a random queued track when the current track is the last in the queue', () => {
    const thirdTrack: Track = {
      ...tracks[1],
      id: 'track-three',
      title: 'Track Three',
      addedAt: 3,
    };
    usePlayerStore.getState().playTracks([...tracks, thirdTrack], 'playlist');
    usePlayerStore.getState().playFromQueue(2);
    vi.spyOn(Math, 'random').mockReturnValue(0.75);

    expect(usePlayerStore.getState().playRandomFromQueue()).toBe(true);

    const state = usePlayerStore.getState();
    expect(state.currentTrack?.id).toBe('track-two');
    expect(state.currentIndex).toBe(1);
    expect(state.history[0].track.id).toBe('track-three');
    expect(state.isPlaying).toBe(true);
  });

  it('does not restart the same track when there are no other queued tracks', () => {
    usePlayerStore.getState().playTracks(tracks.slice(0, 1), 'playlist');

    expect(usePlayerStore.getState().playRandomFromQueue()).toBe(false);
    expect(usePlayerStore.getState().currentTrack?.id).toBe('track-one');
  });
});
