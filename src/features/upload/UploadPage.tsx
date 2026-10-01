import { useState } from 'react';
import { UploadZone, type UploadedTrack } from '@/components/UploadZone';

export function UploadPage() {
  const [uploadedTracks, setUploadedTracks] = useState<UploadedTrack[]>([]);

  const handleUploadComplete = (track: UploadedTrack) => {
    setUploadedTracks((prev) => [...prev, track]);
  };

  const handleRemove = (id: string) => {
    setUploadedTracks((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Subir música</h1>
          <p className="text-sm text-muted">Arrastra y suelta tus archivos de audio o haz clic para seleccionar</p>
        </div>
      </div>

      <UploadZone onUploadComplete={handleUploadComplete} />

      {uploadedTracks.length > 0 && (
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Tus canciones subidas ({uploadedTracks.length})</h2>
          </div>
          <div className="mt-4 overflow-hidden rounded-3xl border border-rule bg-surface/80">
            {uploadedTracks.map((track) => (
              <div
                key={track.id}
                className="flex items-center gap-4 border-b border-rule px-4 py-3 last:border-b-0"
              >
                {track.metadata.coverArt ? (
                  <img
                    src={track.metadata.coverArt}
                    alt={track.metadata.title}
                    className="h-12 w-12 rounded-xl object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-accent/30 to-accent-2/30 flex items-center justify-center">
                    <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728m5.353-16.364a9 9 0 010 12.728" />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{track.metadata.title}</p>
                  <p className="text-sm text-muted">{track.metadata.artist} · {track.metadata.album}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                    {track.metadata.duration > 0 && (
                      <span>{Math.floor(track.metadata.duration / 60)}:{String(track.metadata.duration % 60).padStart(2, '0')}</span>
                    )}
                    {track.metadata.genre && <span>{track.metadata.genre}</span>}
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(track.id)}
                  className="text-muted hover:text-red-400 transition"
                  aria-label="Eliminar"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v12m-6 0h12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}