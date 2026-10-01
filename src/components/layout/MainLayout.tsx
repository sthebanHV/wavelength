'use client';

import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { PlayerBar } from './PlayerBar';

export function MainLayout() {
  return (
    <div className="min-h-screen bg-bg-primary flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 ml-64 md:ml-64">
        <Header />
        <main className="flex-1 overflow-y-auto pt-16 pb-20 px-4 md:px-6 lg:px-8">
          <Outlet />
        </main>
        <PlayerBar />
      </div>
    </div>
  );
}