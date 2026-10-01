import * as musicMetadata from 'music-metadata';
import { set, get, del, keys } from 'idb-keyval';
import { generateId, formatDuration } from '@/lib/utils';
import type { Track, Album, Artist, Playlist } from '@/types';

const DB_STORES = {
  TRACKS: 'local-tracks',
  ALBUMS: 'local-albums',
  ARTISTS: 'local-artists',
  PLAYLISTS: 'local-playlists',
  FILES: 'local-files',
} as const;

interface StoredFile {
  id: string;
  name: string;
  type: string;
  size: number;
  lastModified: number;
  blob: Blob;
  trackId?: string;
}

async function extractMetadata(file: File): Promise<Partial<Track>> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const metadata = await musicMetadata.parseBuffer(
      new Uint8Array(arrayBuffer),
      { mimeType: file.type, size: file.size }
    );

    const common = metadata.common;
    const format = metadata.format;

    return {
      title: common.title || file.name.replace(/\.[^/.]+$/, ''),
      artist: common.artist || 'Unknown Artist',
      artistId: undefined,
      album: common.album || 'Unknown Album',
      albumId: undefined,
      albumArt: common.picture?.[0] ? URL.createObjectURL(new Blob([common.picture[0].data as unknown as BlobPart], { type: common.picture[0].format })) : undefined,
      duration: Math.round((format.duration || 0) * 1000),
      trackNumber: common.track?.no ?? undefined,
      discNumber: common.disk?.no ?? undefined,
      genre: common.genre?.[0],
      year: common.year,
      explicit: false,
    };
  } catch {
    return {
      title: file.name.replace(/\.[^/.]+$/, ''),
      artist: 'Unknown Artist',
      album: 'Unknown Album',
      duration: 0,
    };
  }
}

function createTrackFromMetadata(file: File, metadata: Partial<Track>): Track {
  return {
    id: generateId(),
    title: metadata.title || file.name,
    artist: metadata.artist || 'Unknown Artist',
    artistId: metadata.artistId,
    album: metadata.album || 'Unknown Album',
    albumId: metadata.albumId,
    albumArt: metadata.albumArt,
    duration: metadata.duration || 0,
    durationFormatted: formatDuration(metadata.duration || 0),
    source: 'local',
    sourceId: undefined,
    trackNumber: metadata.trackNumber,
    discNumber: metadata.discNumber,
    genre: metadata.genre,
    year: metadata.year,
    explicit: metadata.explicit || false,
    addedAt: Date.now(),
    playCount: 0,
  };
}

