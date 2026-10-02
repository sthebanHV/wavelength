import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  HelpCircle,
  GripVertical,
  Globe2,
  LockKeyhole,
  Music2,
  Pencil,
  Play,
  Plus,
  Search,
  X,
  Youtube,
} from 'lucide-react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { formatDuration, formatDurationLong } from '@/lib/utils';
import { localFilesService } from '@/services/localFiles';
import { ytMusicService, type YouTubeMusicTrack } from '@/services/ytMusic';
import { spotifyService } from '@/services/spotify';
import { useLibraryStore } from '@/stores/libraryStore';
import { useAuthStore } from '@/stores/authStore';
import type { Track } from '@/types';
import '@/styles/playlist-composer.css';

type Destination = 'youtube' | 'spotify';
type SearchSource = 'catalog' | 'spotify' | 'youtube';
const composerDraftKey = 'wavelength-playlist-composer-draft-v1';

interface RouteTrack {
  id: string;
  targetId: string;
  title: string;
  artist: string;
  album?: string;
  durationMs: number;
  thumbnail?: string;
  url: string;
  origin: SearchSource;
  destination: Destination;
  matched: boolean;
  originalTrack?: Track;
}

interface MatchContext {
  title: string;
  artist: string;
  origin: SearchSource;
  originalTrack?: Track;
}

function toYouTubeRouteTrack(track: YouTubeMusicTrack, origin: SearchSource, matched: boolean, originalTrack?: Track): RouteTrack {
  return {
    id: `youtube:${track.videoId}`,
    targetId: track.videoId,
    title: track.title,
    artist: track.artist,
    album: track.album,
    durationMs: track.durationMs,
    thumbnail: track.thumbnail,
    url: track.url,
    origin,
    destination: 'youtube',
    matched,
    originalTrack,
  };
}

function toSpotifyRouteTrack(track: Track, origin: SearchSource, matched: boolean, originalTrack?: Track): RouteTrack {
  return {
    id: `spotify:${track.id}`,
    targetId: track.id,
    title: track.title,
    artist: track.artist,
    album: track.album,
    durationMs: track.duration,
    thumbnail: track.albumArt,
    url: track.url || `https://open.spotify.com/track/${track.id}`,
    origin,
    destination: 'spotify',
    matched,
    originalTrack,
  };
}

function getDurationLabel(durationMs: number): string {
  if (!durationMs) return '0 min';
  return formatDurationLong(durationMs);
}

