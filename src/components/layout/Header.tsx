'use client';

import { Search, Bell, Moon, Sun, Menu } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { useThemeStore } from '@/stores/themeStore';
import { useAuthStore } from '@/stores/authStore';
import { spotifyService } from '@/services/spotify';

export function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { theme, toggleTheme } = useThemeStore();
  const { user, isAuthenticated, logout } = useAuthStore();

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center gap-4 border-b border-[#21172e] bg-[#08060d]/90 px-4 backdrop-blur-xl md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => {}}
        aria-label="Menú"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <form
        onSubmit={handleSearch}
        className={cn(
          'absolute left-1/2 w-[min(36rem,calc(100%-13rem))] -translate-x-1/2',
          showSearch && 'max-w-xl'
        )}
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            ref={searchInputRef}
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar canciones, artistas, álbumes..."
            className="w-full rounded-full border border-[#30203f] bg-[#0e0a16] py-2 pl-10 pr-10 text-text-primary placeholder-text-muted transition-all focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30"
            autoFocus={showSearch}
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2"
              onClick={() => setSearchQuery('')}
              type="button"
              aria-label="Limpiar búsqueda"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </Button>
          )}
        </div>
      </form>

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Notificaciones">
              <Bell className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-text-muted">No hay notificaciones nuevas</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              {user?.avatar ? (
                <Avatar src={user.avatar} name={user.displayName} size="sm" />
              ) : (
                <Avatar name={user?.displayName || 'Usuario'} size="sm" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {isAuthenticated && user ? (
              <>
                <DropdownMenuLabel className="flex items-center gap-2">
                  <Avatar src={user.avatar} name={user.displayName} size="xs" />
                  <div>
                    <p className="font-medium truncate">{user.displayName}</p>
                    <p className="text-xs text-text-muted truncate">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => window.location.href = '/settings'}>
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Configuración
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-error">
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                  Cerrar sesión
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuLabel>Inicia sesión para acceder a más funciones</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => spotifyService.initiateAuth()}>
                  <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.017.558.111.757-.254.757-.57 0-.281-.015-1.22-.021-2.154-2.91.6-3.523-1.305-3.523-1.305-.476-1.21-1.161-1.532-1.161-1.532-.949-.65.072-.638.072-.638 1.05.074 1.605 1.074 1.605 1.074.934 1.604 2.448 1.142 3.043.874.094-.682.363-1.146.662-1.41-2.31-.262-4.744-1.155-4.744-5.14 0-1.134.408-2.058 1.08-2.78-.108-.262-.47-1.308.103-2.724 0 0 .884-.28 2.895 1.086A9.878 9.878 0 0112 6.84c.99.007 1.99.155 2.938.442 2.01-1.366 2.895-1.086 2.895-1.086.573 1.416.21 2.462.103 2.724.672.722 1.08 1.646 1.08 2.78 0 3.988-2.448 4.88-4.748 5.132.373.32.705.956.705 1.924 0 1.386-.012 2.5-.012 2.827 0 .317.198.69.768.561C20.837 21.42 24 17.08 24 12c0-6.627-5.373-12-12-12z"/></svg>
                  Conectar con Spotify
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}