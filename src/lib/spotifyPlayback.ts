interface SpotifyPlaybackSnapshot {
  trackId?: string;
  paused: boolean;
  position: number;
  duration: number;
}

interface TrackEndCheck {
  expectedTrackId: string;
  state: SpotifyPlaybackSnapshot | null;
  lastPosition: number;
  fallbackPosition: number;
  fallbackDuration: number;
  wasPlaying: boolean;
  isPlaying: boolean;
  toleranceMs?: number;
}

export function hasSpotifyTrackEnded({
  expectedTrackId,
  state,
  lastPosition,
  fallbackPosition,
  fallbackDuration,
  wasPlaying,
  isPlaying,
  toleranceMs = 1500,
}: TrackEndCheck): boolean {
  if (state?.trackId && state.trackId !== expectedTrackId) return false;

  const duration = state?.duration || fallbackDuration;
  const position = state
    ? Math.max(state.position, lastPosition)
    : Math.max(lastPosition, fallbackPosition);
  if (duration <= 0 || position < duration - toleranceMs) return false;

  return state ? (!state.paused || wasPlaying || isPlaying) : wasPlaying || isPlaying;
}