export function PlaylistComposer() {
  const navigate = useNavigate();
  const playlistNameRef = useRef<HTMLInputElement>(null);
  const libraryTracks = useLibraryStore(state => state.tracks);
  const spotifyAuthenticated = useAuthStore(state => state.isAuthenticated);
  const loginToSpotify = useAuthStore(state => state.login);
  const [localTracks, setLocalTracks] = useState<Track[]>([]);
  const [playlistName, setPlaylistName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [destination, setDestination] = useState<Destination>('youtube');
  const [searchSource, setSearchSource] = useState<SearchSource>('catalog');
  const [query, setQuery] = useState('');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [youtubeResults, setYoutubeResults] = useState<YouTubeMusicTrack[]>([]);
  const [spotifyResults, setSpotifyResults] = useState<Track[]>([]);
  const [routeTracks, setRouteTracks] = useState<RouteTrack[]>([]);
  const [matchingTrack, setMatchingTrack] = useState<MatchContext | null>(null);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [loadingAccount, setLoadingAccount] = useState(true);
  const [accountConnected, setAccountConnected] = useState(false);
  const [youtubeApiAvailable, setYoutubeApiAvailable] = useState(false);
  const [youtubeConfigured, setYoutubeConfigured] = useState(false);
  const [spotifyConfigured, setSpotifyConfigured] = useState(false);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [connectionCode, setConnectionCode] = useState('');
  const [verificationUrl, setVerificationUrl] = useState('');
  const [connectionInterval, setConnectionInterval] = useState(5);
  const [connectionExpiresAt, setConnectionExpiresAt] = useState(0);
  const [startingConnection, setStartingConnection] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    let active = true;
    setSpotifyConfigured(spotifyService.isConfigured());
    Promise.allSettled([localFilesService.getAllTracks(), ytMusicService.getStatus()])
      .then(async ([localResult, statusResult]) => {
        if (!active) return;
        if (localResult.status === 'fulfilled') setLocalTracks(localResult.value);
        if (statusResult.status === 'fulfilled') {
          const status = statusResult.value;
          setAccountConnected(status.connected);
          setYoutubeApiAvailable(true);
          setYoutubeConfigured(status.configured);
          if (status.connecting && status.userCode && status.verificationUrl) {
            setConnectionCode(status.userCode);
            setVerificationUrl(status.verificationUrl);
            setConnectionInterval(status.interval || 5);
            setConnectionExpiresAt(Date.now() + (status.expiresIn || 0) * 1000);
          }
        } else {
          setYoutubeApiAvailable(false);
        }
      })
      .finally(() => {
        if (active) setLoadingAccount(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(composerDraftKey);
      if (stored) {
        const draft = JSON.parse(stored) as Partial<{
          playlistName: string;
          description: string;
          isPublic: boolean;
          destination: Destination;
          searchSource: SearchSource;
          query: string;
          catalogSearch: string;
          routeTracks: RouteTrack[];
          matchingTrack: MatchContext | null;
        }>;
        if (typeof draft.playlistName === 'string') setPlaylistName(draft.playlistName);
        if (typeof draft.description === 'string') setDescription(draft.description);
        if (typeof draft.isPublic === 'boolean') setIsPublic(draft.isPublic);
        if (draft.destination === 'youtube' || draft.destination === 'spotify') setDestination(draft.destination);
        if (draft.searchSource === 'catalog' || draft.searchSource === 'spotify' || draft.searchSource === 'youtube') setSearchSource(draft.searchSource);
        if (typeof draft.query === 'string') setQuery(draft.query);
        if (typeof draft.catalogSearch === 'string') setCatalogSearch(draft.catalogSearch);
        if (Array.isArray(draft.routeTracks)) setRouteTracks(draft.routeTracks);
        if (draft.matchingTrack && typeof draft.matchingTrack.title === 'string') setMatchingTrack(draft.matchingTrack);
      }
    } catch {
      sessionStorage.removeItem(composerDraftKey);
    } finally {
      setDraftHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!draftHydrated) return;
    try {
      sessionStorage.setItem(composerDraftKey, JSON.stringify({
        playlistName,
        description,
        isPublic,
        destination,
        searchSource,
        query,
        catalogSearch,
        routeTracks,
        matchingTrack,
      }));
    } catch {
      // The playlist can still be created if the browser disables session storage.
    }
  }, [draftHydrated, playlistName, description, isPublic, destination, searchSource, query, catalogSearch, routeTracks, matchingTrack]);

  useEffect(() => {
    if (!spotifyAuthenticated) {
      setSpotifyConnected(false);
      return;
    }
    let active = true;
    spotifyService.getCurrentUser()
      .then(() => { if (active) setSpotifyConnected(true); })
      .catch(() => { if (active) setSpotifyConnected(false); });
    return () => { active = false; };
  }, [spotifyAuthenticated]);

  useEffect(() => {
    if (!connectionCode) return;
    const poll = async () => {
      if (Date.now() >= connectionExpiresAt) {
        setConnectionCode('');
        setError('El código de conexión venció. Solicita uno nuevo.');
        return;
      }
      try {
        const result = await ytMusicService.pollConnection();
        if (result.connected) {
          setAccountConnected(true);
          setConnectionCode('');
          setVerificationUrl('');
          setError(null);
        }
      } catch (pollError) {
        setConnectionCode('');
        setError(pollError instanceof Error ? pollError.message : 'No se pudo conectar YouTube Music.');
      }
    };
    const timer = window.setInterval(() => { void poll(); }, connectionInterval * 1000);
    return () => window.clearInterval(timer);
  }, [connectionCode, connectionInterval, connectionExpiresAt]);

  const catalogTracks = useMemo(() => {
    const unique = new Map<string, Track>();
    [...libraryTracks, ...localTracks].forEach(track => unique.set(`${track.source}:${track.id}`, track));
    return [...unique.values()];
  }, [libraryTracks, localTracks]);

  const filteredCatalog = useMemo(() => {
    const normalized = catalogSearch.trim().toLowerCase();
    return catalogTracks
      .filter(track => !normalized || `${track.title} ${track.artist} ${track.album || ''}`.toLowerCase().includes(normalized))
      .slice(0, 12);
  }, [catalogTracks, catalogSearch]);

  useEffect(() => {
    if ((searchSource !== 'youtube' && searchSource !== 'spotify') || !query.trim()) {
      setYoutubeResults([]);
      setSpotifyResults([]);
      setLoadingTracks(false);
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      setYoutubeResults([]);
      setSpotifyResults([]);
      setError(null);
      setLoadingTracks(true);
      const search = searchSource === 'youtube'
        ? ytMusicService.searchTracks(query.trim()).then(results => { if (active) setYoutubeResults(results); })
        : spotifyService.search(query.trim(), ['track'], 10).then(results => { if (active) setSpotifyResults(results.tracks); });
      search.catch(searchError => { if (active) setError(searchError instanceof Error ? searchError.message : `No se pudo buscar en ${searchSource === 'youtube' ? 'YouTube Music' : 'Spotify'}.`); })
        .finally(() => { if (active) setLoadingTracks(false); });
    }, 240);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query, searchSource]);

  useEffect(() => {
    if (!spotifyAuthenticated) return;
    setSpotifyConnected(true);
  }, [spotifyAuthenticated]);

  const totalDuration = routeTracks.reduce((total, track) => total + track.durationMs, 0);

  const addYouTubeToRoute = (track: YouTubeMusicTrack, origin: SearchSource, matched = false, originalTrack?: Track) => {
    setError(null);
    const routeId = `youtube:${track.videoId}`;
    if (routeTracks.length >= 100 && !routeTracks.some(item => item.id === routeId)) {
      setError('YouTube Music permite hasta 100 canciones por playlist en este flujo.');
      return;
    }
    setRouteTracks(current => current.some(item => item.id === routeId)
      ? current
      : [...current, toYouTubeRouteTrack(track, origin, matched, originalTrack)]);
    setMatchingTrack(null);
    setSearchSource('catalog');
    setCatalogSearch('');
    setQuery('');
  };

  const addSpotifyToRoute = (track: Track, origin: SearchSource, matched = false, originalTrack?: Track) => {
    setError(null);
    if (!track.id) {
      setError('Spotify no devolvió un identificador válido para esta canción. Elige otro resultado.');
      return;
    }
    setRouteTracks(current => current.some(item => item.id === `spotify:${track.id}`)
      ? current
      : [...current, toSpotifyRouteTrack(track, origin, matched, originalTrack)]);
    setMatchingTrack(null);
    setSearchSource('catalog');
    setCatalogSearch('');
    setQuery('');
  };

  const findYouTubeVersion = (title: string, artist: string, origin: SearchSource, originalTrack?: Track) => {
    setError(null);
    setMatchingTrack({ title, artist, origin, originalTrack });
    setSearchSource('youtube');
    setQuery(`${title} ${artist}`.trim());
  };

  const findSpotifyVersion = (title: string, artist: string, origin: SearchSource, originalTrack?: Track) => {
    setError(null);
    setMatchingTrack({ title, artist, origin, originalTrack });
    setSearchSource('spotify');
    setQuery(`${title} ${artist}`.trim());
  };

  const addFromYoutube = (track: YouTubeMusicTrack) => {
    if (destination === 'youtube') {
      addYouTubeToRoute(track, matchingTrack?.origin || 'youtube', Boolean(matchingTrack), matchingTrack?.originalTrack);
    } else {
      findSpotifyVersion(track.title, track.artist, 'youtube');
    }
  };

  const addFromSpotify = (track: Track) => {
    if (destination === 'spotify') {
      addSpotifyToRoute(track, matchingTrack?.origin || 'spotify', Boolean(matchingTrack), matchingTrack?.originalTrack);
    } else {
      findYouTubeVersion(track.title, track.artist, matchingTrack?.origin || 'spotify', track);
    }
  };

  const addFromCatalog = (track: Track) => {
    if (destination === 'spotify' && track.source === 'spotify') {
      addSpotifyToRoute(track, 'catalog');
      return;
    }
    if (destination === 'spotify') findSpotifyVersion(track.title, track.artist, 'catalog', track);
    else findYouTubeVersion(track.title, track.artist, 'catalog', track);
  };

  const removeFromRoute = (id: string) => setRouteTracks(current => current.filter(track => track.id !== id));

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setRouteTracks(current => {
      const from = current.findIndex(track => track.id === active.id);
      const to = current.findIndex(track => track.id === over.id);
      return from < 0 || to < 0 ? current : arrayMove(current, from, to);
    });
  };

  const handleCreate = async () => {
    if (!playlistName.trim() || !routeTracks.length) return;
    setError(null);
    setIsCreating(true);
    try {
      if (destination === 'youtube') {
        await ytMusicService.createPlaylist({
          name: playlistName.trim(),
          description: description.trim(),
          isPublic,
          videoIds: routeTracks.map(track => track.targetId),
        });
      } else {
        const playlist = await spotifyService.createPlaylist({ name: playlistName.trim(), description: description.trim(), isPublic });
        try {
          await spotifyService.addTracksToPlaylist(playlist.id, routeTracks.map(track => `spotify:track:${track.targetId}`));
        } catch (addError) {
          throw new Error(`Spotify creó la playlist, pero no pudo agregar todas las canciones. Abre la lista y revisa el permiso de edición: https://open.spotify.com/playlist/${playlist.id}. ${addError instanceof Error ? addError.message : ''}`);
        }
      }
      sessionStorage.removeItem(composerDraftKey);
      navigate('/playlists?created=1');
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'No se pudo crear la playlist.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSpotifyConnect = async () => {
    setError(null);
    await loginToSpotify('/playlists/new');
    const authError = useAuthStore.getState().error;
    if (authError) setError(authError);
  };

  const handleConnect = async () => {
    setError(null);
    setStartingConnection(true);
    try {
      const authorization = await ytMusicService.startConnection();
      setConnectionCode(authorization.userCode);
      setVerificationUrl(authorization.verificationUrl);
      setConnectionInterval(authorization.interval);
      setConnectionExpiresAt(Date.now() + authorization.expiresIn * 1000);
      window.open(authorization.verificationUrl, '_blank', 'noopener,noreferrer');
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : 'No se pudo iniciar la conexión con YouTube Music.');
    } finally {
      setStartingConnection(false);
    }
  };

  return (
    <div className="playlist-composer">
      <div className="playlist-composer__heading">
        <div className="playlist-composer__title-group">
          <Link to="/playlists" className="playlist-composer__back"><ArrowLeft aria-hidden="true" /> <span>Crear playlist</span></Link>
          <div className="playlist-composer__name-line">
            <input
              aria-label="Nombre de la playlist"
              ref={playlistNameRef}
              className="playlist-composer__name"
              value={playlistName}
              onChange={event => setPlaylistName(event.target.value)}
              placeholder="Nombre de tu playlist"
              maxLength={150}
            />
            <button type="button" className="playlist-composer__name-mark" aria-label="Editar nombre de la playlist" onClick={() => playlistNameRef.current?.focus()}>
              <Pencil aria-hidden="true" />
            </button>
          </div>
          <p className="playlist-composer__summary">{routeTracks.length} canciones <span aria-hidden="true">·</span> {getDurationLabel(totalDuration)}</p>
        </div>

        <div className="playlist-composer__actions">
          <label className="playlist-composer__destination">
            <span className={destination === 'youtube' ? 'playlist-composer__youtube-mark' : 'playlist-composer__spotify-mark'}>{destination === 'youtube' ? <Play aria-hidden="true" /> : <Music2 aria-hidden="true" />}</span>
            <span><small>Destino de la playlist</small>
              <select aria-label="Destino de la playlist" value={destination} disabled={routeTracks.length > 0} onChange={event => setDestination(event.target.value as Destination)}>
                <option value="youtube">YouTube Music</option>
                <option value="spotify">Spotify</option>
              </select>
            </span>
            <ChevronDown aria-hidden="true" className="playlist-composer__chevron" />
          </label>
          <label className="playlist-composer__privacy">
            {isPublic ? <Globe2 aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}
            <span><small>Privacidad</small>
              <select aria-label="Privacidad de la playlist" value={isPublic ? 'public' : 'private'} onChange={event => setIsPublic(event.target.value === 'public')}>
                <option value="private">Privada</option>
                <option value="public">Pública</option>
              </select>
            </span>
            <ChevronDown aria-hidden="true" className="playlist-composer__chevron" />
          </label>
          <Button className="playlist-composer__create" onClick={handleCreate} disabled={!playlistName.trim() || !routeTracks.length || (destination === 'youtube' ? !accountConnected : !spotifyConnected) || isCreating} loading={isCreating}>
            Crear playlist <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </div>

      {error && <div className="playlist-composer__error" role="alert"><AlertCircle aria-hidden="true" />{error}</div>}

      <div className="playlist-composer__workspace">
        <section className="playlist-composer__search-panel" aria-labelledby="playlist-search-title">
          <div className="playlist-composer__panel-heading">
            <h2 id="playlist-search-title">Agregar canciones</h2>
            <p>Mezcla canciones de Spotify y YouTube Music; confirma cada versión en el destino.</p>
          </div>

          <div className="playlist-composer__source-tabs" role="tablist" aria-label="Origen de las canciones">
            <button type="button" role="tab" aria-selected={searchSource === 'catalog'} className={searchSource === 'catalog' ? 'is-active' : ''} onClick={() => { setSearchSource('catalog'); setMatchingTrack(null); setQuery(''); }}>
              Mi catálogo
            </button>
            <button type="button" role="tab" aria-selected={searchSource === 'spotify'} className={searchSource === 'spotify' ? 'is-active' : ''} onClick={() => { setSearchSource('spotify'); setMatchingTrack(null); setQuery(''); }}>
              Spotify
            </button>
            <button type="button" role="tab" aria-selected={searchSource === 'youtube'} className={searchSource === 'youtube' ? 'is-active' : ''} onClick={() => { setSearchSource('youtube'); setMatchingTrack(null); setQuery(''); }}>
              <span className="playlist-composer__youtube-tab-mark"><Play aria-hidden="true" /></span> YouTube Music
            </button>
          </div>

          {searchSource === 'catalog' ? (
            <>
              <label className="playlist-composer__search-field">
                <Search aria-hidden="true" />
                <input aria-label="Buscar en mi catálogo" placeholder="Buscar en mi catálogo" value={catalogSearch} onChange={event => setCatalogSearch(event.target.value)} />
                {catalogSearch && <button type="button" onClick={() => setCatalogSearch('')} aria-label="Limpiar búsqueda"><X aria-hidden="true" /></button>}
              </label>
              <div className="playlist-composer__results" aria-live="polite">
                {filteredCatalog.length ? filteredCatalog.map(track => (
                  <CatalogResult key={`${track.source}:${track.id}`} track={track} onAdd={() => addFromCatalog(track)} added={routeTracks.some(item => item.originalTrack?.id === track.id && item.originalTrack.source === track.source || item.targetId === track.id && item.destination === 'spotify')} />
                )) : (
                  <div className="playlist-composer__empty-results">
                    <Music2 aria-hidden="true" />
                    <p>{catalogTracks.length ? 'No encontramos canciones con ese nombre.' : 'Tu catálogo está vacío.'}</p>
                    <span>{catalogTracks.length ? 'Prueba con otro título o artista.' : 'Busca canciones en Spotify o YouTube Music.'}</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {matchingTrack && (
                <div className="playlist-composer__match-context">
                  <span>Versión de {matchingTrack.origin === 'youtube' ? 'YouTube Music' : matchingTrack.origin === 'spotify' ? 'Spotify' : 'mi catálogo'}</span><strong>{matchingTrack.title} · {matchingTrack.artist}</strong>
                  <button type="button" onClick={() => { setMatchingTrack(null); setQuery(''); setSearchSource('catalog'); }} aria-label="Cancelar emparejamiento"><X aria-hidden="true" /></button>
                </div>
              )}
              {searchSource === 'spotify' && !spotifyConnected ? (
                <div className="playlist-composer__empty-results">
                  <Music2 aria-hidden="true" />
                  <p>{spotifyConfigured ? 'Conecta Spotify para buscar canciones.' : 'Spotify aún no está configurado.'}</p>
                  <span>{spotifyConfigured ? 'La conexión también permite crear y guardar playlists.' : 'Añade VITE_SPOTIFY_CLIENT_ID a las variables de entorno y vuelve a compilar.'}</span>
                  {spotifyConfigured && <button type="button" className="playlist-composer__connect-inline" onClick={() => { void handleSpotifyConnect(); }}>Conectar Spotify</button>}
                </div>
              ) : (
              <>
              <label className="playlist-composer__search-field">
                <Search aria-hidden="true" />
                <input id={`${searchSource}-song-search`} aria-label={`Buscar en ${searchSource === 'youtube' ? 'YouTube Music' : 'Spotify'}`} placeholder={`Buscar canciones en ${searchSource === 'youtube' ? 'YouTube Music' : 'Spotify'}`} value={query} onChange={event => setQuery(event.target.value)} />
                {query && <button type="button" onClick={() => setQuery('')} aria-label="Limpiar búsqueda"><X aria-hidden="true" /></button>}
              </label>
              <div className="playlist-composer__results" aria-live="polite">
                {loadingTracks ? <p className="playlist-composer__loading">Buscando…</p> : searchSource === 'youtube' ? youtubeResults.length ? youtubeResults.map(track => (
                  <YouTubeResult key={track.videoId} track={track} onAdd={() => addFromYoutube(track)} matching={Boolean(matchingTrack) || destination === 'spotify'} />
                )) : <div className="playlist-composer__empty-results"><Youtube aria-hidden="true" /><p>{query ? 'No encontramos resultados.' : 'Busca una canción en YouTube Music.'}</p><span>{destination === 'spotify' ? 'Al elegir una canción, busca su versión en Spotify y confirma cuál quieres.' : 'Las canciones se añaden con su versión exacta de YouTube Music.'}</span></div> : spotifyResults.length ? spotifyResults.map(track => (
                  <SpotifyResult key={track.id} track={track} onAdd={() => addFromSpotify(track)} matching={Boolean(matchingTrack) || destination === 'youtube'} />
                )) : <div className="playlist-composer__empty-results"><Music2 aria-hidden="true" /><p>{query ? 'No encontramos resultados.' : 'Busca una canción en Spotify.'}</p><span>{destination === 'youtube' ? 'Al elegir una canción, busca su versión en YouTube Music y confirma cuál quieres.' : 'Las canciones se añaden con su versión exacta de Spotify.'}</span></div>}
              </div>
              </>
              )}
            </>
          )}
        </section>

        <section className="playlist-composer__route-panel" aria-labelledby="playlist-route-title">
          <div className="playlist-composer__route-heading">
            <div>
              <h2 id="playlist-route-title">Tu ruta de canciones</h2>
              <p>Destino: {destination === 'youtube' ? 'YouTube Music' : 'Spotify'}. Cambia el destino cuando la ruta esté vacía.</p>
            </div>
            <div className="playlist-composer__route-note" role="status" aria-live="polite">
              <HelpCircle aria-hidden="true" />
              {destination === 'spotify' ? (
                spotifyConnected ? <span>Spotify está conectado. Las canciones de YouTube Music se convierten buscando y confirmando su versión en Spotify.</span> : spotifyConfigured ? <><span>Conecta Spotify para crear la playlist y guardar canciones.</span><button type="button" onClick={() => { void handleSpotifyConnect(); }}>Conectar</button></> : <span>Spotify requiere VITE_SPOTIFY_CLIENT_ID configurado en el entorno de compilación.</span>
              ) : connectionCode ? (
                <>
                  <span>Usa este código en Google: <strong className="playlist-composer__user-code">{connectionCode}</strong></span>
                  <a href={verificationUrl} target="_blank" rel="noreferrer">Autorizar</a>
                  <button type="button" onClick={() => { void ytMusicService.disconnect(); setConnectionCode(''); setVerificationUrl(''); }}>Cancelar</button>
                </>
              ) : !loadingAccount && !youtubeApiAvailable ? (
                <span>La función /api/ytmusic no está disponible. Revisa el modo de desarrollo o el último despliegue.</span>
              ) : !loadingAccount && !youtubeConfigured ? (
                <span>YouTube Music necesita sus credenciales de Google en Vercel para habilitar la conexión.</span>
              ) : !loadingAccount && !accountConnected ? (
                <>
                  <span>Conecta tu cuenta para guardar la playlist.</span>
                  <button type="button" onClick={() => { void handleConnect(); }} disabled={startingConnection}>{startingConnection ? 'Conectando…' : 'Conectar'}</button>
                </>
              ) : (
                <span>Spotify se puede mezclar como origen; confirma qué versión de YouTube Music quieres añadir.</span>
              )}
            </div>
          </div>

          {routeTracks.length ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={routeTracks.map(track => track.id)} strategy={verticalListSortingStrategy}>
                <ol className="playlist-composer__route-list" aria-label="Orden de canciones de la playlist">
                  {routeTracks.map((track, index) => (
                    <SortableRouteTrack key={track.id} track={track} position={index + 1} onRemove={() => removeFromRoute(track.id)} />
                  ))}
                </ol>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="playlist-composer__route-empty">
              <span className="playlist-composer__empty-position" aria-label="Primera posición">1</span>
              <div><strong>La ruta empieza aquí</strong><p>Elige el destino y añade canciones desde Spotify o YouTube Music.</p></div>
            </div>
          )}

          <button
            type="button"
            className="playlist-composer__add-more"
            onClick={() => {
              setSearchSource(destination);
              window.requestAnimationFrame(() => document.getElementById(`${destination}-song-search`)?.focus());
            }}
          >
            <span className="playlist-composer__add-mark"><Plus aria-hidden="true" /></span>
            <div><strong>{routeTracks.length ? 'Agregar más canciones' : 'Buscar una canción'}</strong><p>{routeTracks.length ? 'Busca en cualquiera de los catálogos y súmalas a tu ruta.' : 'Empieza en Spotify, YouTube Music o tu catálogo.'}</p></div>
          </button>
          <label className="playlist-composer__description">
            <span>Descripción <small>Opcional</small></span>
            <input maxLength={5000} value={description} onChange={event => setDescription(event.target.value)} placeholder="¿Qué historia cuenta esta playlist?" />
          </label>
        </section>
      </div>
    </div>
  );
}

