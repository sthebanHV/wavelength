import { useCallback, useRef, useState } from 'react';
import { parseBlob } from 'music-metadata';

export interface TrackMetadata {
  title: string;
  artist: string;
  album: string;
  year?: number;
  genre?: string;
  duration: number;
  coverArt?: string;
  trackNumber?: number;
  totalTracks?: number;
}

export interface UploadedTrack {
  file: File;
  metadata: TrackMetadata;
  objectUrl: string;
  id: string;
}

interface UploadZoneProps {
  onUploadComplete: (track: UploadedTrack) => void;
}

export function UploadZone({ onUploadComplete }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<UploadedTrack | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateId = () => `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const extractMetadata = async (file: File): Promise<TrackMetadata> => {
    try {
      const metadata = await parseBlob(file);
      const common = metadata.common;

      let coverArt: string | undefined;
      if (common.picture && common.picture.length > 0) {
        const pic = common.picture[0];
        const blob = new Blob([Buffer.from(pic.data)], { type: pic.format });
        coverArt = URL.createObjectURL(blob);
      }

      return {
        title: common.title || file.name.replace(/\.[^/.]+$/, ''),
        artist: common.artist || 'Desconocido',
        album: common.album || 'Sin álbum',
        year: common.year,
        genre: common.genre?.[0],
        duration: Math.round(metadata.format.duration || 0),
        coverArt,
        trackNumber: common.track?.no ?? undefined,
        totalTracks: common.track?.of ?? undefined,
      };
    } catch {
      return {
        title: file.name.replace(/\.[^/.]+$/, ''),
        artist: 'Desconocido',
        album: 'Sin álbum',
        duration: 0,
      };
    }
  };

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('audio/')) {
        setError('El archivo debe ser de tipo audio');
        return;
      }

      setError(null);
      setIsProcessing(true);

      try {
        const metadata = await extractMetadata(file);
        const objectUrl = URL.createObjectURL(file);
        const track: UploadedTrack = {
          file,
          metadata,
          objectUrl,
          id: generateId(),
        };
        setPreview(track);
      } catch (err) {
        setError('Error al procesar el archivo');
        console.error(err);
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleSave = () => {
    if (preview) {
      onUploadComplete(preview);
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCancel = () => {
    if (preview?.objectUrl) {
      URL.revokeObjectURL(preview.objectUrl);
    }
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (preview) {
    return (
      <div className="rounded-3xl border border-rule bg-surface/80 p-5 animate-[fade-in_0.3s_ease-out]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Vista previa</h3>
          <button onClick={handleCancel} className="text-muted hover:text-text">
            ×
          </button>
        </div>

        <div className="flex gap-4">
          {preview.metadata.coverArt ? (
            <img
              src={preview.metadata.coverArt}
              alt={preview.metadata.title}
              className="w-32 h-32 rounded-xl object-cover"
            />
          ) : (
            <div className="w-32 h-32 rounded-xl bg-gradient-to-br from-accent/30 to-accent-2/30 flex items-center justify-center">
              <svg className="w-12 h-12 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728m5.353-16.364a9 9 0 010 12.728" />
              </svg>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h4 className="font-semibold truncate">{preview.metadata.title}</h4>
            <p className="text-sm text-muted">{preview.metadata.artist} · {preview.metadata.album}</p>
<div className="mt-2 flex items-center gap-2 text-xs text-muted">
              {preview.metadata.duration > 0 && (
                <span>{Math.floor(preview.metadata.duration / 60)}:{String(preview.metadata.duration % 60).padStart(2, '0')}</span>
              )}
              {preview.metadata.genre && <span>{preview.metadata.genre}</span>}
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <button
            onClick={handleSave}
            className="flex-1 rounded-xl bg-gradient-to-r from-accent to-accent-2 px-4 py-2 font-medium text-white shadow-lg shadow-accent/20"
            disabled={isProcessing}
          >
            Guardar en biblioteca
          </button>
          <button
            onClick={handleCancel}
            className="rounded-xl border border-rule px-4 py-2 text-sm text-muted hover:text-text hover:bg-fill"
            disabled={isProcessing}
          >
            Cancelar
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`relative rounded-3xl border-2 border-dashed transition-colors ${
        isDragging
          ? 'border-accent bg-accent/10'
          : 'border-rule hover:border-accent/50'
      } p-8 text-center`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        aria-label="Seleccionar archivo de audio"
      />

      <svg className="mx-auto h-16 w-16 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>

      <p className="mt-4 text-lg font-medium text-text">Arrastra tu canción aquí</p>
      <p className="mt-1 text-sm text-muted">o haz clic para seleccionar (MP3, WAV, FLAC, M4A)</p>

      <p className="mt-4 text-xs text-muted">Se leerán automáticamente los metadatos ID3 (título, artista, álbum, portada, etc.)</p>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      {isProcessing && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <span>Procesando...</span>
        </div>
      )}
    </div>
  );
}