export const localFilesService = {
  async addFiles(files: FileList): Promise<Track[]> {
    const tracks: Track[] = [];

    for (const file of Array.from(files)) {
      try {
        const storedFile: StoredFile = {
          id: generateId(),
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: file.lastModified,
          blob: file,
        };

        const metadata = await extractMetadata(file);
        const track = createTrackFromMetadata(file, metadata);
        storedFile.trackId = track.id;

        await set(`${DB_STORES.FILES}-${storedFile.id}`, storedFile);
        await set(`${DB_STORES.TRACKS}-${track.id}`, track);

        await this.updateAlbumsAndArtists(track);

        tracks.push(track);
      } catch (error) {
        console.error(`Failed to process ${file.name}:`, error);
      }
    }

    return tracks;
  },

  async getAllTracks(): Promise<Track[]> {
    try {
      const allKeys = await keys();
      const trackKeys = allKeys.filter(k => typeof k === 'string' && k.startsWith(`${DB_STORES.TRACKS}-`));
      const tracks = await Promise.all(
        trackKeys.map(key => get(key as string))
      );
      return tracks.filter((t): t is Track => !!t).sort((a, b) => b.addedAt - a.addedAt);
    } catch {
      return [];
    }
  },

  async getTrack(trackId: string): Promise<Track | null> {
    const track = await get(`${DB_STORES.TRACKS}-${trackId}`);
    return track ?? null;
  },

  async updateTrack(track: Track): Promise<void> {
    await set(`${DB_STORES.TRACKS}-${track.id}`, track);
    await this.updateAlbumsAndArtists(track);
  },

  async deleteTrack(trackId: string): Promise<void> {
    const track = await this.getTrack(trackId);
    if (track) {
      await del(`${DB_STORES.TRACKS}-${trackId}`);
      const fileKeys = await keys();
      const fileKey = fileKeys.find(k => typeof k === 'string' && k.includes(trackId));
      if (fileKey) await del(fileKey as string);
      if (track.albumArt) URL.revokeObjectURL(track.albumArt);
    }
  },

  async getFileBlob(trackId: string): Promise<Blob | null> {
    const fileKeys = await keys();
    const fileKey = fileKeys.find(k => typeof k === 'string' && k.includes(trackId));
    if (fileKey) {
      const stored = await get<StoredFile>(fileKey as string);
      return stored?.blob || null;
    }
    return null;
  },

  async getFileUrl(trackId: string): Promise<string | null> {
    const blob = await this.getFileBlob(trackId);
    return blob ? URL.createObjectURL(blob) : null;
  },

  async updateAlbumsAndArtists(track: Track): Promise<void> {
    if (!track.album) return;

    const albumKey = `${DB_STORES.ALBUMS}-${track.album}-${track.artist}`;
    let album = await get<Album>(albumKey);

    if (!album) {
      album = {
        id: albumKey,
        name: track.album,
        artist: track.artist,
        artistId: track.artistId,
        coverArt: track.albumArt,
        totalTracks: 0,
        duration: 0,
        source: 'local',
        tracks: [],
        addedAt: Date.now(),
      };
    }

    const existingTrackIndex = album.tracks.findIndex(t => t.id === track.id);
    if (existingTrackIndex >= 0) {
      album.tracks[existingTrackIndex] = track;
    } else {
      album.tracks.push(track);
    }

    album.totalTracks = album.tracks.length;
    album.duration = album.tracks.reduce((sum, t) => sum + t.duration, 0);

    await set(albumKey, album);

    if (track.artist) {
      const artistKey = `${DB_STORES.ARTISTS}-${track.artist}`;
      let artist = await get<Artist>(artistKey);

      if (!artist) {
        artist = {
          id: artistKey,
          name: track.artist,
          image: track.albumArt,
          source: 'local',
          albums: [],
          topTracks: [],
        };
      }

      const albumExists = artist.albums.some(a => a.id === album.id);
      if (!albumExists) {
        artist.albums.push(album);
      }

      const trackExists = artist.topTracks.some(t => t.id === track.id);
      if (!trackExists) {
        artist.topTracks.unshift(track);
        artist.topTracks = artist.topTracks.slice(0, 50);
      }

      await set(artistKey, artist);
    }
  },

  async getAllAlbums(): Promise<Album[]> {
    try {
      const allKeys = await keys();
      const albumKeys = allKeys.filter(k => typeof k === 'string' && k.startsWith(`${DB_STORES.ALBUMS}-`));
      const albums = await Promise.all(
        albumKeys.map(key => get(key as string))
      );
      return albums.filter((a): a is Album => !!a).sort((a, b) => b.addedAt - a.addedAt);
    } catch {
      return [];
    }
  },

  async getAllArtists(): Promise<Artist[]> {
    try {
      const allKeys = await keys();
      const artistKeys = allKeys.filter(k => typeof k === 'string' && k.startsWith(`${DB_STORES.ARTISTS}-`));
      const artists = await Promise.all(
        artistKeys.map(key => get(key as string))
      );
      return artists.filter((a): a is Artist => !!a).sort((a, b) => b.topTracks.length - a.topTracks.length);
    } catch {
      return [];
    }
  },

  async getAllPlaylists(): Promise<Playlist[]> {
    try {
      const allKeys = await keys();
      const playlistKeys = allKeys.filter(k => typeof k === 'string' && k.startsWith(`${DB_STORES.PLAYLISTS}-`));
      const playlists = await Promise.all(
        playlistKeys.map(key => get(key as string))
      );
      return playlists.filter((p): p is Playlist => !!p).sort((a, b) => b.updatedAt - a.updatedAt);
    } catch {
      return [];
    }
  },

  async getPlaylist(playlistId: string): Promise<Playlist | null> {
    const playlist = await get(`${DB_STORES.PLAYLISTS}-${playlistId}`);
    return playlist ?? null;
  },

  async createPlaylist(input: { name: string; description?: string; tracks?: Track[] }): Promise<Playlist> {
    const playlist: Playlist = {
      id: generateId(),
      name: input.name,
      description: input.description,
      coverArt: input.tracks?.[0]?.albumArt,
      isPublic: false,
      collaborative: false,
      tracks: input.tracks || [],
      totalTracks: input.tracks?.length || 0,
      duration: input.tracks?.reduce((sum, t) => sum + t.duration, 0) || 0,
      source: 'local',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await set(`${DB_STORES.PLAYLISTS}-${playlist.id}`, playlist);
    return playlist;
  },

  async updatePlaylist(playlist: Playlist): Promise<void> {
    playlist.updatedAt = Date.now();
    playlist.totalTracks = playlist.tracks.length;
    playlist.duration = playlist.tracks.reduce((sum, t) => sum + t.duration, 0);
    playlist.coverArt = playlist.tracks[0]?.albumArt;
    await set(`${DB_STORES.PLAYLISTS}-${playlist.id}`, playlist);
  },

  async deletePlaylist(playlistId: string): Promise<void> {
    await del(`${DB_STORES.PLAYLISTS}-${playlistId}`);
  },

  async addTracksToPlaylist(playlistId: string, tracks: Track[]): Promise<void> {
    const playlist = await this.getPlaylist(playlistId);
    if (playlist) {
      const existingIds = new Set(playlist.tracks.map(t => t.id));
      const newTracks = tracks.filter(t => !existingIds.has(t.id));
      playlist.tracks.push(...newTracks);
      await this.updatePlaylist(playlist);
    }
  },

  async removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<void> {
    const playlist = await this.getPlaylist(playlistId);
    if (playlist) {
      playlist.tracks = playlist.tracks.filter(t => t.id !== trackId);
      await this.updatePlaylist(playlist);
    }
  },

  async reorderPlaylistTracks(playlistId: string, fromIndex: number, toIndex: number): Promise<void> {
    const playlist = await this.getPlaylist(playlistId);
    if (playlist) {
      const [removed] = playlist.tracks.splice(fromIndex, 1);
      playlist.tracks.splice(toIndex, 0, removed);
      await this.updatePlaylist(playlist);
    }
  },

  async getStats(): Promise<{
    totalTracks: number;
    totalAlbums: number;
    totalArtists: number;
    totalPlaylists: number;
    totalDuration: number;
    storageUsed: number;
  }> {
    const [tracks, albums, artists, playlists] = await Promise.all([
      this.getAllTracks(),
      this.getAllAlbums(),
      this.getAllArtists(),
      this.getAllPlaylists(),
    ]);

    let storageUsed = 0;
    const fileKeys = (await keys()).filter(k => typeof k === 'string' && k.startsWith(`${DB_STORES.FILES}-`));
    for (const key of fileKeys) {
      const file = await get<StoredFile>(key as string);
      if (file) storageUsed += file.size;
    }

    return {
      totalTracks: tracks.length,
      totalAlbums: albums.length,
      totalArtists: artists.length,
      totalPlaylists: playlists.length,
      totalDuration: tracks.reduce((sum, t) => sum + t.duration, 0),
      storageUsed,
    };
  },

  async clearAll(): Promise<void> {
    const allKeys = await keys();
    const localKeys = allKeys.filter(k =>
      typeof k === 'string' &&
      (k.startsWith(`${DB_STORES.TRACKS}-`) ||
        k.startsWith(`${DB_STORES.ALBUMS}-`) ||
        k.startsWith(`${DB_STORES.ARTISTS}-`) ||
        k.startsWith(`${DB_STORES.PLAYLISTS}-`) ||
        k.startsWith(`${DB_STORES.FILES}-`))
    );
    await Promise.all(localKeys.map(key => del(key as string)));
  },
};