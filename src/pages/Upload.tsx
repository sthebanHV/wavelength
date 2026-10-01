'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Upload as UploadIcon,
  Check,
  AlertCircle,
  Music,
  Loader2,
  Trash2,
  MoreHorizontal,
  FolderOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { formatDuration, formatBytes } from '@/lib/utils';
import { localFilesService } from '@/services/localFiles';
import { cn } from '@/lib/utils';
import type { Track } from '@/types';

interface UploadFile {
  id: string;
  file: File;
  track: Track | null;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
}

export function Upload() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showCompleted, setShowCompleted] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [libraryTracks, setLibraryTracks] = useState<Track[]>([]);

  useEffect(() => {
    loadLibrary();
  }, []);

  const loadLibrary = async () => {
    try {
      const tracks = await localFilesService.getAllTracks();
      setLibraryTracks(tracks);
    } catch (error) {
      console.error('Error loading library:', error);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const addFiles = (newFiles: File[]) => {
    const audioFiles = newFiles.filter(f => f.type.startsWith('audio/'));
    const nonAudioFiles = newFiles.filter(f => !f.type.startsWith('audio/'));

    if (nonAudioFiles.length > 0) {
      console.warn('Archivos no de audio ignorados:', nonAudioFiles.map(f => f.name));
    }

    const uploadFiles: UploadFile[] = audioFiles.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      track: null,
      status: 'pending',
      progress: 0,
    }));

    setFiles(prev => [...prev, ...uploadFiles]);

    uploadFiles.forEach(uploadFile => {
      processFile(uploadFile);
    });
  };

  const processFile = async (uploadFile: UploadFile) => {
    setFiles(prev => prev.map(f => f.id === uploadFile.id ? { ...f, status: 'processing' as const } : f));

    try {
      const track = await localFilesService.addFiles(new DataTransfer().files);
      const addedTrack = track[0];

      setFiles(prev => prev.map(f =>
        f.id === uploadFile.id
          ? { ...f, status: 'completed' as const, progress: 100, track: addedTrack }
          : f
      ));

      setLibraryTracks(prev => [addedTrack, ...prev]);
    } catch (error) {
      console.error('Error processing file:', error);
      setFiles(prev => prev.map(f =>
        f.id === uploadFile.id
          ? { ...f, status: 'error' as const, error: error instanceof Error ? error.message : 'Error desconocido' }
          : f
      ));
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const clearCompleted = () => {
    setFiles(prev => prev.filter(f => f.status !== 'completed'));
  };

  const retryFile = (uploadFile: UploadFile) => {
    setFiles(prev => prev.map(f =>
      f.id === uploadFile.id
        ? { ...f, status: 'pending' as const, progress: 0, error: undefined }
        : f
    ));
    processFile(uploadFile);
  };

  const pendingCount = files.filter(f => f.status === 'pending' || f.status === 'processing').length;
  const completedCount = files.filter(f => f.status === 'completed').length;
  const errorCount = files.filter(f => f.status === 'error').length;

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Subir música</h1>
        <p className="text-sm text-text-muted">Arrastra y suelta archivos de audio o selecciónalos</p>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <Card className={cn('border-2 border-dashed transition-colors', isDragging && 'border-accent bg-accent/5')}>
          <CardContent
            className="p-12 md:p-16"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="text-center">
              <div className={cn(
                'mx-auto mb-6 w-16 h-16 rounded-2xl flex items-center justify-center transition-colors',
                isDragging ? 'bg-accent/20 text-accent' : 'bg-bg-tertiary text-text-muted'
              )}>
                <UploadIcon className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Arrastra tus archivos aquí</h3>
              <p className="text-text-muted mb-6">
                O haz clic para seleccionar archivos
                <span className="mx-2">·</span>
                <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <FolderOpen className="h-4 w-4 mr-1" />
                  Seleccionar
                </Button>
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <p className="text-xs text-text-muted mt-4">
                Formatos soportados: MP3, WAV, FLAC, OGG, M4A, AAC
                <span className="mx-2">·</span>
                Máx. 500MB por archivo
              </p>
            </div>
          </CardContent>
        </Card>

        {files.length > 0 && (
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold">Archivos ({files.length})</h2>
                <div className="flex items-center gap-2">
                  {pendingCount > 0 && <Badge variant="accent">{pendingCount} pendientes</Badge>}
                  {completedCount > 0 && <Badge variant="success">{completedCount} completados</Badge>}
                  {errorCount > 0 && <Badge variant="error">{errorCount} errores</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showCompleted}
                    onChange={(e) => setShowCompleted(e.target.checked)}
                    className="rounded border-border-default text-accent focus:ring-accent"
                  />
                  Mostrar completados
                </label>
                {completedCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearCompleted}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Limpiar completados
                  </Button>
                )}
              </div>
            </div>

            <ScrollArea className="flex-1 overflow-y-auto">
              <div className="space-y-3">
                {files
                  .filter(f => showCompleted || f.status !== 'completed')
                  .map((uploadFile) => (
                    <UploadFileItem
                      key={uploadFile.id}
                      file={uploadFile}
                      onRemove={removeFile}
                      onRetry={retryFile}
                    />
                  ))}
              </div>
              {files.length > 0 && files.every(f => f.status === 'completed') && !showCompleted && (
                <div className="text-center py-12 text-text-muted">
                  <Check className="h-12 w-12 mx-auto mb-4 text-success" />
                  <h3 className="font-medium mb-1">Todos los archivos subidos</h3>
                  <p className="text-sm">Activa "Mostrar completados" para verlos</p>
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {files.length === 0 && libraryTracks.length > 0 && (
          <Card variant="hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="h-5 w-5" />
                Tu biblioteca local
              </CardTitle>
              <CardDescription>{libraryTracks.length} canciones subidas</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-64">
                <div className="space-y-2">
                  {libraryTracks.slice(0, 10).map((track) => (
                    <div key={track.id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-bg-hover transition-colors">
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
                      <span className="text-xs text-text-muted">{track.durationFormatted || formatDuration(track.duration)}</span>
                      <Badge variant="outline" size="sm" className="text-[10px]">Local</Badge>
                    </div>
                  ))}
                  {libraryTracks.length > 10 && (
                    <p className="text-center text-sm text-text-muted mt-2">
                      Y {libraryTracks.length - 10} más...
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function UploadFileItem({
  file,
  onRemove,
  onRetry,
}: {
  file: {
    id: string;
    file: File;
    track: Track | null;
    status: 'pending' | 'processing' | 'completed' | 'error';
    progress: number;
    error?: string;
  };
  onRemove: (id: string) => void;
  onRetry: (file: UploadFile) => void;
}) {
  return (
    <Card className="border-border-default">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-bg-tertiary flex items-center justify-center flex-shrink-0">
            {file.track?.albumArt ? (
              <img src={file.track.albumArt} alt={file.track.title} className="w-full h-full object-cover rounded-lg" />
            ) : (
              <Music className="h-6 w-6 text-text-muted" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium truncate">{file.track?.title || file.file.name}</p>
              {getStatusIcon(file.status)}
            </div>
            <p className="text-sm text-text-muted truncate">
              {file.track?.artist || `Tipo: ${file.file.type || 'Desconocido'}`}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-text-muted">
                {formatBytes(file.file.size)}
                {file.track && ` • ${file.track.durationFormatted || formatDuration(file.track.duration)}`}
              </span>
              <Badge
                variant={
                  file.status === 'completed' ? 'success' :
                  file.status === 'error' ? 'error' :
                  file.status === 'processing' ? 'accent' : 'outline'
                }
                size="sm"
              >
                {file.status === 'pending' ? 'Pendiente' :
                  file.status === 'processing' ? 'Procesando' :
                  file.status === 'completed' ? 'Completado' : 'Error'}
              </Badge>
            </div>
          </div>

          {(file.status === 'processing' || file.status === 'pending') && (
            <div className="w-32">
              <Progress value={file.progress} className="h-2" />
              <span className="text-xs text-text-muted">{file.progress}%</span>
            </div>
          )}

          {file.status === 'error' && (
            <div className="flex-1 text-right">
              <p className="text-sm text-error mb-2">{file.error}</p>
              <Button variant="ghost" size="sm" onClick={() => onRetry(file)}>
                <Loader2 className="h-3 w-3 mr-1" />
                Reintentar
              </Button>
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-text-secondary hover:text-text-primary">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{file.track?.title || file.file.name}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {file.track && (
                <>
                  <DropdownMenuItem>Reproducir</DropdownMenuItem>
                  <DropdownMenuItem>Añadir a la cola</DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {file.status === 'error' && (
                <DropdownMenuItem onClick={() => onRetry(file)}>
                  <Loader2 className="h-4 w-4 mr-2" />
                  Reintentar
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-error" onClick={() => onRemove(file.id)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

function getStatusIcon(status: 'pending' | 'processing' | 'completed' | 'error') {
  switch (status) {
    case 'pending':
      return <Loader2 className="h-4 w-4 animate-spin text-text-muted" />;
    case 'processing':
      return <Loader2 className="h-4 w-4 animate-spin text-accent" />;
    case 'completed':
      return <Check className="h-4 w-4 text-success" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-error" />;
    default:
      return null;
  }
}

