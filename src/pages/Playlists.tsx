'use client';

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  ListMusic,
  Heart,
  MoreHorizontal,
  Play,
  Shuffle,
  Trash2,
  Edit,
  Share2,
  Download,
  Clock,
  Calendar,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SkeletonPlaylist } from '@/components/ui/skeleton';
import { formatDuration, formatDurationLong, formatNumber } from '@/lib/utils';
import { useLibraryStore } from '@/stores/libraryStore';
import { localFilesService } from '@/services/localFiles';
import { spotifyService } from '@/services/spotify';
import { cn } from '@/lib/utils';
import type { Playlist, Track } from '@/types';

export function Playlists() {
  const { playlists, setPlaylists, addPlaylist, updatePlaylist, removePlaylist } = useLibraryStore();
  const [localPlaylists, setLocalPlaylists] = useState<Playlist[]>([]);
  const [spotifyPlaylists, setSpotifyPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'tracks' | 'duration'>('recent');
  const [filterSource, setFilterSource] = useState<'all' | 'local' | 'spotify'>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('');
  const [newPlaylistPublic, setNewPlaylistPublic] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    setLoading(true);
    try {
      const [local, spotify] = await Promise.all([
        localFilesService.getAllPlaylists(),
        spotifyService.isAuthenticated() ? spotifyService.getUserPlaylists(50) : Promise.resolve([]),
      ]);
      setLocalPlaylists(local);
      setSpotifyPlaylists(spotify);
      setPlaylists([...local, ...spotify]);
    } catch (error) {
      console.error('Error loading playlists:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;

    try {
      let playlist: Playlist;
      if (newPlaylistPublic && spotifyService.isAuthenticated()) {
        playlist = await spotifyService.createPlaylist({
          name: newPlaylistName,
          description: newPlaylistDescription,
          isPublic: newPlaylistPublic,
        });
        setSpotifyPlaylists(prev => [playlist, ...prev]);
      } else {
        playlist = await localFilesService.createPlaylist({
          name: newPlaylistName,
          description: newPlaylistDescription,
        });
        setLocalPlaylists(prev => [playlist, ...prev]);
      }
      setPlaylists(prev => [playlist, ...prev]);
      setShowCreateDialog(false);
      setNewPlaylistName('');
      setNewPlaylistDescription('');
      setNewPlaylistPublic(false);
    } catch (error) {
      console.error('Error creating playlist:', error);
    }
  };

  const handleUpdatePlaylist = async () => {
    if (!editingPlaylist || !editName.trim()) return;

    try {
      const updated = { ...editingPlaylist, name: editName, description: editDescription };
      if (editingPlaylist.source === 'spotify') {
        // Note: Spotify API doesn't support renaming directly, would need different endpoint
      } else {
        await localFilesService.updatePlaylist(updated);
        setLocalPlaylists(prev => prev.map(p => p.id === editingPlaylist.id ? updated : p));
      }
      setPlaylists(prev => prev.map(p => p.id === editingPlaylist.id ? updated : p));
      setEditingPlaylist(null);
      setEditName('');
      setEditDescription('');
    } catch (error) {
      console.error('Error updating playlist:', error);
    }
  };

  const handleDeletePlaylist = async (playlist: Playlist) => {
    if (!confirm(`¿Eliminar "${playlist.name}"?`)) return;

    try {
      if (playlist.source === 'spotify') {
        // Spotify requires different endpoint
      } else {
        await localFilesService.deletePlaylist(playlist.id);
        setLocalPlaylists(prev => prev.filter(p => p.id !== playlist.id));
      }
      setPlaylists(prev => prev.filter(p => p.id !== playlist.id));
    } catch (error) {
      console.error('Error deleting playlist:', error);
    }
  };

  const allPlaylists = [...localPlaylists, ...spotifyPlaylists];

  const filteredPlaylists = allPlaylists
    .filter(p => filterSource === 'all' || p.source === filterSource)
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'tracks':
          return b.totalTracks - a.totalTracks;
        case 'duration':
          return b.duration - a.duration;
        case 'recent':
        default:
          return b.updatedAt - a.updatedAt;
      }
    });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Listas de reproducción</h1>
            <p className="text-sm text-text-muted">Tus colecciones musicales</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => <SkeletonPlaylist key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Listas de reproducción</h1>
          <p className="text-sm text-text-muted">{filteredPlaylists.length} listas</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button variant="primary" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Crear lista
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear nueva lista</DialogTitle>
                <DialogDescription>Dale un nombre y descripción a tu lista de reproducción</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Input
                  label="Nombre de la lista"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="Mi lista increíble"
                  autoFocus
                />
                <Input
                  label="Descripción (opcional)"
                  value={newPlaylistDescription}
                  onChange={(e) => setNewPlaylistDescription(e.target.value)}
                  placeholder="Describe tu lista..."
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={newPlaylistPublic}
                    onChange={(e) => setNewPlaylistPublic(e.target.checked)}
                    className="rounded border-border-default text-accent focus:ring-accent"
                  />
                  <span>Hacer pública (Spotify)</span>
                </label>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setShowCreateDialog(false)}>Cancelar</Button>
                <Button onClick={handleCreatePlaylist} disabled={!newPlaylistName.trim()}>
                  Crear lista
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="search"
            placeholder="Filtrar listas..."
            className="w-full pl-10 pr-4 py-2 bg-bg-tertiary border border-border-default rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            onChange={(e) => {
              // Filter handled by search in Library page
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterSource} onValueChange={(value) => setFilterSource(value as 'all' | 'local' | 'spotify')}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="local">Local</SelectItem>
              <SelectItem value="spotify">Spotify</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(value: 'recent' | 'name' | 'tracks' | 'duration') => setSortBy(value)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recientes</SelectItem>
              <SelectItem value="name">Nombre (A-Z)</SelectItem>
              <SelectItem value="tracks">Más canciones</SelectItem>
              <SelectItem value="duration">Más duración</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            className={viewMode === 'grid' ? 'text-accent' : ''}
            onClick={() => setViewMode('grid')}
            aria-label="Vista en cuadrícula"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={viewMode === 'list' ? 'text-accent' : ''}
            onClick={() => setViewMode('list')}
            aria-label="Vista en lista"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </Button>
        </div>
      </div>

      {filteredPlaylists.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-text-muted">
          <ListMusic className="h-24 w-24 mb-6 text-text-muted/30" />
          <h2 className="text-xl font-medium mb-2">No hay listas de reproducción</h2>
          <p className="text-sm mb-6">Crea tu primera lista o importa desde Spotify</p>
          <Button variant="primary" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Crear mi primera lista
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 p-1">
            {filteredPlaylists.map((playlist) => (
              <PlaylistCard
                key={playlist.id}
                playlist={playlist}
                onEdit={setEditingPlaylist}
                onDelete={handleDeletePlaylist}
                editName={editName}
                setEditName={setEditName}
                editDescription={editDescription}
                setEditDescription={setEditDescription}
                editingPlaylist={editingPlaylist}
                setEditingPlaylist={setEditingPlaylist}
              />
            ))}
          </div>
        </ScrollArea>
      ) : (
        <ScrollArea className="flex-1 overflow-y-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border-default">
                <th className="pb-3 pl-4">LISTA</th>
                <th className="pb-3 hidden md:table-cell">CANCIONES</th>
                <th className="pb-3 hidden lg:table-cell">DURACIÓN</th>
                <th className="pb-3 hidden xl:table-cell">CREADA</th>
                <th className="pb-3 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {filteredPlaylists.map((playlist) => (
                <PlaylistRow
                  key={playlist.id}
                  playlist={playlist}
                  onEdit={setEditingPlaylist}
                  onDelete={handleDeletePlaylist}
                  editingPlaylist={editingPlaylist}
                  setEditingPlaylist={setEditingPlaylist}
                  editName={editName}
                  setEditName={setEditName}
                  editDescription={editDescription}
                  setEditDescription={setEditDescription}
                />
              ))}
            </tbody>
          </table>
        </ScrollArea>
      )}
    </div>
  );
}

