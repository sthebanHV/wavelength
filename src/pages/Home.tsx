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
  ArrowRight,
  Sparkles,
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
  { icon: Compass, label: 'Explorar', href: '/explore', color: 'from-violet-700 to-fuchsia-600' },
  { icon: Zap, label: 'Hecho para ti', href: '/made-for-you', color: 'from-purple-700 to-fuchsia-500' },
  { icon: Clock, label: 'Recién reproducidos', href: '/recently-played', color: 'from-violet-800 to-purple-600' },
  { icon: Users, label: 'Top artistas', href: '/top-artists', color: 'from-fuchsia-700 to-violet-600' },
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
      <div className="home-dashboard space-y-8 pb-4">
        <section aria-label="Bienvenido a Wavelength" className="home-hero relative min-h-[250px] overflow-hidden rounded-2xl border border-border-default">
          <div className="relative z-10 flex min-h-[250px] items-center p-6 sm:p-9 lg:w-[58%] lg:p-10">
            <div className="max-w-xl">
              <div className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Tu espacio, tu música
              </div>
              <h1 className="max-w-lg text-3xl font-bold leading-[1.05] tracking-tight sm:text-4xl lg:text-5xl">
                La música también es <span className="bg-gradient-to-r from-accent to-[#e0a0ff] bg-clip-text text-transparent">un lugar.</span>
              </h1>
              <p className="mt-3 max-w-sm text-sm text-text-secondary sm:text-base">
                Escucha, siente y encuentra el ritmo que va contigo.
              </p>
              <Link
                to="/search"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white shadow-[0_0_28px_rgb(176_38_255_/_25%)] transition-all hover:-translate-y-0.5 hover:bg-accent-hover"
              >
                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                Descubrir música
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
          <div className="home-hero-art pointer-events-none absolute inset-y-0 right-0 hidden w-[53%] overflow-hidden lg:block" aria-hidden="true">
            {recentlyPlayed[0]?.albumArt && (
              <>
                <img
                  src={recentlyPlayed[0].albumArt}
                  alt=""
                  className="absolute inset-0 h-full w-full scale-110 object-cover opacity-25 blur-2xl"
                />
                <img
                  src={recentlyPlayed[0].albumArt}
                  alt=""
                  className="absolute inset-0 h-full w-full object-contain p-3 opacity-75 drop-shadow-[0_0_28px_rgba(176,38,255,0.28)]"
                />
              </>
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-[#10091a] via-transparent to-[#0b0712]/30" />
            <div className="absolute inset-y-0 right-[13%] flex items-center">
              <div className="home-visualizer flex h-32 items-center gap-2 opacity-80">
                {Array.from({ length: 18 }, (_, index) => <span key={index} />)}
              </div>
            </div>
            <div className="absolute bottom-7 right-8 max-w-36 text-right text-2xl font-semibold italic leading-tight text-white/90 drop-shadow-[0_0_18px_rgba(176,38,255,0.8)]">
              Good vibes
              <br />
              only
            </div>
          </div>
          <div className="pointer-events-none absolute -right-12 -top-16 hidden h-64 w-64 rounded-full border border-accent/15 lg:right-[36%] lg:block" aria-hidden="true" />
          <div className="pointer-events-none absolute -right-4 -top-8 hidden h-48 w-48 rounded-full border border-accent/10 lg:right-[39%] lg:block" aria-hidden="true" />
        </section>

        <section aria-label="Accesos rápidos">
          <div className="flex flex-wrap gap-3">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  'home-card relative flex min-w-[150px] max-w-[200px] flex-1 items-center gap-3 overflow-hidden rounded-xl border border-border-default p-3',
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
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Reproduce de nuevo</h2>
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
                  <div className="relative aspect-square overflow-hidden rounded-xl border border-border-default bg-bg-tertiary transition-transform duration-300 group-hover:scale-[1.03]">
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
                className="home-card group relative overflow-hidden rounded-xl border border-border-default p-4"
              >
                <div className="flex items-start gap-4">
                  <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-accent/30 to-accent/10 transition-transform group-hover:scale-105">
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