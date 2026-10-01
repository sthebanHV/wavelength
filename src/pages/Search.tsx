'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search as SearchIcon,
  X,
  Music,
  Square,
  Users,
  ListMusic,
  Clock,
  Loader2,
  Filter,
  Play,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SkeletonTrack, SkeletonAlbum, SkeletonArtist, SkeletonPlaylist } from '@/components/ui/skeleton';
import { formatDuration, formatDurationLong, formatNumber } from '@/lib/utils';
import { useLibraryStore } from '@/stores/libraryStore';
import { spotifyService } from '@/services/spotify';
import { localFilesService } from '@/services/localFiles';
import { cn } from '@/lib/utils';
import type { Track, Album, Artist, Playlist, SearchResults } from '@/types';

export function Search() {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [spotifyResults, setSpotifyResults] = useState<SearchResults | null>(null);
  const [localResults, setLocalResults] = useState<SearchResults>({ tracks: [], albums: [], artists: [], playlists: [] });
  const [activeTab, setActiveTab] = useState<'all' | 'tracks' | 'artists' | 'albums' | 'playlists'>('all');
  const [showRecent, setShowRecent] = useState(false);

  const { tracks: localTracks, albums: localAlbums, artists: localArtists, playlists: localPlaylists } = useLibraryStore();

  useEffect(() => {
    const stored = localStorage.getItem('wavelength-recent-searches');
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch {
        setRecentSearches([]);
      }
    }
  }, []);

  const saveRecentSearch = useCallback((search: string) => {
    if (!search.trim()) return;
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s !== search);
      const updated = [search, ...filtered].slice(0, 10);
      localStorage.setItem('wavelength-recent-searches', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const searchLocal = useCallback(async (searchQuery: string): Promise<SearchResults> => {
    const lowerQuery = searchQuery.toLowerCase();

    const tracks = localTracks.filter(t =>
      t.title.toLowerCase().includes(lowerQuery) ||
      t.artist.toLowerCase().includes(lowerQuery) ||
      t.album?.toLowerCase().includes(lowerQuery)
    ).slice(0, 20);

    const albums = localAlbums.filter(a =>
      a.name.toLowerCase().includes(lowerQuery) ||
      a.artist.toLowerCase().includes(lowerQuery)
    ).slice(0, 10);

    const artists = localArtists.filter(a =>
      a.name.toLowerCase().includes(lowerQuery)
    ).slice(0, 10);

    const playlists = localPlaylists.filter(p =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.owner?.toLowerCase().includes(lowerQuery)
    ).slice(0, 10);

    return { tracks, albums, artists, playlists };
  }, [localTracks, localAlbums, localArtists, localPlaylists]);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSpotifyResults(null);
      setLocalResults({ tracks: [], albums: [], artists: [], playlists: [] });
      return;
    }

    setIsSearching(true);
    saveRecentSearch(searchQuery);
    setShowRecent(false);

    try {
      const [spotify, local] = await Promise.all([
        spotifyService.isAuthenticated()
          ? spotifyService.search(searchQuery, ['track', 'album', 'artist', 'playlist'], 20)
          : Promise.resolve({ tracks: [], albums: [], artists: [], playlists: [] }),
        searchLocal(searchQuery),
      ]);

      setSpotifyResults(spotify);
      setLocalResults(local);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, [saveRecentSearch, searchLocal]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  const combinedResults = useMemo((): SearchResults => {
    if (!spotifyResults) return localResults;

    return {
      tracks: [...spotifyResults.tracks.slice(0, 10), ...localResults.tracks.slice(0, 10)],
      albums: [...spotifyResults.albums.slice(0, 5), ...localResults.albums.slice(0, 5)],
      artists: [...spotifyResults.artists.slice(0, 5), ...localResults.artists.slice(0, 5)],
      playlists: [...spotifyResults.playlists.slice(0, 5), ...localResults.playlists.slice(0, 5)],
    };
  }, [spotifyResults, localResults]);

  const getFilteredResults = () => {
    switch (activeTab) {
      case 'tracks': return combinedResults.tracks;
      case 'artists': return combinedResults.artists;
      case 'albums': return combinedResults.albums;
      case 'playlists': return combinedResults.playlists;
      default: return [];
    }
  };

  const results = getFilteredResults();
  const hasResults = query.trim() && (spotifyResults || localResults.tracks.length > 0 || localResults.albums.length > 0 || localResults.artists.length > 0 || localResults.playlists.length > 0);

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">Buscar</h1>
        <form onSubmit={handleSubmit} className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowRecent(true)}
            placeholder="Buscar canciones, artistas, álbumes, listas..."
            className="w-full pl-12 pr-16 py-3 bg-bg-tertiary border border-border-default rounded-xl text-text-primary placeholder-text-muted text-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            autoFocus
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-3 top-1/2 -translate-y-1/2"
              onClick={() => setQuery('')}
              type="button"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
          <Button type="submit" disabled={!query.trim() || isSearching} className="absolute right-12 top-1/2 -translate-y-1/2">
            {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : <SearchIcon className="h-5 w-5" />}
          </Button>
        </form>
      </div>

      {showRecent && !query && recentSearches.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-text-muted">Búsquedas recientes</h3>
            <Button variant="ghost" size="sm" onClick={() => {
              localStorage.removeItem('wavelength-recent-searches');
              setRecentSearches([]);
            }}>
              Limpiar
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((search) => (
              <Button
                key={search}
                variant="outline"
                size="sm"
                onClick={() => { setQuery(search); performSearch(search); }}
                className="gap-1"
              >
                <SearchIcon className="h-3 w-3" />
                {search}
              </Button>
            ))}
          </div>
        </div>
      )}

      {hasResults && (
        <Tabs defaultValue="all" onValueChange={(value: 'all' | 'tracks' | 'albums' | 'artists' | 'playlists') => setActiveTab(value)} className="mb-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">Todo</TabsTrigger>
            <TabsTrigger value="tracks">Canciones</TabsTrigger>
            <TabsTrigger value="artists">Artistas</TabsTrigger>
            <TabsTrigger value="albums">Álbumes</TabsTrigger>
            <TabsTrigger value="playlists">Listas</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      <div className="flex-1 overflow-hidden">
        {isSearching ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : query && !hasResults ? (
          <div className="flex flex-col items-center justify-center h-64 text-text-muted">
            <SearchIcon className="h-16 w-16 mb-4 text-text-muted/30" />
            <h3 className="text-lg font-medium mb-1">No se encontraron resultados</h3>
            <p className="text-sm">Intenta con otros términos de búsqueda</p>
          </div>
        ) : activeTab === 'tracks' ? (
          <ScrollArea className="h-full">
            {isSearching ? (
              <div className="space-y-2">{[...Array(10)].map((_, i) => <SkeletonTrack key={i} />)}</div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-text-muted">
                <Music className="h-16 w-16 mb-4 text-text-muted/30" />
                <h3 className="text-lg font-medium mb-1">No se encontraron canciones</h3>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {results.map((track, index) => (
                  <TrackRow key={track.id} track={track as Track} index={index + 1} />
                ))}
              </div>
            )}
          </ScrollArea>
        ) : activeTab === 'artists' ? (
          <ScrollArea className="h-full">
            {isSearching ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{[...Array(8)].map((_, i) => <SkeletonArtist key={i} />)}</div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-text-muted">
                <Users className="h-16 w-16 mb-4 text-text-muted/30" />
                <h3 className="text-lg font-medium mb-1">No se encontraron artistas</h3>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 p-4">
                {results.map((artist) => (
                  <ArtistCard key={artist.id} artist={artist as Artist} />
                ))}
              </div>
            )}
          </ScrollArea>
        ) : activeTab === 'albums' ? (
          <ScrollArea className="h-full">
            {isSearching ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{[...Array(8)].map((_, i) => <SkeletonAlbum key={i} />)}</div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-text-muted">
                <Square className="h-16 w-16 mb-4 text-text-muted/30" />
                <h3 className="text-lg font-medium mb-1">No se encontraron álbumes</h3>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 p-4">
                {results.map((album) => (
                  <AlbumCard key={album.id} album={album as Album} />
                ))}
              </div>
            )}
          </ScrollArea>
        ) : activeTab === 'playlists' ? (
          <ScrollArea className="h-full">
            {isSearching ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{[...Array(8)].map((_, i) => <SkeletonPlaylist key={i} />)}</div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-text-muted">
                <ListMusic className="h-16 w-16 mb-4 text-text-muted/30" />
                <h3 className="text-lg font-medium mb-1">No se encontraron listas</h3>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 p-4">
                {results.map((playlist) => (
                  <PlaylistCard key={playlist.id} playlist={playlist as Playlist} />
                ))}
              </div>
            )}
          </ScrollArea>
        ) : (
          <div className="space-y-8">
            {combinedResults.tracks.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Music className="h-5 w-5" />
                  Canciones ({combinedResults.tracks.length})
                </h2>
                <ScrollArea className="h-64" type="always">
                  <div className="flex gap-4 pb-4">
                    {combinedResults.tracks.slice(0, 10).map((track) => (
                      <Link key={track.id} to="#" className="flex-shrink-0 w-40 group">
                        <div className="relative aspect-square rounded-lg overflow-hidden bg-bg-tertiary group-hover:scale-105 transition-transform">
                          {track.albumArt ? (
                            <img src={track.albumArt} alt={track.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/30 to-accent/10">
                              <Music className="h-10 w-10 text-accent/50" />
                            </div>
                          )}
                        </div>
                        <div className="mt-2 space-y-1">
                          <p className="text-sm font-medium truncate">{track.title}</p>
                          <p className="text-xs text-text-muted truncate">{track.artist}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </ScrollArea>
              </section>
            )}

            {combinedResults.artists.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Artistas ({combinedResults.artists.length})
                </h2>
                <ScrollArea className="h-56" type="always">
                  <div className="flex gap-4 pb-4">
                    {combinedResults.artists.slice(0, 8).map((artist) => (
                      <Link key={artist.id} to="#" className="flex-shrink-0 w-40 group text-center">
                        <div className="relative aspect-square overflow-hidden rounded-full mx-auto mb-2 bg-bg-tertiary group-hover:scale-105 transition-transform">
                          {artist.image ? (
                            <img src={artist.image} alt={artist.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/30 to-accent/10">
                              <Users className="h-10 w-10 text-accent/50" />
                            </div>
                          )}
                        </div>
                        <p className="text-sm font-medium truncate">{artist.name}</p>
                        <p className="text-xs text-text-muted">Artista</p>
                      </Link>
                    ))}
                  </div>
                </ScrollArea>
              </section>
            )}

            {combinedResults.albums.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Square className="h-5 w-5" />
                  Álbumes ({combinedResults.albums.length})
                </h2>
                <ScrollArea className="h-56" type="always">
                  <div className="flex gap-4 pb-4">
                    {combinedResults.albums.slice(0, 8).map((album) => (
                      <Link key={album.id} to="#" className="flex-shrink-0 w-40 group">
                        <div className="relative aspect-square overflow-hidden rounded-lg bg-bg-tertiary group-hover:scale-105 transition-transform">
                          {album.coverArt ? (
                            <img src={album.coverArt} alt={album.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/30 to-accent/10">
                              <Square className="h-10 w-10 text-accent/50" />
                            </div>
                          )}
                        </div>
                        <div className="mt-2 space-y-1">
                          <p className="text-sm font-medium truncate">{album.name}</p>
                          <p className="text-xs text-text-muted truncate">{album.artist}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </ScrollArea>
              </section>
            )}

            {combinedResults.playlists.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <ListMusic className="h-5 w-5" />
                  Listas de reproducción ({combinedResults.playlists.length})
                </h2>
                <ScrollArea className="h-56" type="always">
                  <div className="flex gap-4 pb-4">
                    {combinedResults.playlists.slice(0, 8).map((playlist) => (
                      <Link key={playlist.id} to="#" className="flex-shrink-0 w-40 group">
                        <div className="relative aspect-square overflow-hidden rounded-lg bg-bg-tertiary group-hover:scale-105 transition-transform">
                          {playlist.coverArt ? (
                            <img src={playlist.coverArt} alt={playlist.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/30 to-accent/10">
                              <ListMusic className="h-10 w-10 text-accent/50" />
                            </div>
                          )}
                        </div>
                        <div className="mt-2 space-y-1">
                          <p className="text-sm font-medium truncate">{playlist.name}</p>
                          <p className="text-xs text-text-muted truncate">{playlist.owner || 'Desconocido'}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </ScrollArea>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TrackRow({ track, index }: { track: Track; index: number }) {
  return (
    <div className="flex items-center gap-4 rounded-xl p-2 hover:bg-bg-hover transition-colors cursor-pointer group">
      <span className="w-8 text-center text-xs text-text-muted">{index}</span>
      {track.albumArt ? (
        <img src={track.albumArt} alt={track.title} className="h-10 w-10 rounded-lg object-cover" />
      ) : (
        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center">
          <Music className="h-5 w-5 text-accent/50" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{track.title}</p>
        <p className="text-xs text-text-muted truncate">{track.artist}</p>
      </div>
      <span className="text-xs text-text-muted w-16 text-right">{track.durationFormatted || formatDuration(track.duration)}</span>
      <Badge variant="outline" size="sm" className="text-[10px]">
        {track.source === 'spotify' ? 'Spotify' : 'Local'}
      </Badge>
    </div>
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