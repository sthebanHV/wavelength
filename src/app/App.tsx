import { useState } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { UploadPage } from '@/features/upload/UploadPage';

const quickLinks = ['Explorar', 'Biblioteca', 'Radio', 'Favoritos', 'Subir', 'Servicios'];

const featuredAlbums = [
  { title: 'Midnight Echo', artist: 'Luna Harbor', color: 'from-violet-500 to-cyan-400', duration: '43 min' },
  { title: 'Sunset Drive', artist: 'Aster Vale', color: 'from-amber-400 to-pink-500', duration: '38 min' },
  { title: 'Neon Bloom', artist: 'Echo Park', color: 'from-emerald-500 to-teal-400', duration: '52 min' },
]

const queue = [
  { title: 'Velvet Dreams', artist: 'Kite & Bloom', time: '3:42' },
  { title: 'City Lights', artist: 'Nova Hale', time: '4:08' },
  { title: 'Glass Horizon', artist: 'Solara', time: '2:56' },
]

const tracks = [
  { title: 'Pearl Avenue', artist: 'Nocturne', duration: '3:14', liked: true },
  { title: 'Afterglow', artist: 'Harbor Club', duration: '4:02', liked: false },
  { title: 'Static Hearts', artist: 'Mira Lane', duration: '3:48', liked: true },
  { title: 'Night Drive', artist: 'The Drift', duration: '5:11', liked: false },
]

type Tab = 'inicio' | 'biblioteca' | 'radio' | 'favoritos' | 'subir' | 'servicios';

