'use client';

import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { PlayerBar } from './PlayerBar';
import { useFavoritesStore } from '@/stores/favoritesStore';

export function MainLayout() {
  const favoriteError = useFavoritesStore(state => state.error);
  const location = useLocation();
  const isNowPlaying = location.pathname === '/now-playing';
  const isPlaylistComposer = location.pathname === '/playlists/new';

  return (
    <div className={`wavelength-shell flex min-h-screen bg-bg-primary ${isPlaylistComposer ? 'playlist-composer-world' : ''}`}>
      <Sidebar />
      <div className={`wavelength-content flex-1 flex flex-col min-w-0 ${isPlaylistComposer ? '' : 'ml-64 md:ml-64'}`}>
        <Header />
        {favoriteError && <p className="mx-4 mt-4 rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error md:mx-6 lg:mx-8" role="alert">{favoriteError}</p>}
        <main className={isNowPlaying
          ? 'flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_50%_0%,rgba(112,25,156,0.12),transparent_48%)] px-4 pb-4 pt-16 md:px-6 lg:px-8'
          : isPlaylistComposer
            ? 'playlist-composer-main flex-1 overflow-y-auto px-4 pb-24 pt-16'
            : 'flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_80%_0%,rgba(112,25,156,0.08),transparent_42%)] px-4 pb-20 pt-16 md:px-6 lg:px-8'}
        >
          <Outlet />
        </main>
        {!isNowPlaying && <PlayerBar />}
      </div>
    </div>
  );
}
