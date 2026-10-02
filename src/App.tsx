import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';

const Home = lazy(() => import('@/pages/Home').then(m => ({ default: m.Home })));
const Library = lazy(() => import('@/pages/Library').then(m => ({ default: m.Library })));
const Search = lazy(() => import('@/pages/Search').then(m => ({ default: m.Search })));
const Playlists = lazy(() => import('@/pages/Playlists').then(m => ({ default: m.Playlists })));
const Favorites = lazy(() => import('@/pages/Favorites').then(m => ({ default: m.Favorites })));
const CollectionDetail = lazy(() => import('@/pages/CollectionDetail').then(m => ({ default: m.CollectionDetail })));
const NowPlaying = lazy(() => import('@/pages/NowPlaying').then(m => ({ default: m.NowPlaying })));
const Settings = lazy(() => import('@/pages/Settings').then(m => ({ default: m.Settings })));
const Upload = lazy(() => import('@/pages/Upload').then(m => ({ default: m.Upload })));
const Callback = lazy(() => import('@/pages/Callback').then(m => ({ default: m.Callback })));

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-64">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      <p className="text-text-muted">Cargando...</p>
    </div>
  </div>
);

function App() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="library" element={<Library />} />
          <Route path="library/:section" element={<Library />} />
          <Route path="search" element={<Search />} />
          <Route path="playlists" element={<Playlists />} />
          <Route path="playlists/:id" element={<CollectionDetail />} />
          <Route path="albums/:id" element={<CollectionDetail />} />
          <Route path="artists/:id" element={<CollectionDetail />} />
          <Route path="liked" element={<Favorites />} />
          <Route path="spotify/liked" element={<Favorites />} />
          <Route path="spotify/playlists" element={<Playlists />} />
          <Route path="spotify/top" element={<Library />} />
          <Route path="now-playing" element={<NowPlaying />} />
          <Route path="settings" element={<Settings />} />
          <Route path="upload" element={<Upload />} />
        </Route>
        <Route path="callback" element={<Callback />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;