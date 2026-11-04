import { createContext, useContext, useLayoutEffect, type ReactNode } from 'react';
import { useMotionPreferences } from './hooks/useMotionPreferences';

type MotionPreferences = ReturnType<typeof useMotionPreferences>;

const MotionContext = createContext<MotionPreferences | null>(null);

type Props = {
  children: ReactNode;
};

export function MotionProvider({ children }: Props) {
  const preferences = useMotionPreferences();

  useLayoutEffect(() => {
    document.documentElement.dataset.motionPreference = preferences.prefersReducedMotion
      ? 'reduced'
      : 'full';
  }, [preferences.prefersReducedMotion]);

  return (
    <MotionContext.Provider value={preferences}>
      {children}
    </MotionContext.Provider>
  );
}

export function useMotionState() {
  const preferences = useContext(MotionContext);
  if (!preferences) {
    throw new Error('useMotionState must be used within MotionProvider.');
  }
  return preferences;
}
