import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ShellNavigation } from '../../shared/navigation/ShellNavigation';
import type { ShellNavigationProps } from '../../shared/navigation/ShellNavigation';
import type { RetailPlatform } from '../../shared/platform/platformCapabilities';

type NavigationConfig = Omit<ShellNavigationProps, 'platform'>;
type Registration = { owner: string; config: NavigationConfig };
type ContextValue = {
  registration: Registration | null;
  register: (owner: string, config: NavigationConfig) => void;
  unregister: (owner: string) => void;
};

const ShellNavigationContext = createContext<ContextValue | null>(null);

export function ShellNavigationProvider({ children }: { children: ReactNode }) {
  const [registration, setRegistration] = useState<Registration | null>(null);
  const register = useCallback((owner: string, config: NavigationConfig) => {
    setRegistration({ owner, config });
  }, []);
  const unregister = useCallback((owner: string) => {
    setRegistration((current) => current?.owner === owner ? null : current);
  }, []);
  const value = useMemo(() => ({ registration, register, unregister }), [registration, register, unregister]);

  return <ShellNavigationContext.Provider value={value}>{children}</ShellNavigationContext.Provider>;
}

/** The active Page registers navigation intent; the persistent Shell renders the chrome. */
export function useShellNavigationRegistration(owner: string, config: NavigationConfig) {
  const context = useContext(ShellNavigationContext);
  useEffect(() => {
    context?.register(owner, config);
  }, [context, owner, config]);
  useEffect(() => () => context?.unregister(owner), [context, owner]);
}

export function PersistentShellNavigation({ platform }: { platform: RetailPlatform }) {
  const context = useContext(ShellNavigationContext);
  if (!context?.registration) return null;
  return <ShellNavigation {...context.registration.config} platform={platform} />;
}