function CatalogResult({ track, onAdd, added }: { track: Track; onAdd: () => void; added: boolean }) {
  return (
    <article className="playlist-composer__catalog-result">
      <div className="playlist-composer__track-art">{track.albumArt ? <img src={track.albumArt} alt="" /> : <Music2 aria-hidden="true" />}</div>
      <div className="playlist-composer__catalog-copy">
        <strong title={track.title}>{track.title}</strong>
        <span title={track.artist}>{track.artist}</span>
        <small>{formatDuration(track.duration)} <i aria-hidden="true">·</i> {track.source === 'spotify' ? 'Spotify' : 'Mi catálogo'}</small>
      </div>
      <button className="playlist-composer__add-song" type="button" onClick={onAdd} disabled={added} aria-label={added ? `${track.title} ya está en la ruta` : `Añadir o buscar versión de ${track.title}`}>
        {added ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />}
      </button>
    </article>
  );
}

function SpotifyResult({ track, onAdd, matching }: { track: Track; onAdd: () => void; matching: boolean }) {
  return (
    <article className="playlist-composer__catalog-result">
      <div className="playlist-composer__track-art">{track.albumArt ? <img src={track.albumArt} alt="" /> : <Music2 aria-hidden="true" />}</div>
      <div className="playlist-composer__catalog-copy">
        <strong title={track.title}>{track.title}</strong>
        <span title={track.artist}>{track.artist}</span>
        <small>{formatDuration(track.duration)} <i aria-hidden="true">·</i> Spotify</small>
      </div>
      <button className="playlist-composer__add-song" type="button" onClick={onAdd} aria-label={matching ? `Confirmar versión de ${track.title}` : `Añadir ${track.title}`}>
        <Plus aria-hidden="true" />
      </button>
    </article>
  );
}

