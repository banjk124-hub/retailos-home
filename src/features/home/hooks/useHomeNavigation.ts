import { useCallback, useEffect, useRef, useState } from 'react';
import { saveHomeUiState, type HomeUiState } from '../homeStateStore';

type Options = {
  initialState: HomeUiState;
  prefersReducedMotion: boolean;
  onOpenSettings: () => void;
};

const DESTINATIONS = new Set(['home', 'modules', 'activity']);

export function useHomeNavigation({ initialState, prefersReducedMotion, onOpenSettings }: Options) {
  const [activeNav, setActiveNav] = useState(
    DESTINATIONS.has(initialState.activeNav) ? initialState.activeNav : 'home',
  );
  const activeNavRef = useRef(activeNav);
  const searchRef = useRef(initialState.search);
  const scrollSaveTimer = useRef<number | null>(null);

  useEffect(() => {
    activeNavRef.current = activeNav;
    saveHomeUiState({ activeNav, search: searchRef.current, scrollY: window.scrollY });
  }, [activeNav]);

  useEffect(() => {
    const restore = window.requestAnimationFrame(() => {
      if (initialState.scrollY > 0) window.scrollTo({ top: initialState.scrollY, behavior: 'auto' });
    });
    return () => window.cancelAnimationFrame(restore);
  }, [initialState]);

  useEffect(() => {
    let frame = 0;
    const syncActiveSection = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const activationLine = window.innerHeight * 0.38;
        const modulesTop = document.getElementById('modules')?.getBoundingClientRect().top ?? Infinity;
        const activityTop = document.getElementById('activity')?.getBoundingClientRect().top ?? Infinity;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const isAtBottom = maxScroll > 0 && window.scrollY >= maxScroll - 2;
        const nextActiveNav = isAtBottom || activityTop <= activationLine
          ? 'activity'
          : modulesTop <= activationLine
            ? 'modules'
            : 'home';
        setActiveNav((current) => current === nextActiveNav ? current : nextActiveNav);
        frame = 0;
      });
    };
    const persistCurrentUi = () => saveHomeUiState({
      activeNav: activeNavRef.current,
      search: searchRef.current,
      scrollY: window.scrollY,
    });
    const onScroll = () => {
      syncActiveSection();
      const currentY = Math.max(0, window.scrollY);
      if (scrollSaveTimer.current !== null) window.clearTimeout(scrollSaveTimer.current);
      scrollSaveTimer.current = window.setTimeout(() => {
        scrollSaveTimer.current = null;
        persistCurrentUiAt(currentY);
      }, 140);
    };
    const persistCurrentUiAt = (scrollY: number) => saveHomeUiState({
      activeNav: activeNavRef.current,
      search: searchRef.current,
      scrollY,
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pagehide', persistCurrentUi);
    syncActiveSection();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pagehide', persistCurrentUi);
      if (frame) window.cancelAnimationFrame(frame);
      if (scrollSaveTimer.current !== null) window.clearTimeout(scrollSaveTimer.current);
    };
  }, []);

  const handleSearchChange = useCallback((nextSearch: string) => {
    searchRef.current = nextSearch;
    saveHomeUiState({ activeNav: activeNavRef.current, search: nextSearch, scrollY: window.scrollY });
  }, []);

  const handleNav = useCallback((id: string) => {
    const scrollBehavior: ScrollBehavior = prefersReducedMotion ? 'auto' : 'smooth';
    if (id === 'modules') document.getElementById('modules')?.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
    else if (id === 'activity') document.getElementById('activity')?.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
    else if (id === 'settings') { setActiveNav('settings'); onOpenSettings(); }
    else if (id === 'home') window.scrollTo({ top: 0, behavior: scrollBehavior });
  }, [onOpenSettings, prefersReducedMotion]);

  return [activeNav, setActiveNav, handleNav, handleSearchChange] as const;
}
