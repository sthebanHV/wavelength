'use client';

import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Music,
  Square,
  Users,
  ListMusic,
  Search,
  Filter,
  Grid,
  List,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Heart,
  Play,
  Clock,
  Download,
  Share2,
  Trash2,
  Edit,
  Plus,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { SkeletonTrack, SkeletonAlbum, SkeletonArtist, SkeletonPlaylist } from '@/components/ui/skeleton';
import { formatDuration, formatDurationLong, formatNumber, getInitials } from '@/lib/utils';
import { useLibraryStore } from '@/stores/libraryStore';
import { localFilesService } from '@/services/localFiles';
import { spotifyService } from '@/services/spotify';
import { cn } from '@/lib/utils';
import type { Track, Album, Artist, Playlist, SortField } from '@/types';
import { usePlayerStore } from '@/stores/playerStore';
import { useFavoritesStore } from '@/stores/favoritesStore';

export function Library() {
  const navigate = useNavigate();
  const { section } = useParams();
  const activeSection = ['tracks', 'albums', 'artists', 'playlists'].includes(section || '') ? section! : 'tracks';
  const {
    tracks,
    albums,
    artists,
    playlists,
    filters,
    isLoading,
    setSearch,
    setSort,
    setViewMode,
    setSourceFilter,
    setFilters,
    resetFilters,
  } = useLibraryStore();

  const [localTracks, setLocalTracks] = useState<Track[]>([]);
  const [localAlbums, setLocalAlbums] = useState<Album[]>([]);
  const [localArtists, setLocalArtists] = useState<Artist[]>([]);
  const [localPlaylists, setLocalPlaylists] = useState<Playlist[]>([]);
  const [loadingLocal, setLoadingLocal] = useState(true);

  useEffect(() => {
    const loadLocal = async () => {
      setLoadingLocal(true);
      try {
        const [tracksData, albumsData, artistsData, playlistsData] = await Promise.all([
          localFilesService.getAllTracks(),
          localFilesService.getAllAlbums(),
          localFilesService.getAllArtists(),
          localFilesService.getAllPlaylists(),
        ]);
        setLocalTracks(tracksData);
        setLocalAlbums(albumsData);
        setLocalArtists(artistsData);
        setLocalPlaylists(playlistsData);
      } catch (error) {
        console.error('Error loading local data:', error);
      } finally {
        setLoadingLocal(false);
      }
    };
    loadLocal();
  }, []);

  const allTracks = useMemo(() => [...tracks, ...localTracks], [tracks, localTracks]);
  const allAlbums = useMemo(() => [...albums, ...localAlbums], [albums, localAlbums]);
  const allArtists = useMemo(() => [...artists, ...localArtists], [artists, localArtists]);
  const allPlaylists = useMemo(() => [...playlists, ...localPlaylists], [playlists, localPlaylists]);

  const filteredTracks = useMemo(() => {
    let result = [...allTracks];

    if (filters.sourceFilter !== 'all') {
      result = result.filter(t => t.source === filters.sourceFilter);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(searchLower) ||
        t.artist.toLowerCase().includes(searchLower) ||
        t.album?.toLowerCase().includes(searchLower)
      );
    }

    result.sort((a, b) => {
      let aVal: string | number = a[filters.sortField] || 0;
      let bVal: string | number = b[filters.sortField] || 0;

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return filters.sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return filters.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [allTracks, filters]);

  const filteredAlbums = useMemo(() => {
    let result = [...allAlbums];
    if (filters.sourceFilter !== 'all') {
      result = result.filter(a => a.source === filters.sourceFilter);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(a =>
        a.name.toLowerCase().includes(searchLower) ||
        a.artist.toLowerCase().includes(searchLower)
      );
    }
    return result;
  }, [allAlbums, filters]);

  const filteredArtists = useMemo(() => {
    let result = [...allArtists];
    if (filters.sourceFilter !== 'all') {
      result = result.filter(a => a.source === filters.sourceFilter);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(a =>
        a.name.toLowerCase().includes(searchLower)
      );
    }
    return result;
  }, [allArtists, filters]);

  const filteredPlaylists = useMemo(() => {
    let result = [...allPlaylists];
    if (filters.sourceFilter !== 'all') {
      result = result.filter(p => p.source === filters.sourceFilter);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(searchLower) ||
        p.owner?.toLowerCase().includes(searchLower)
      );
    }
    return result;
  }, [allPlaylists, filters]);

  const isLoadingTotal = isLoading || loadingLocal;

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Biblioteca</h1>
          <p className="text-sm text-text-muted">Tu música, organizada</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={resetFilters} disabled={filters.search === '' && filters.sortField === 'addedAt' && filters.sortDirection === 'desc' && filters.viewMode === 'grid' && filters.sourceFilter === 'all'}>
            <Filter className="h-4 w-4 mr-1" />
            Limpiar filtros
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="search"
            value={filters.search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar tu biblioteca..."
            className="w-full pl-10 pr-4 py-2 bg-bg-tertiary border border-border-default rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={filters.sourceFilter} onValueChange={(v) => setSourceFilter(v as 'all' | 'local' | 'spotify')}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Todas las fuentes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="local">Local</SelectItem>
              <SelectItem value="spotify">Spotify</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.sortField} onValueChange={(v) => setSort(v as SortField)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="title">Título</SelectItem>
              <SelectItem value="artist">Artista</SelectItem>
              <SelectItem value="album">Álbum</SelectItem>
              <SelectItem value="duration">Duración</SelectItem>
              <SelectItem value="addedAt">Añadido recientemente</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            className={filters.sortDirection === 'asc' ? 'text-accent' : ''}
            onClick={() => setSort(filters.sortField, filters.sortDirection === 'asc' ? 'desc' : 'asc')}
            aria-label={filters.sortDirection === 'asc' ? 'Orden descendente' : 'Orden ascendente'}
          >
            {filters.sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <Tabs value={activeSection} onValueChange={value => navigate(`/library/${value}`)} className="flex-1 overflow-hidden">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tracks">
            <Music className="h-4 w-4 mr-2" />
            Canciones ({filteredTracks.length})
          </TabsTrigger>
          <TabsTrigger value="albums">
            <Square className="h-4 w-4 mr-2" />
            Álbumes ({filteredAlbums.length})
          </TabsTrigger>
          <TabsTrigger value="artists">
            <Users className="h-4 w-4 mr-2" />
            Artistas ({filteredArtists.length})
          </TabsTrigger>
          <TabsTrigger value="playlists">
            <ListMusic className="h-4 w-4 mr-2" />
            Listas ({filteredPlaylists.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tracks" className="mt-4 flex-1 overflow-hidden">
          {isLoadingTotal ? (
            <ScrollArea className="h-full">
              <div className="space-y-2">
                {[...Array(10)].map((_, i) => <SkeletonTrack key={i} />)}
              </div>
            </ScrollArea>
          ) : filteredTracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-text-muted">
              <Music className="h-16 w-16 mb-4 text-text-muted/30" />
              <h3 className="text-lg font-medium mb-1">No se encontraron canciones</h3>
              <p className="text-sm mb-4">Intenta cambiar los filtros o busca con otros términos</p>
              <Button variant="outline" onClick={resetFilters}>Restablecer filtros</Button>
            </div>
          ) : filters.viewMode === 'grid' ? (
            <ScrollArea className="h-full">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredTracks.map((track) => (
                  <TrackCard key={track.id} track={track} index={null} />
                ))}
              </div>
            </ScrollArea>
          ) : (
            <ScrollArea className="h-full">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border-default">
                    <th className="pb-3 w-10">#</th>
                    <th className="pb-3 pl-4">TÍTULO</th>
                    <th className="pb-3 hidden md:table-cell">ARTISTA</th>
                    <th className="pb-3 hidden lg:table-cell">ÁLBUM</th>
                    <th className="pb-3 w-24 text-right">DURACIÓN</th>
                    <th className="pb-3 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTracks.map((track, index) => (
                    <TrackRow key={track.id} track={track} index={index + 1} />
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="albums" className="mt-4 flex-1 overflow-hidden">
          {isLoadingTotal ? (
            <ScrollArea className="h-full">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(8)].map((_, i) => <SkeletonAlbum key={i} />)}
              </div>
            </ScrollArea>
          ) : filteredAlbums.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-text-muted">
              <Square className="h-16 w-16 mb-4 text-text-muted/30" />
              <h3 className="text-lg font-medium mb-1">No se encontraron álbumes</h3>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredAlbums.map((album) => (
                  <AlbumCard key={album.id} album={album} />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="artists" className="mt-4 flex-1 overflow-hidden">
          {isLoadingTotal ? (
            <ScrollArea className="h-full">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(8)].map((_, i) => <SkeletonArtist key={i} />)}
              </div>
            </ScrollArea>
          ) : filteredArtists.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-text-muted">
              <Users className="h-16 w-16 mb-4 text-text-muted/30" />
              <h3 className="text-lg font-medium mb-1">No se encontraron artistas</h3>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredArtists.map((artist) => (
                  <ArtistCard key={artist.id} artist={artist} />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="playlists" className="mt-4 flex-1 overflow-hidden">
          {isLoadingTotal ? (
            <ScrollArea className="h-full">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(8)].map((_, i) => <SkeletonPlaylist key={i} />)}
              </div>
            </ScrollArea>
          ) : filteredPlaylists.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-text-muted">
              <ListMusic className="h-16 w-16 mb-4 text-text-muted/30" />
              <h3 className="text-lg font-medium mb-1">No se encontraron listas</h3>
              <p className="text-sm mb-4">Crea tu primera lista de reproducción</p>
<Button asChild variant="primary">
  <Link to="/playlists">Crear lista</Link>
</Button>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredPlaylists.map((playlist) => (
                  <PlaylistCard key={playlist.id} playlist={playlist} />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TrackCard({ track, index }: { track: Track; index: number | null }) {
  const isFavorite = useFavoritesStore(state => state.tracks.some(favorite => favorite.id === track.id && favorite.source === track.source));
  const toggleFavorite = useFavoritesStore(state => state.toggleFavorite);

  return (
    <div className="group relative bg-surface border border-border-default rounded-xl overflow-hidden hover:border-border-strong hover:shadow-lg transition-all">
      <div className="relative aspect-square overflow-hidden bg-bg-tertiary">
        {track.albumArt ? (
          <img src={track.albumArt} alt={track.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/30 to-accent/10">
            <Music className="h-12 w-12 text-accent/50" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
          <Button
            variant="primary"
            size="icon"
            className="opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all"
            aria-label={`Reproducir ${track.title}`}
            onClick={() => usePlayerStore.getState().play(track)}
          >
            <Play className="h-5 w-5" />
          </Button>
        </div>
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Badge variant="accent" size="sm" className="text-xs">
            {track.source === 'spotify' ? 'Spotify' : 'Local'}
          </Badge>
        </div>
      </div>
      <div className="p-3 space-y-1">
        <p className="font-medium truncate">{track.title}</p>
        <p className="text-sm text-text-muted truncate">{track.artist}</p>
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>{track.durationFormatted || formatDuration(track.duration)}</span>
          <Badge variant="outline" size="sm" className="text-[10px]">
            {track.source === 'spotify' ? 'Spotify' : 'Local'}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => { void toggleFavorite(track).catch(() => undefined); }}
        >
          <Heart className={`mr-2 h-4 w-4 ${isFavorite ? 'fill-error text-error' : ''}`} />
          {isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
        </Button>
      </div>
    </div>
  );
}

function TrackRow({ track, index }: { track: Track; index: number }) {
  const toggleFavorite = useFavoritesStore(state => state.toggleFavorite);

  return (
    <tr className="border-b border-border-default/50 hover:bg-bg-hover transition-colors">
      <td className="py-3 text-sm text-text-muted w-10">{index}</td>
      <td className="py-3 pl-4">
        <div className="flex items-center gap-3 min-w-0">
          {track.albumArt ? (
            <img src={track.albumArt} alt={track.title} className="h-10 w-10 rounded-lg object-cover" />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center">
              <Music className="h-5 w-5 text-accent/50" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-medium truncate">{track.title}</p>
            <p className="text-sm text-text-muted truncate">{track.artist}</p>
          </div>
        </div>
      </td>
      <td className="py-3 hidden md:table-cell text-sm text-text-muted truncate max-w-[150px]">{track.artist}</td>
      <td className="py-3 hidden lg:table-cell text-sm text-text-muted truncate max-w-[150px]">{track.album || '—'}</td>
      <td className="py-3 text-sm text-text-muted w-24 text-right">{track.durationFormatted || formatDuration(track.duration)}</td>
      <td className="py-3 w-12 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-text-secondary hover:text-text-primary">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => usePlayerStore.getState().play(track)}>Reproducir</DropdownMenuItem>
            <DropdownMenuItem onClick={() => usePlayerStore.getState().addToQueue(track)}>Añadir a la cola</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => useFavoritesStore.getState().toggleFavorite(track).catch(() => undefined)}>Añadir/quitar de favoritos</DropdownMenuItem>
            <DropdownMenuSeparator />
            {track.source === 'local' && <DropdownMenuItem className="text-error">Eliminar</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

function AlbumCard({ album }: { album: Album }) {
  return (
    <Link to={`/albums/${album.id}`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-bg-tertiary group-hover:scale-[1.02] transition-transform duration-200">
        {album.coverArt ? (
          <img src={album.coverArt} alt={album.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/30 to-accent/10">
            <Square className="h-12 w-12 text-accent/50" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <Button variant="primary" size="icon" className="opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all">
            <Play className="h-5 w-5" />
          </Button>
        </div>
      </div>
      <div className="mt-3 space-y-1">
        <p className="font-medium truncate">{album.name}</p>
        <p className="text-sm text-text-muted truncate">{album.artist}</p>
        <p className="text-xs text-text-muted">{album.totalTracks} canciones • {formatDurationLong(album.duration)}</p>
        <Badge variant="outline" size="sm" className="text-[10px]">
          {album.source === 'spotify' ? 'Spotify' : 'Local'}
        </Badge>
      </div>
    </Link>
  );
}

function ArtistCard({ artist }: { artist: Artist }) {
  return (
    <Link to={`/artists/${artist.id}`} className="group block text-center">
      <div className="relative aspect-square overflow-hidden rounded-full mx-auto mb-3 bg-bg-tertiary group-hover:scale-[1.05] transition-transform duration-200 max-w-[160px]">
        {artist.image ? (
          <img src={artist.image} alt={artist.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/30 to-accent/10">
            <Users className="h-16 w-16 text-accent/50" />
          </div>
        )}
      </div>
      <p className="font-medium truncate">{artist.name}</p>
      <p className="text-sm text-text-muted">{artist.albums.length} álbumes • {artist.topTracks.length} canciones populares</p>
      <Badge variant="outline" size="sm" className="text-[10px] mt-1">
        {artist.source === 'spotify' ? 'Spotify' : 'Local'}
      </Badge>
    </Link>
  );
}

function PlaylistCard({ playlist }: { playlist: Playlist }) {
  return (
    <Link to={`/playlists/${playlist.id}`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-bg-tertiary group-hover:scale-[1.02] transition-transform duration-200">
        {playlist.coverArt ? (
          <img src={playlist.coverArt} alt={playlist.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/30 to-accent/10">
            <ListMusic className="h-12 w-12 text-accent/50" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <Button variant="primary" size="icon" className="opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all">
            <Play className="h-5 w-5" />
          </Button>
        </div>
      </div>
      <div className="mt-3 space-y-1">
        <p className="font-medium truncate">{playlist.name}</p>
        <p className="text-sm text-text-muted truncate">{playlist.owner || 'Desconocido'}</p>
        <p className="text-xs text-text-muted">{playlist.totalTracks} canciones • {formatDurationLong(playlist.duration)}</p>
        <Badge variant="outline" size="sm" className="text-[10px]">
          {playlist.source === 'spotify' ? 'Spotify' : 'Local'}
        </Badge>
      </div>
    </Link>
  );
}