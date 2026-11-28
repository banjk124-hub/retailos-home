import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from 'react';
import { JourneyController } from './journeyController';

const JourneyControllerContext = createContext<JourneyController | null>(null);

export function JourneyControllerProvider({ children }: { children: ReactNode }) {
  const [controller] = useState(() => new JourneyController());
  return <JourneyControllerContext.Provider value={controller}>{children}</JourneyControllerContext.Provider>;
}

export function useJourneyController(): JourneyController {
  const controller = useContext(JourneyControllerContext);
  if (!controller) throw new Error('useJourneyController must be used inside JourneyControllerProvider');
  return controller;
}

export function useJourneySnapshot() {
  const controller = useJourneyController();
  return useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
}
