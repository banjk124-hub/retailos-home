import { useEffect, useState } from 'react';

export function useHomeSpotlightViewport() {
  const [isMobileViewport, setIsMobileViewport] = useState(() => window.matchMedia('(max-width: 700px)').matches);
  const [areSpotlightNotificationsExpanded, setAreSpotlightNotificationsExpanded] = useState(() => !window.matchMedia('(max-width: 700px)').matches);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 700px)');
    const sync = () => {
      setIsMobileViewport(media.matches);
      setAreSpotlightNotificationsExpanded(!media.matches);
    };
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  return { isMobileViewport, areSpotlightNotificationsExpanded, setAreSpotlightNotificationsExpanded };
}