function PlaylistCard({
  playlist,
  onEdit,
  onDelete,
  editingPlaylist,
  setEditingPlaylist,
  editName,
  setEditName,
  editDescription,
  setEditDescription,
}: {
  playlist: Playlist;
  onEdit: (p: Playlist) => void;
  onDelete: (p: Playlist) => void;
  editingPlaylist: Playlist | null;
  setEditingPlaylist: (p: Playlist | null) => void;
  editName: string;
  setEditName: (name: string) => void;
  editDescription: string;
  setEditDescription: (desc: string) => void;
}) {
  const isEditing = editingPlaylist?.id === playlist.id;

  return (
    <div className="group relative bg-surface border border-border-default rounded-xl overflow-hidden hover:border-border-strong hover:shadow-lg transition-all">
      <div className="relative aspect-square overflow-hidden bg-bg-tertiary">
        {playlist.coverArt ? (
          <img src={playlist.coverArt} alt={playlist.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/30 to-accent/10">
            <ListMusic className="h-16 w-16 text-accent/50" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
          <Button variant="primary" size="icon" className="opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all">
            <Play className="h-5 w-5" />
          </Button>
        </div>
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Badge variant={playlist.source === 'spotify' ? 'accent' : 'outline'} size="sm" className="text-xs">
            {playlist.source === 'spotify' ? 'Spotify' : 'Local'}
          </Badge>
        </div>
      </div>
      <div className="p-4 space-y-2">
        {isEditing ? (
          <div className="space-y-2">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 bg-bg-tertiary border border-accent rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent text-sm"
              autoFocus
            />
            <input
              type="text"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border-default rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent text-sm"
              placeholder="Descripción"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => { onEdit(playlist); setEditingPlaylist(null); }}>Guardar</Button>
              <Button size="sm" variant="ghost" onClick={() => { onEdit(playlist); setEditingPlaylist(null); }}>Cancelar</Button>
            </div>
          </div>
        ) : (
          <>
            <h3 className="font-medium truncate">{playlist.name}</h3>
            <p className="text-sm text-text-muted truncate">{playlist.owner || 'Tú'}</p>
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>{playlist.totalTracks} canciones • {formatDurationLong(playlist.duration)}</span>
              <Badge variant="outline" size="sm" className="text-[10px]">
                {playlist.source === 'spotify' ? 'Spotify' : 'Local'}
              </Badge>
            </div>
          </>
        )}
        {!isEditing && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Más opciones">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{playlist.name}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Reproducir</DropdownMenuItem>
              <DropdownMenuItem>Añadir a la cola</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEdit(playlist)}>Editar</DropdownMenuItem>
              <DropdownMenuItem className="text-error" onClick={() => onDelete(playlist)}>Eliminar</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

function PlaylistRow({
  playlist,
  onEdit,
  onDelete,
  editingPlaylist,
  setEditingPlaylist,
  editName,
  setEditName,
  editDescription,
  setEditDescription,
}: {
  playlist: Playlist;
  onEdit: (p: Playlist) => void;
  onDelete: (p: Playlist) => void;
  editingPlaylist: Playlist | null;
  setEditingPlaylist: (p: Playlist | null) => void;
  editName: string;
  setEditName: (name: string) => void;
  editDescription: string;
  setEditDescription: (desc: string) => void;
}) {
  const isEditing = editingPlaylist?.id === playlist.id;

  return (
    <tr className="border-b border-border-default/50 hover:bg-bg-hover transition-colors">
      <td className="py-3 pl-4">
        <div className="flex items-center gap-3 min-w-0">
          {playlist.coverArt ? (
            <img src={playlist.coverArt} alt={playlist.name} className="h-10 w-10 rounded-lg object-cover" />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center">
              <ListMusic className="h-5 w-5 text-accent/50" />
            </div>
          )}
          <div className="min-w-0">
            {isEditing ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="px-2 py-1 bg-bg-tertiary border border-accent rounded text-text-primary focus:outline-none focus:ring-2 focus:ring-accent text-sm font-medium"
                autoFocus
              />
            ) : (
              <p className="font-medium truncate">{playlist.name}</p>
            )}
            {!isEditing && <p className="text-sm text-text-muted truncate">{playlist.owner || 'Tú'}</p>}
          </div>
        </div>
      </td>
      <td className="py-3 hidden md:table-cell text-sm text-text-muted">{playlist.totalTracks}</td>
      <td className="py-3 hidden lg:table-cell text-sm text-text-muted">{formatDurationLong(playlist.duration)}</td>
      <td className="py-3 hidden xl:table-cell text-sm text-text-muted">
        {new Date(playlist.createdAt).toLocaleDateString()}
      </td>
      <td className="py-3 w-12 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-text-secondary hover:text-text-primary">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Reproducir</DropdownMenuItem>
            <DropdownMenuItem>Añadir a la cola</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onEdit(playlist)}>Editar</DropdownMenuItem>
            <DropdownMenuItem className="text-error" onClick={() => onDelete(playlist)}>Eliminar</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}