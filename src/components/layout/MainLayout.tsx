'use client';

import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { PlayerBar } from './PlayerBar';
import { useFavoritesStore } from '@/stores/favoritesStore';

export function MainLayout() {
  const favoriteError = useFavoritesStore(state => state.error);

  return (
    <div className="min-h-screen bg-bg-primary flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 ml-64 md:ml-64">
        <Header />
        {favoriteError && <p className="mx-4 mt-4 rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error md:mx-6 lg:mx-8" role="alert">{favoriteError}</p>}
        <main className="flex-1 overflow-y-auto pt-16 pb-20 px-4 md:px-6 lg:px-8">
          <Outlet />
        </main>
        <PlayerBar />
      </div>
    </div>
  );
}