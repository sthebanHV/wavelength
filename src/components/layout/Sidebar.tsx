'use client';

import { useState } from 'react';
import { Link, useLocation, NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  Library,
  Radio,
  Heart,
  Upload,
  Search,
  Music,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
  FolderPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';

const NAV_ITEMS = [
  { path: '/', icon: Home, label: 'Inicio', badge: null },
  { path: '/library', icon: Library, label: 'Biblioteca', badge: null },
  { path: '/search', icon: Search, label: 'Buscar', badge: null },
  { path: '/radio', icon: Radio, label: 'Radio', badge: 'Live' },
  { path: '/playlists', icon: Music, label: 'Listas', badge: null },
  { path: '/liked', icon: Heart, label: 'Favoritos', badge: null },
  { path: '/upload', icon: Upload, label: 'Subir', badge: null },
];

const LIBRARY_SECTIONS = [
  { path: '/library/tracks', icon: Music, label: 'Canciones' },
  { path: '/library/albums', icon: FolderPlus, label: 'Álbumes' },
  { path: '/library/artists', icon: Users, label: 'Artistas' },
  { path: '/library/playlists', icon: FolderPlus, label: 'Listas de reproducción' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-full bg-surface border-r border-border-default transition-all duration-300 flex flex-col',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      <div className="flex h-16 items-center justify-between px-4 border-b border-border-default">
        {!collapsed && (
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-hover text-lg font-bold text-white">
              W
            </div>
            <span className="font-semibold text-lg">Wavelength</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
          className={cn('transition-transform', collapsed && 'rotate-180')}
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
      </div>

      <ScrollArea className="flex-1 overflow-y-auto">
        <nav className="px-3 py-4 space-y-1" aria-label="Navegación principal">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive: active }) => cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  'group relative overflow-hidden',
                  active
                    ? 'bg-accent/10 text-accent'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover',
                  collapsed && 'justify-center px-0'
                )}
                aria-current={isActive ? 'page' : undefined}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                {!collapsed && <span>{item.label}</span>}
                {item.badge && !collapsed && (
                  <Badge variant="accent" size="sm" className="ml-auto">
                    {item.badge}
                  </Badge>
                )}
                {isActive && !collapsed && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-0.5 bg-accent rounded-r-full" />
                )}
              </NavLink>
            );
          })}
        </nav>

        {!collapsed && (
          <>
            <Separator className="my-4" />
            <div className="px-3 mb-2">
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Tu biblioteca</h3>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-3"
                onClick={() => navigate('/playlists?create=1')}
              >
                <Plus className="h-4 w-4" />
                <span>Crear lista</span>
              </Button>
            </div>
            <nav className="px-3 space-y-1" aria-label="Secciones de biblioteca">
              {LIBRARY_SECTIONS.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive: active }) => cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    active
                      ? 'bg-accent/10 text-accent'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>

            {isAuthenticated && (
              <>
                <Separator className="my-4" />
                <div className="px-3 mb-2">
                  <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Spotify</h3>
                </div>
                <nav className="px-3 space-y-1" aria-label="Secciones de Spotify">
                  <NavLink
                    to="/spotify/playlists"
                    className={({ isActive: active }) => cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                      active ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                    )}
                  >
                    <FolderPlus className="h-4 w-4" />
                    <span>Tus listas</span>
                  </NavLink>
                  <NavLink
                    to="/spotify/liked"
                    className={({ isActive: active }) => cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                      active ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                    )}
                  >
                    <Heart className="h-4 w-4" />
                    <span>Me gusta</span>
                  </NavLink>
                  <NavLink
                    to="/spotify/top"
                    className={({ isActive: active }) => cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                      active ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                    )}
                  >
                    <Music className="h-4 w-4" />
                    <span>Top artistas/canciones</span>
                  </NavLink>
                </nav>
              </>
            )}
          </>
        )}
      </ScrollArea>

      <div className="p-3 border-t border-border-default">
        {!collapsed && (
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-hover text-sm font-bold text-white">
              U
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Usuario</p>
              <p className="text-xs text-text-muted truncate">Premium</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className={collapsed ? 'mx-auto' : ''}
            title={collapsed ? undefined : theme === 'dark' ? 'Modo oscuro' : 'Modo claro'}
          >
            {theme === 'dark' ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            )}
          </Button>
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/settings')}
              aria-label="Configuración"
            >
              <Settings className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
}