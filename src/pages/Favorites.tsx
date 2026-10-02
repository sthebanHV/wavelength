import { Link } from 'react-router-dom';
import { Heart, Music, Play, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { usePlayerStore } from '@/stores/playerStore';
import { formatDuration } from '@/lib/utils';

export function Favorites() {
  const { tracks, isLoading, error, toggleFavorite } = useFavoritesStore();
  const playTracks = usePlayerStore(state => state.playTracks);

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-accent"><Heart className="h-5 w-5 fill-current" /><span className="text-sm font-medium">Tu colección</span></div>
          <h1 className="text-3xl font-bold">Favoritos</h1>
          <p className="mt-1 text-sm text-text-muted">{tracks.length} canciones guardadas</p>
        </div>
        <Button variant="primary" disabled={!tracks.length} onClick={() => playTracks(tracks, 'playlist')}>
          <Play className="mr-2 h-4 w-4" />Reproducir todo
        </Button>
      </header>

      {error && <p className="rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error" role="alert">{error}</p>}
      {isLoading && <p className="text-sm text-text-muted" role="status">Actualizando tus favoritos…</p>}

      {tracks.length === 0 && !isLoading ? (
        <div className="rounded-2xl border border-border-default bg-surface p-10 text-center">
          <Music className="mx-auto mb-4 h-12 w-12 text-text-muted/40" />
          <h2 className="text-lg font-semibold">Aún no tienes favoritos</h2>
          <p className="mt-2 text-sm text-text-muted">Guarda canciones con el corazón para encontrarlas aquí.</p>
          <Button asChild variant="outline" className="mt-5"><Link to="/search">Buscar música</Link></Button>
        </div>
      ) : (
        <div className="divide-y divide-border-default rounded-2xl border border-border-default bg-surface">
          {tracks.map((track, index) => (
            <div key={`${track.source}-${track.id}`} className="flex items-center gap-3 p-3 hover:bg-bg-hover">
              <span className="w-6 text-center text-xs text-text-muted">{index + 1}</span>
              {track.albumArt
                ? <img src={track.albumArt} alt="" className="h-11 w-11 rounded object-cover" />
                : <div className="flex h-11 w-11 items-center justify-center rounded bg-bg-tertiary"><Music className="h-5 w-5 text-text-muted" /></div>}
              <button className="min-w-0 flex-1 text-left" onClick={() => usePlayerStore.getState().playTracks(tracks.slice(index), 'playlist')}>
                <span className="block truncate text-sm font-medium">{track.title}</span>
                <span className="block truncate text-xs text-text-muted">{track.artist}</span>
              </button>
              <Badge variant="outline" size="sm">{track.source === 'spotify' ? 'Spotify' : 'Local'}</Badge>
              <span className="hidden w-12 text-right text-xs text-text-muted sm:block">{track.durationFormatted || formatDuration(track.duration)}</span>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Quitar ${track.title} de favoritos`}
                disabled={isLoading}
                onClick={() => { void toggleFavorite(track).catch(() => undefined); }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