function isTab(tab: Tab, value: Tab): boolean {
  return tab === value;
}

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('inicio');
  const currentTab = activeTab;

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 md:px-6 xl:px-8">
        <aside className="hidden w-64 shrink-0 rounded-3xl border border-rule bg-surface/80 p-5 backdrop-blur xl:block">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent-2 text-lg font-bold text-white">
              W
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted">Audio</p>
              <h1 className="text-xl font-semibold">Wavelength</h1>
            </div>
          </div>

          <nav className="space-y-2">
            {quickLinks.map((item, index) => {
              const tabValue = item.toLowerCase().replace(' ', '-') as Tab;
              return (
                <button
                  key={item}
                  onClick={() => setActiveTab(tabValue)}
                  className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm transition ${
                    isTab(currentTab, tabValue)
                      ? 'bg-white/6 text-text shadow-inner shadow-white/5'
                      : 'text-muted hover:bg-white/4 hover:text-text'
                  }`}
                >
                  <span>{item}</span>
                  {index === 0 ? <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] text-accent">Live</span> : null}
                </button>
              );
            })}
          </nav>

          <div className="mt-8 rounded-2xl border border-rule bg-surface-2 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Tu mix</p>
            <p className="mt-3 text-lg font-semibold">Late-night glow</p>
            <p className="mt-1 text-sm text-muted">18 canciones · 1h 12m</p>
          </div>
        </aside>

        <main className="flex-1 space-y-6">
          {currentTab === 'subir' && <UploadPage />}
          {currentTab === 'inicio' && (
            <>
              <header className="rounded-3xl border border-rule bg-surface/80 p-4 backdrop-blur">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-muted">
                      {isTab(currentTab, 'subir') ? 'Subir' : isTab(currentTab, 'biblioteca') ? 'Biblioteca' : 'Inicio'}
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold md:text-3xl">
                      {isTab(currentTab, 'subir') ? 'Subir música' : isTab(currentTab, 'biblioteca') ? 'Tu biblioteca' : 'Explorar'}
                    </h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="rounded-full border border-rule px-3 py-2 text-sm text-muted hover:text-text">Buscar</button>
                    <button className="rounded-full bg-gradient-to-r from-accent to-accent-2 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-accent/20">
                      Reproducir mix
                    </button>
                    <ThemeToggle />
                  </div>
                </div>
              </header>

              <section className="grid gap-4 lg:grid-cols-[1.5fr_0.9fr]">
                <div className="overflow-hidden rounded-3xl border border-rule bg-gradient-to-br from-accent/20 via-surface to-surface-2 p-5">
                  <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-muted">Destacado</p>
                      <h3 className="mt-2 text-3xl font-semibold">Night Bloom</h3>
                      <p className="mt-2 max-w-md text-sm text-muted">
                        Un viaje lento y brillante entre synthwave, dream pop y ritmos de ciudad.
                      </p>
                      <div className="mt-5 flex items-center gap-3">
                        <button className="rounded-full bg-white px-4 py-2 font-medium text-surface">Play</button>
                        <button className="rounded-full border border-rule px-4 py-2 text-sm text-text">Guardar</button>
                      </div>
                    </div>
                    <div className="relative flex h-44 w-44 items-center justify-center rounded-[28px] bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 shadow-2xl shadow-violet-900/30">
                      <div className="absolute inset-3 rounded-[24px] border border-white/30 bg-black/10" />
                      <div className="relative flex gap-1">
                        {[18, 26, 14, 30, 22, 26, 18].map((bar, index) => (
                          <span
                            key={bar + index}
                            className="inline-block w-1.5 rounded-full bg-white/90 animate-[eq-bar_1.2s_ease-in-out_infinite]"
                            style={{ height: `${bar}px`, animationDelay: `${index * 120}ms` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-rule bg-surface/80 p-5">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted">Ritmo</p>
                  <div className="mt-4 space-y-4">
                    {[
                      ['Escuchado', '74%'],
                      ['Géneros', '7'],
                      ['Seguidores', '18.4k'],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between rounded-2xl border border-rule bg-surface-2 px-3 py-2">
                        <span className="text-sm text-muted">{label}</span>
                        <span className="font-semibold text-text">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-semibold">Para ti</h3>
                  <button className="text-sm text-accent">Ver todo</button>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {featuredAlbums.map((album) => (
                    <article key={album.title} className="rounded-3xl border border-rule bg-surface/80 p-3">
                      <div className={`mb-4 flex h-40 items-center justify-center rounded-2xl bg-gradient-to-br ${album.color}`}>
                        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/40 bg-black/10 text-xl text-white">
                          ♪
                        </div>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-lg font-semibold">{album.title}</h4>
                          <p className="text-sm text-muted">{album.artist}</p>
                        </div>
                        <span className="text-xs text-muted">{album.duration}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-semibold">Canciones recomendadas</h3>
                  <button className="text-sm text-accent">Ordenar</button>
                </div>

                <div className="overflow-hidden rounded-3xl border border-rule bg-surface/80">
                  {tracks.map((track) => (
                    <div
                      key={track.title}
                      className="flex items-center gap-4 border-b border-rule px-4 py-3 last:border-b-0"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent/30 to-accent-2/30 text-sm font-semibold text-text">
                        {track.title.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{track.title}</p>
                        <p className="text-sm text-muted">{track.artist}</p>
                      </div>
                      <button className="text-base text-muted" aria-label={`Favorito para ${track.title}`}>
                        {track.liked ? '♥' : '♡'}
                      </button>
                      <span className="w-10 text-right text-sm text-muted">{track.duration}</span>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </main>

        <aside className="hidden w-[320px] shrink-0 xl:block">
          <div className="rounded-3xl border border-rule bg-surface/80 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.24em] text-muted">Reproduciendo ahora</p>
              <button className="text-sm text-accent">Abrir</button>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 p-4 text-white">
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-full bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em]">Live</span>
                <span className="text-xs text-white/80">4:18</span>
              </div>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xl font-semibold">Velvet Dreams</p>
                  <p className="text-sm text-white/80">Kite & Bloom</p>
                </div>
                <div className="flex gap-1">
                  {[18, 22, 32, 28, 34].map((height, index) => (
                    <span
                      key={height + index}
                      className="inline-block w-1.5 rounded-full bg-white/90"
                      style={{ height: `${height}px` }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center gap-3 text-xl text-muted">
              <button aria-label="Anterior">⏮</button>
              <button className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-surface" aria-label="Reproducir o pausar">⏸</button>
              <button aria-label="Siguiente">⏭</button>
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-muted">
                <span>Cola</span>
                <span>3</span>
              </div>
              <div className="space-y-2">
                {queue.map((song) => (
                  <div key={song.title} className="flex items-center justify-between rounded-2xl border border-rule bg-surface-2 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{song.title}</p>
                      <p className="text-xs text-muted">{song.artist}</p>
                    </div>
                    <span className="text-xs text-muted">{song.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}