function YouTubeResult({ track, onAdd, matching }: { track: YouTubeMusicTrack; onAdd: () => void; matching: boolean }) {
  return (
    <article className="playlist-composer__catalog-result playlist-composer__youtube-result">
      <div className="playlist-composer__track-art">{track.thumbnail ? <img src={track.thumbnail} alt="" /> : <Youtube aria-hidden="true" />}</div>
      <div className="playlist-composer__catalog-copy">
        <strong title={track.title}>{track.title}</strong>
        <span title={track.artist}>{track.artist}</span>
        <small>{track.durationMs ? formatDuration(track.durationMs) : 'Duración variable'} <i aria-hidden="true">·</i> YouTube Music</small>
      </div>
      <button className="playlist-composer__add-song" type="button" onClick={onAdd} aria-label={matching ? `Confirmar versión de ${track.title}` : `Añadir ${track.title}`}>
        <Plus aria-hidden="true" />
      </button>
    </article>
  );
}

function SortableRouteTrack({ track, position, onRemove }: { track: RouteTrack; position: number; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: track.id });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`playlist-composer__route-row ${track.matched ? 'is-catalog-match' : ''} ${isDragging ? 'is-dragging' : ''}`}>
      <span className="playlist-composer__position" aria-label={`Posición ${position}`}>{position}</span>
      <div className="playlist-composer__track-art">{track.thumbnail ? <img src={track.thumbnail} alt="" /> : <Music2 aria-hidden="true" />}</div>
      <div className="playlist-composer__route-copy">
        <strong title={track.title}>{track.title}</strong>
        <span title={track.artist}>{track.artist}</span>
      </div>
      <span className="playlist-composer__route-duration">{track.durationMs ? formatDuration(track.durationMs) : '—'}</span>
      <div className="playlist-composer__route-status">
        {track.destination === 'youtube' ? <span className="playlist-composer__youtube-mini"><Youtube aria-hidden="true" /></span> : <Music2 aria-hidden="true" />}
        <span>{track.destination === 'youtube' ? 'YouTube Music' : 'Spotify'}</span>
        {track.matched && <small><Check aria-hidden="true" /> Versión confirmada</small>}
      </div>
      <span className="playlist-composer__list-badge">Desde {track.origin === 'youtube' ? 'YouTube Music' : track.origin === 'spotify' ? 'Spotify' : 'catálogo'}</span>
      <button type="button" className="playlist-composer__drag-handle" aria-label={`Reordenar ${track.title}`} {...attributes} {...listeners}><GripVertical aria-hidden="true" /></button>
      <button type="button" className="playlist-composer__remove-song" onClick={onRemove} aria-label={`Quitar ${track.title}`}><X aria-hidden="true" /></button>
    </li>
  );
}
