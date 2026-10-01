/** Estado de la máquina de reproducción (Skill 14) */
export type PlayerStatus =
  | 'IDLE'
  | 'LOADING'
  | 'PLAYING'
  | 'PAUSED'
  | 'BUFFERING'
  | 'ERROR'
  | 'ENDED';

/** Modo de repetición */
export type RepeatMode = 'off' | 'all' | 'one';

/** Error del reproductor */
export interface PlayerError {
  code: string;
  message: string;
  retryable: boolean;
}

/** Estado completo del reproductor (persistido) */
export interface PlayerState {
  status: PlayerStatus;
  currentTrackId: string | null;
  queue: {
    userQueue: string[];
    contextQueue: string[];
    originalOrder: string[];
    isShuffled: boolean;
  };
  currentTime: number; // segundos
  duration: number;
  volume: number; // 0-1
  muted: boolean;
  repeatMode: RepeatMode;
  shuffle: boolean;
  error: PlayerError | null;
}

/** Estado inicial */
export const initialPlayerState: PlayerState = {
  status: 'IDLE',
  currentTrackId: null,
  queue: { userQueue: [], contextQueue: [], originalOrder: [], isShuffled: false },
  currentTime: 0,
  duration: 0,
  volume: 0.5,
  muted: false,
  repeatMode: 'off',
  shuffle: false,
  error: null,
};

/** Selectores derivados (no almacenados) */
export const derivedSelectors = {
  isPlaying: (s: PlayerState) => s.status === 'PLAYING',
  isBuffering: (s: PlayerState) => s.status === 'BUFFERING',
  isLoading: (s: PlayerState) => s.status === 'LOADING',
  isError: (s: PlayerState) => s.status === 'ERROR',
  isEnded: (s: PlayerState) => s.status === 'ENDED',
  progress: (s: PlayerState) => s.duration > 0 ? s.currentTime / s.duration : 0,
  currentTrack: (s: PlayerState, tracks: { id: string }[]) =>
    tracks.find((t) => t.id === s.currentTrackId) ?? null,
}

/** Transiciones de estado válidas (tabla completa Skill 14) */
export const playerTransitions: ReadonlyArray<{
  from: PlayerStatus | 'cualquiera';
  event: string;
  to: PlayerStatus;
}> = [
  { from: 'IDLE', event: 'LOAD', to: 'LOADING' },
  { from: 'LOADING', event: 'CAN_PLAY', to: 'PLAYING' },
  { from: 'PLAYING', event: 'PAUSE', to: 'PAUSED' },
  { from: 'PAUSED', event: 'PLAY', to: 'PLAYING' },
  { from: 'LOADING', event: 'FAIL', to: 'ERROR' },
  { from: 'PLAYING', event: 'ENDED', to: 'ENDED' },
  { from: 'LOADING', event: 'BUFFERING', to: 'BUFFERING' },
  { from: 'BUFFERING', event: 'CAN_PLAY', to: 'PLAYING' },
  { from: 'cualquiera', event: 'FAIL', to: 'ERROR' },
  { from: 'ENDED', event: 'NEXT', to: 'LOADING' },
  { from: 'ENDED', event: 'REPEAT', to: 'LOADING' },
  { from: 'ERROR', event: 'RETRY', to: 'LOADING' },
] as ReadonlyArray<{
  from: PlayerStatus | 'cualquiera';
  event: string;
  to: PlayerStatus;
}>;

/** Ejecuta una transición y devuelve el nuevo estado.
 * Si la transición no está permitida, devuelve el estado actual y registra en consola. */
export function transitionStatus(current: PlayerStatus, event: string): PlayerStatus {
  const t = playerTransitions.find(
    (tr) => tr.from === current || tr.from === 'cualquiera'
  );
  if (!t) {
    console.debug(`Transición no reconocida: ${current} → ${event}`);
    return current;
  }
  if (t.from !== 'cualquiera' && t.from !== current) {
    console.debug(`Transición bloqueada: ${current} → ${event} (origen ${t.from})`);
    return current;
  }
  console.debug(`Transición: ${current} → ${event} → ${t.to}`);
  return t.to;
}