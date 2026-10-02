import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/lib/constants';
import type { Track, QueueItem, PlaybackState } from '@/types';
import { generateId } from '@/lib/utils';

interface PlayerState extends PlaybackState {
  playbackError: string | null;
  play: (track: Track, context?: { queue?: QueueItem[]; index?: number; source?: QueueItem['source'] }) => void;
  playTracks: (tracks: Track[], source?: QueueItem['source']) => void;
  pause: () => void;
  togglePlay: () => void;
  next: () => void;
  playNextTrack: (track: Track, source?: QueueItem['source']) => void;
  previous: () => void;
  seek: (position: number) => void;
  setVolume: (volume: number) => void;
  setRepeatMode: (mode: PlaybackState['repeatMode']) => void;
  setShuffle: (shuffle: boolean) => void;
  addToQueue: (track: Track, source?: QueueItem['source']) => void;
  addToQueueNext: (track: Track, source?: QueueItem['source']) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  playFromQueue: (index: number) => void;
  setCrossfade: (enabled: boolean) => void;
  setPlaybackError: (error: string | null) => void;
  getNextTrack: () => Track | null;
  getPreviousTrack: () => Track | null;
}

function createQueueItem(track: Track, source: QueueItem['source'] = 'user'): QueueItem {
  return {
    id: generateId(),
    track,
    addedAt: Date.now(),
    source,
  };
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      isPlaying: false,
      currentTrack: null,
      queue: [],
      history: [],
      currentIndex: -1,
      volume: 0.8,
      position: 0,
      duration: 0,
      repeatMode: 'off',
      shuffle: false,
      crossfade: false,
      playbackError: null,

      play: (track, context) => {
        const { queue, currentIndex } = get();

        if (context?.queue) {
          set({
            currentTrack: track,
            queue: context.queue,
            currentIndex: context.index ?? 0,
            isPlaying: true,
            position: 0,
            duration: track.duration,
            playbackError: null,
          });
          return;
        }

        const existingIndex = queue.findIndex(q => q.track.id === track.id);

        if (existingIndex >= 0) {
          set({
            currentTrack: track,
            currentIndex: existingIndex,
            isPlaying: true,
            position: 0,
            duration: track.duration,
            playbackError: null,
          });
          return;
        }

        const newQueueItem = createQueueItem(track);
        const newQueue = [...queue.slice(0, currentIndex + 1), newQueueItem];

        set({
          currentTrack: track,
          queue: newQueue,
          currentIndex: currentIndex + 1,
          isPlaying: true,
          position: 0,
          duration: track.duration,
          playbackError: null,
        });
      },

      playTracks: (tracks, source = 'user') => {
        if (tracks.length === 0) return;
        const queue = tracks.map(track => createQueueItem(track, source));
        set({
          queue,
          currentIndex: 0,
          currentTrack: queue[0].track,
          isPlaying: true,
          position: 0,
          duration: queue[0].track.duration,
          playbackError: null,
        });
      },

      pause: () => set({ isPlaying: false }),

      togglePlay: () => set(state => ({ isPlaying: !state.isPlaying })),

      next: () => {
        const { queue, currentIndex, repeatMode, shuffle } = get();
        if (queue.length === 0) return;

        let nextIndex: number;

        if (repeatMode === 'track') {
          nextIndex = currentIndex;
        } else if (shuffle) {
          const availableIndices = queue.map((_, i) => i).filter(i => i !== currentIndex);
          if (availableIndices.length === 0) {
            nextIndex = currentIndex;
          } else {
            nextIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
          }
        } else {
          nextIndex = currentIndex + 1;
          if (nextIndex >= queue.length) {
            if (repeatMode === 'context') {
              nextIndex = 0;
            } else {
              nextIndex = queue.length - 1;
            }
          }
        }

        const nextItem = queue[nextIndex];
        if (nextItem) {
          const currentItem = queue[currentIndex];
          if (currentItem) {
            set(state => ({
              history: [currentItem, ...state.history.slice(0, 99)],
            }));
          }
          set({
            currentTrack: nextItem.track,
            currentIndex: nextIndex,
            isPlaying: true,
            position: 0,
            duration: nextItem.track.duration,
          });
        }
      },

      playNextTrack: (track, source = 'autoplay') => {
        const { queue, currentIndex } = get();
        const currentItem = queue[currentIndex];
        const nextItem = createQueueItem(track, source);
        const nextQueue = [...queue, nextItem];

        set(state => ({
          queue: nextQueue,
          currentTrack: track,
          currentIndex: nextQueue.length - 1,
          isPlaying: true,
          position: 0,
          duration: track.duration,
          playbackError: null,
          history: currentItem ? [currentItem, ...state.history.slice(0, 99)] : state.history,
        }));
      },

      previous: () => {
        const { queue, currentIndex, history, position } = get();

        if (position > 3) {
          set({ position: 0 });
          return;
        }

        if (history.length > 0) {
          const previousItem = history[0];
          set({
            currentTrack: previousItem.track,
            currentIndex: queue.findIndex(q => q.track.id === previousItem.track.id),
            isPlaying: true,
            position: 0,
            duration: previousItem.track.duration,
            history: history.slice(1),
          });
          return;
        }

        if (currentIndex > 0) {
          const prevItem = queue[currentIndex - 1];
          set({
            currentTrack: prevItem.track,
            currentIndex: currentIndex - 1,
            isPlaying: true,
            position: 0,
            duration: prevItem.track.duration,
          });
        }
      },

      seek: (position: number) => set({ position: Math.max(0, Math.min(position, get().duration)) }),

      setVolume: (volume: number) => set({ volume: Math.max(0, Math.min(1, volume)) }),

      setRepeatMode: (repeatMode) => set({ repeatMode }),

      setShuffle: (shuffle: boolean) => set({ shuffle }),

      addToQueue: (track, source = 'user') => {
        const { queue } = get();
        const newItem = createQueueItem(track, source);
        set({ queue: [...queue, newItem] });
      },

      addToQueueNext: (track, source = 'user') => {
        const { queue, currentIndex } = get();
        const newItem = createQueueItem(track, source);
        set({ queue: [...queue.slice(0, currentIndex + 1), newItem, ...queue.slice(currentIndex + 1)] });
      },

      removeFromQueue: (index: number) => {
        const { queue, currentIndex } = get();
        if (index < 0 || index >= queue.length) return;

        const newQueue = queue.filter((_, i) => i !== index);
        let newIndex = currentIndex;

        if (index < currentIndex) {
          newIndex = currentIndex - 1;
        } else if (index === currentIndex) {
          newIndex = Math.min(currentIndex, newQueue.length - 1);
        }

        set({ queue: newQueue, currentIndex: newIndex });
      },

      clearQueue: () => set({ queue: [], currentIndex: -1, currentTrack: null, isPlaying: false }),

      reorderQueue: (fromIndex: number, toIndex: number) => {
        const { queue } = get();
        if (fromIndex < 0 || fromIndex >= queue.length || toIndex < 0 || toIndex >= queue.length) return;

        const newQueue = [...queue];
        const [removed] = newQueue.splice(fromIndex, 1);
        newQueue.splice(toIndex, 0, removed);

        let newIndex = get().currentIndex;
        if (fromIndex === get().currentIndex) {
          newIndex = toIndex;
        } else if (fromIndex < get().currentIndex && toIndex >= get().currentIndex) {
          newIndex = get().currentIndex - 1;
        } else if (fromIndex > get().currentIndex && toIndex <= get().currentIndex) {
          newIndex = get().currentIndex + 1;
        }

        set({ queue: newQueue, currentIndex: newIndex });
      },

      playFromQueue: (index: number) => {
        const { queue } = get();
        if (index < 0 || index >= queue.length) return;

        const item = queue[index];
        const currentItem = queue[get().currentIndex];

        if (currentItem) {
          set(state => ({
            history: [currentItem, ...state.history.slice(0, 99)],
          }));
        }

        set({
          currentTrack: item.track,
          currentIndex: index,
          isPlaying: true,
          position: 0,
          duration: item.track.duration,
        });
      },

      setCrossfade: (crossfade: boolean) => set({ crossfade }),
      setPlaybackError: (playbackError) => set({ playbackError }),

      getNextTrack: () => {
        const { queue, currentIndex, repeatMode, shuffle } = get();
        if (queue.length === 0) return null;

        if (repeatMode === 'track') return queue[currentIndex].track;
        if (shuffle) {
          const available = queue.filter((_, i) => i !== currentIndex);
          return available[Math.floor(Math.random() * available.length)]?.track || null;
        }
        const nextIndex = currentIndex + 1;
        if (nextIndex >= queue.length) {
          return repeatMode === 'context' ? queue[0].track : null;
        }
        return queue[nextIndex].track;
      },

      getPreviousTrack: () => {
        const { queue, currentIndex, history } = get();
        if (history.length > 0) return history[0].track;
        if (currentIndex > 0) return queue[currentIndex - 1].track;
        return null;
      },
    }),
    {
      name: STORAGE_KEYS.PLAYER_STATE,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        volume: state.volume,
        repeatMode: state.repeatMode,
        shuffle: state.shuffle,
        crossfade: state.crossfade,
        queue: state.queue,
        history: state.history,
        currentIndex: state.currentIndex,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.currentTrack = state.queue[state.currentIndex]?.track || null;
          state.isPlaying = false;
          state.position = 0;
          state.duration = state.currentTrack?.duration || 0;
        }
      },
    }
  )
);