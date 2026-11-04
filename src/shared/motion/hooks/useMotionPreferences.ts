import { useEffect, useState } from 'react';
import { MOTION_CONFIG } from '../motion.config';

export function useMotionPreferences() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => window.matchMedia(MOTION_CONFIG.reducedMotionQuery).matches,
  );

  useEffect(() => {
    const preference = window.matchMedia(MOTION_CONFIG.reducedMotionQuery);
    const updatePreference = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    setPrefersReducedMotion(preference.matches);
    preference.addEventListener('change', updatePreference);
    return () => preference.removeEventListener('change', updatePreference);
  }, []);

  return { prefersReducedMotion };
}
