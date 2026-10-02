import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Heart, Loader2, Music, Play, Plus, Trash2, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/authStore';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { localFilesService } from '@/services/localFiles';
import { spotifyService } from '@/services/spotify';
import { formatDuration } from '@/lib/utils';
import type { Album, Artist, Playlist, Track } from '@/types';

type Collection = Album | Artist | Playlist;

export function CollectionDetail() {
  const { id = '' } = useParams();
  const { pathname } = useLocation();
  const kind = pathname.startsWith('/albums/') ? 'album' : pathname.startsWith('/artists/') ? 'artist' : 'playlist';
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const favoriteTracks = useFavoritesStore(state => state.tracks);
  const toggleFavorite = useFavoritesStore(state => state.toggleFavorite);
  const playTracks = usePlayerStore(state => state.playTracks);
  const cachedAlbums = useLibraryStore(state => state.albums);
  const cachedArtists = useLibraryStore(state => state.artists);
  const cachedTracks = useLibraryStore(state => state.tracks);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [artistFollowed, setArtistFollowed] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [matches, setMatches] = useState<Track[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setCollection(null);
    setTracks([]);

    const load = async () => {
      try {
        if (kind === 'album') {
          const localAlbums = await localFilesService.getAllAlbums();
          const local = localAlbums.find(album => album.id === id || album.sourceId === id);
          const cached = cachedAlbums.find(album => album.id === id || album.sourceId === id);
          let album = local || cached;
          if (!album) {
            album = await spotifyService.getAlbum(id);
          } else if (album.source === 'spotify' && album.tracks.length === 0 && isAuthenticated) {
            album = await spotifyService.getAlbum(album.sourceId || album.id);
          }
          const albumTracks = album.source === 'local'
            ? (await localFilesService.getAllTracks()).filter(track =>
              track.albumId === album.id || (track.album === album.name && track.artist === album.artist)
            )
            : album.tracks.length > 0
              ? album.tracks
              : cachedTracks.filter(track =>
                track.albumId === (album.sourceId || album.id)
                || (track.album === album.name && track.artist === album.artist)
              );
          if (!cancelled) {
            setCollection(album);
            setTracks(albumTracks);
          }
        } else if (kind === 'artist') {
          const local = (await localFilesService.getAllArtists()).find(artist => artist.id === id || artist.sourceId === id);
          if (local) {
            const localTracks = await localFilesService.getAllTracks();
            if (!cancelled) {
              setCollection(local);
              setTracks(local.topTracks.length ? local.topTracks : localTracks.filter(track => track.artistId === local.id || track.artist === local.name));
            }
          } else {
            const cached = cachedArtists.find(artist => artist.id === id || artist.sourceId === id);
            let artist = cached || await spotifyService.getArtist(id);
            let topTracks = artist.topTracks;
            let albums = artist.albums;
            if (isAuthenticated && (topTracks.length === 0 || albums.length === 0)) {
              const [loadedTopTracks, loadedAlbums] = await Promise.all([
                topTracks.length > 0 ? Promise.resolve(topTracks) : spotifyService.getArtistTopTracks(artist.sourceId || artist.id),
                albums.length > 0 ? Promise.resolve(albums) : spotifyService.getArtistAlbums(artist.sourceId || artist.id),
              ]);
              topTracks = loadedTopTracks;
              albums = loadedAlbums;
            }
            artist = { ...artist, topTracks, albums };
            if (!cancelled) {
              setCollection(artist);
              setTracks(topTracks.length > 0 ? topTracks : cachedTracks.filter(track =>
                track.artistId === (artist.sourceId || artist.id) || track.artist === artist.name
              ));
            }
            if (isAuthenticated) {
              const [following] = await spotifyService.checkFollowingArtists([id]);
              if (!cancelled) setArtistFollowed(following);
            }
          }
        } else {
          const local = await localFilesService.getPlaylist(id);
          const playlist = local || await spotifyService.getPlaylist(id);
          if (!cancelled) {
            setCollection(playlist);
            setTracks(playlist.tracks);
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar este elemento.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [id, isAuthenticated, kind, cachedAlbums, cachedArtists, cachedTracks]);

  const playlist = kind === 'playlist' ? collection as Playlist | null : null;
  const artist = kind === 'artist' ? collection as Artist | null : null;
  const canEditPlaylist = !!playlist && (
    playlist.source === 'local'
    || playlist.ownerId === useAuthStore.getState().user?.id
  );
  const heading = collection?.name || '';
  const subtitle = collection
    ? kind === 'playlist'
      ? (collection as Playlist).owner || 'Lista de reproducción'
      : kind === 'album'
        ? (collection as Album).artist
        : (collection as Artist).source === 'local' ? 'Artista local' : 'Artista de Spotify'
    : '';
  const artwork = collection
    ? 'coverArt' in collection ? collection.coverArt : 'image' in collection ? collection.image : undefined
    : undefined;
  const filteredMatches = useMemo(
    () => matches.filter(match => !tracks.some(track => track.id === match.id)),
    [matches, tracks]
  );

  const reloadPlaylist = async () => {
    if (!playlist) return;
    const updated = playlist.source === 'local'
      ? await localFilesService.getPlaylist(playlist.id)
      : await spotifyService.getPlaylist(playlist.id);
    if (updated) {
      setCollection(updated);
      setTracks(updated.tracks);
    }
  };

  const searchTracks = async () => {
    if (!search.trim()) return;
    setSearching(true);
    setError(null);
    try {
      if (playlist?.source === 'spotify') {
        const results = await spotifyService.search(search, ['track'], 10);
        setMatches(results.tracks);
      } else {
        const localTracks = await localFilesService.getAllTracks();
        const query = search.toLowerCase();
        setMatches(localTracks.filter(track =>
          track.title.toLowerCase().includes(query) || track.artist.toLowerCase().includes(query)
        ).slice(0, 10));
      }
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'No se pudieron buscar canciones.');
    } finally {
      setSearching(false);
    }
  };

  const addTrack = async (track: Track) => {
    if (!playlist || !canEditPlaylist) return;
    setError(null);
    try {
      if (playlist.source === 'spotify') {
        await spotifyService.addTracksToPlaylist(playlist.id, [`spotify:track:${track.id}`]);
      } else {
        await localFilesService.addTracksToPlaylist(playlist.id, [track]);
      }
      await reloadPlaylist();
      setMatches(current => current.filter(match => match.id !== track.id));
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : 'No se pudo añadir la canción a la lista.');
    }
  };

  const removeTrack = async (track: Track) => {
    if (!playlist || !canEditPlaylist) return;
    setError(null);
    try {
      if (playlist.source === 'spotify') {
        await spotifyService.removeTracksFromPlaylist(playlist.id, [`spotify:track:${track.id}`]);
      } else {
        await localFilesService.removeTrackFromPlaylist(playlist.id, track.id);
      }
      await reloadPlaylist();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'No se pudo quitar la canción de la lista.');
    }
  };

  const toggleFollow = async () => {
    if (!artist || !isAuthenticated) return;
    setFollowLoading(true);
    setError(null);
    try {
      if (artistFollowed) await spotifyService.unfollowArtist(artist.id);
      else await spotifyService.followArtist(artist.id);
      setArtistFollowed(!artistFollowed);
    } catch (followError) {
      setError(followError instanceof Error ? followError.message : 'No se pudo actualizar el artista seguido.');
    } finally {
      setFollowLoading(false);
    }
  };

  if (isLoading) {
    return <div className="flex min-h-64 items-center justify-center gap-3 text-text-muted"><Loader2 className="h-5 w-5 animate-spin" />Cargando…</div>;
  }

  if (!collection) {
    return (
      <section className="mx-auto max-w-4xl space-y-4">
        <Link to={kind === 'playlist' ? '/playlists' : '/library'} className="inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-text-secondary hover:bg-bg-hover hover:text-text-primary">
          <ArrowLeft className="h-4 w-4" />Volver
        </Link>
        <p className="rounded-lg border border-error/30 bg-error/10 p-4 text-error" role="alert">{error || 'No se encontró este elemento.'}</p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl space-y-7">
      <Link to={kind === 'playlist' ? '/playlists' : '/library'} className="inline-flex items-center justify-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-bg-hover hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" />Volver
      </Link>
      <header className="flex flex-col gap-5 rounded-2xl border border-border-default bg-surface p-5 sm:flex-row sm:items-end">
        {artwork
          ? <img src={artwork} alt="" className="h-44 w-44 rounded-xl object-cover shadow-lg" />
          : <div className="flex h-44 w-44 items-center justify-center rounded-xl bg-bg-tertiary"><Music className="h-16 w-16 text-text-muted" /></div>}
        <div className="min-w-0 flex-1">
          <Badge variant="outline" className="mb-3">{kind === 'album' ? 'Álbum' : kind === 'artist' ? 'Artista' : 'Lista de reproducción'}</Badge>
          <h1 className="text-3xl font-bold">{heading}</h1>
          <p className="mt-2 text-text-secondary">{subtitle}</p>
          <p className="mt-1 text-sm text-text-muted">{tracks.length} canciones {collection.source === 'spotify' ? '· Spotify' : '· Local'}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="primary" disabled={!tracks.length} onClick={() => playTracks(tracks, kind === 'album' ? 'album' : 'playlist')}>
              <Play className="mr-2 h-4 w-4" />Reproducir
            </Button>
            {artist?.source === 'spotify' && isAuthenticated && (
              <Button variant="outline" disabled={followLoading} onClick={() => { void toggleFollow(); }}>
                {followLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
                {artistFollowed ? 'Dejar de seguir' : 'Seguir artista'}
              </Button>
            )}
          </div>
        </div>
      </header>

      {error && <p className="rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error" role="alert">{error}</p>}

      {playlist && canEditPlaylist && (
        <div className="space-y-3 rounded-xl border border-border-default bg-surface p-4">
          <h2 className="font-semibold">Añadir canciones</h2>
          <form className="flex gap-2" onSubmit={event => { event.preventDefault(); void searchTracks(); }}>
            <Input value={search} onChange={event => setSearch(event.target.value)} placeholder={playlist.source === 'spotify' ? 'Buscar en Spotify…' : 'Buscar música local…'} />
            <Button type="submit" variant="outline" disabled={searching}>{searching ? 'Buscando…' : 'Buscar'}</Button>
          </form>
          {filteredMatches.map(track => (
            <div key={track.id} className="flex items-center gap-3">
              <span className="min-w-0 flex-1 truncate text-sm">{track.title} — {track.artist}</span>
              <Button size="sm" variant="outline" onClick={() => { void addTrack(track); }}><Plus className="mr-1 h-4 w-4" />Añadir</Button>
            </div>
          ))}
        </div>
      )}

      {kind === 'artist' && artist && artist.albums.length > 0 && (
        <div>
          <h2 className="mb-3 text-xl font-semibold">Álbumes</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {artist.albums.map(album => (
              <Link key={album.id} to={`/albums/${encodeURIComponent(album.sourceId || album.id)}`} className="rounded-xl border border-border-default bg-surface p-3 hover:bg-bg-hover">
                {album.coverArt && <img src={album.coverArt} alt="" className="mb-2 aspect-square w-full rounded-lg object-cover" />}
                <span className="block truncate text-sm font-medium">{album.name}</span>
                <span className="text-xs text-text-muted">{album.releaseDate?.slice(0, 4)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-xl font-semibold">{kind === 'artist' ? 'Canciones populares' : 'Canciones'}</h2>
        {tracks.length === 0 ? (
          <div className="rounded-xl border border-border-default p-8 text-center text-sm text-text-muted">No hay canciones en esta colección.</div>
        ) : (
          <div className="divide-y divide-border-default rounded-xl border border-border-default bg-surface">
            {tracks.map((track, index) => {
              const isFavorite = favoriteTracks.some(favorite => favorite.id === track.id && favorite.source === track.source);
              return (
                <div key={`${track.source}-${track.id}-${index}`} className="flex items-center gap-3 p-3 hover:bg-bg-hover">
                  <span className="w-6 text-center text-xs text-text-muted">{index + 1}</span>
                  <button className="min-w-0 flex-1 text-left" onClick={() => playTracks(tracks.slice(index), kind === 'album' ? 'album' : 'playlist')}>
                    <span className="block truncate text-sm font-medium">{track.title}</span>
                    <span className="block truncate text-xs text-text-muted">{track.artist}</span>
                  </button>
                  {track.albumId && <Link to={`/albums/${track.albumId}`} className="hidden max-w-40 truncate text-xs text-text-muted hover:text-accent md:block">{track.album}</Link>}
                  <span className="hidden text-xs text-text-muted sm:block">{track.durationFormatted || formatDuration(track.duration)}</span>
                  <Button variant="ghost" size="icon" aria-label={isFavorite ? `Quitar ${track.title} de favoritos` : `Añadir ${track.title} a favoritos`} onClick={() => { void toggleFavorite(track).catch(() => undefined); }}>
                    <Heart className={`h-4 w-4 ${isFavorite ? 'fill-error text-error' : ''}`} />
                  </Button>
                  {playlist && canEditPlaylist && (
                    <Button variant="ghost" size="icon" aria-label={`Quitar ${track.title} de la lista`} onClick={() => { void removeTrack(track); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
