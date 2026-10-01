'use client';

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Play,
  Clock,
  Music,
  Compass,
  Zap,
  Users,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { SkeletonAlbum, SkeletonTrack } from '@/components/ui/skeleton';
import { formatDuration } from '@/lib/utils';
import { useLibraryStore } from '@/stores/libraryStore';
import { useAuthStore } from '@/stores/authStore';
import { spotifyService } from '@/services/spotify';
import { localFilesService } from '@/services/localFiles';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { Track } from '@/types';

interface FeaturedItem {
  id: string;
  title: string;
  subtitle: string;
  image?: string;
  type: 'playlist' | 'album' | 'artist' | 'track';
  href: string;
  metadata?: {
    duration?: string;
    owner?: string;
    trackCount?: number;
  };
}

const featuredContent: FeaturedItem[] = [
  {
    id: 'discover-weekly',
    title: 'Descubrimiento semanal',
    subtitle: 'Tu mezcla personalizada',
    image: undefined,
    type: 'playlist',
    href: '/playlists/discover-weekly',
    metadata: { trackCount: 30, duration: '2h 15m' },
  },
  {
    id: 'release-radar',
    title: 'Radar de novedades',
    subtitle: 'Nuevas canciones para ti',
    image: undefined,
    type: 'playlist',
    href: '/playlists/release-radar',
    metadata: { trackCount: 50, duration: '3h 30m' },
  },
  {
    id: 'daily-mix-1',
    title: 'Mix diario 1',
    subtitle: 'Basado en tus gustos',
    image: undefined,
    type: 'playlist',
    href: '/playlists/daily-mix-1',
    metadata: { trackCount: 50, duration: '3h' },
  },
];

const quickLinks = [
  { icon: Compass, label: 'Explorar', href: '/explore', color: 'from-blue-500 to-cyan-500' },
  { icon: Zap, label: 'Hecho para ti', href: '/made-for-you', color: 'from-purple-500 to-pink-500' },
  { icon: Clock, label: 'Recién reproducidos', href: '/recently-played', color: 'from-green-500 to-emerald-500' },
  { icon: Users, label: 'Top artistas', href: '/top-artists', color: 'from-orange-500 to-red-500' },
];

export function Home() {
  const { tracks } = useLibraryStore();
  const { isAuthenticated, checkAuth } = useAuthStore();
  const [featured] = useState<FeaturedItem[]>(featuredContent);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Track[]>([]);
  const [madeForYou, setMadeForYou] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const localTracks = await localFilesService.getAllTracks();
        setRecentlyPlayed(localTracks.slice(0, 10));

        if (isAuthenticated) {
          try {
            const [recent, topTracks] = await Promise.all([
              spotifyService.getRecentlyPlayed(10),
              spotifyService.getTopTracks('short_term', 20),
            ]);
            setRecentlyPlayed(prev => [...recent.slice(0, 5), ...prev.slice(0, 5)]);
            setMadeForYou(topTracks.slice(0, 10));
          } catch {
            // Ignore Spotify errors
          }
        }
      } catch (error) {
        console.error('Error loading home data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    if (isAuthenticated) checkAuth();
  }, [isAuthenticated, checkAuth]);

  const allTracks = [...recentlyPlayed, ...madeForYou, ...tracks.slice(0, 20)];
  const uniqueTracks = allTracks.filter((track, index, self) => index === self.findIndex(t => t.id === track.id));

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <SkeletonAlbum key={i} />)}
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => <SkeletonTrack key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-8">
        <section aria-label="Accesos rápidos">
          <div className="flex flex-wrap gap-3">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  'relative flex items-center gap-3 rounded-xl p-4 min-w-[180px] max-w-[200px] flex-1 overflow-hidden transition-all hover:scale-[1.02]',
                  'bg-gradient-to-br',
                  link.color,
                  'text-white'
                )}
              >
                <div className="absolute inset-0 bg-black/10" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                <link.icon className="relative h-10 w-10 flex-shrink-0" aria-hidden="true" />
                <div className="relative flex flex-col">
                  <span className="text-xs font-medium opacity-90">{link.label}</span>
                  <span className="text-sm font-semibold">Ir</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section aria-label="Reproduce de nuevo">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">Reproduce de nuevo</h2>
              <p className="text-sm text-text-muted">Vuelve a donde lo dejaste</p>
            </div>
          </div>
          <ScrollArea className="h-64" type="always">
            <div className="flex gap-4 pb-4">
              {recentlyPlayed.slice(0, 10).map((track) => (
                <Link
                  key={track.id}
                  to={track.source === 'spotify' ? track.url || '#' : `#`}
                  className="flex-shrink-0 w-40 group"
                >
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-bg-tertiary group-hover:scale-105 transition-transform duration-200">
                    {track.albumArt ? (
                      <img src={track.albumArt} alt={track.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/30 to-accent/10">
                        <Music className="h-10 w-10 text-accent/50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <Button
                        variant="primary"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      >
                        <Play className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm font-medium truncate">{track.title}</p>
                    <p className="text-xs text-text-muted truncate">{track.artist}</p>
                  </div>
                </Link>
              ))}
              {recentlyPlayed.length === 0 && (
                <div className="flex items-center justify-center h-full w-full text-text-muted">
                  <p>No hay historial de reproducción</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </section>

        <section aria-label="Hecho para ti">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">Hecho para ti</h2>
              <p className="text-sm text-text-muted">Mezclas personalizadas basadas en tu gusto</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featured.map((item) => (
              <Link
                key={item.id}
                to={item.href}
                className="group relative overflow-hidden rounded-xl bg-surface border border-border-default p-4 hover:border-border-strong hover:shadow-lg transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="relative h-20 w-20 rounded-lg overflow-hidden bg-gradient-to-br from-accent/30 to-accent/10 flex-shrink-0 group-hover:scale-105 transition-transform">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Music className="h-8 w-8 text-accent/50" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.title}</p>
                    <p className="text-sm text-text-muted truncate">{item.subtitle}</p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-text-muted">
                      {item.metadata?.trackCount && (
                        <span>{item.metadata.trackCount} canciones</span>
                      )}
                      {item.metadata?.duration && (
                        <span>• {item.metadata.duration}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <Button
                    variant="primary"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all"
                  >
                    <Play className="h-5 w-5" />
                  </Button>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section aria-label="Tus canciones">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">Tus canciones</h2>
              <p className="text-sm text-text-muted">{uniqueTracks.length} canciones en tu biblioteca</p>
            </div>
            <Button variant="ghost" size="sm">
              <Link to="/library/tracks" className="inherit">Ver todas</Link>
            </Button>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {uniqueTracks.slice(0, 10).map((track, index) => (
              <div
                key={track.id}
                className={cn(
                  'flex items-center gap-4 rounded-xl p-2 hover:bg-bg-hover transition-colors cursor-pointer',
                  'group'
                )}
              >
                <span className="w-8 text-center text-xs text-text-muted">{index + 1}</span>
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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-text-primary"
                      aria-label="Más opciones"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Más opciones</TooltipContent>
                </Tooltip>
              </div>
            ))}
            {uniqueTracks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center text-text-muted">
                <Music className="h-12 w-12 mb-4 text-text-muted/50" />
                <h3 className="text-lg font-medium mb-1">Tu biblioteca está vacía</h3>
                <p className="text-sm mb-4">Añade canciones desde la pestaña "Subir" o conecta Spotify</p>
                <Button variant="primary">
                  <Link to="/upload" className="inherit">Subir música</Link>
                </Button>
              </div>
            )}
          </div>
        </section>
      </div>
    </ScrollArea>
  );
}