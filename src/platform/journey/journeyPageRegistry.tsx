import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { EmployeeSession } from '../../shared/domain/employee';
import type { DepartmentConfig } from '../../shared/config/departments';
import type { RetailPlatform } from '../../shared/platform/platformCapabilities';
import type { ExperienceDestination } from './journey.types';
import { MODULE_REGISTRY } from '../../features/home/moduleRegistry';
import type { RetailModuleId } from '../../shared/domain/retailModule';

export type JourneyPageProps = {
  employee: EmployeeSession;
  department: DepartmentConfig;
  onLogout: () => void;
  isEnteringHome: boolean;
  isOffline: boolean;
  canInstall: boolean;
  onInstall: () => Promise<void> | void;
  onBootReady: () => void;
  platform: RetailPlatform;
};

const HomePage = lazy(() => import('../../features/home/HomeScreen'));

/** Feature Page resolvers are added only in their bounded extraction slices. */
const FEATURE_PAGES: Partial<Record<RetailModuleId, LazyExoticComponent<ComponentType<JourneyPageProps>>>> = {};

export function isJourneyDestinationResolvable(destination: ExperienceDestination): boolean {
  if (destination.kind === 'home') return true;
  const module = MODULE_REGISTRY.find((item) => item.id === destination.moduleId);
  return module?.availability === 'ready' && Boolean(FEATURE_PAGES[destination.moduleId]);
}

export function resolveJourneyPage(destination: ExperienceDestination) {
  if (destination.kind === 'home') return HomePage;
  if (!isJourneyDestinationResolvable(destination)) return null;
  return FEATURE_PAGES[destination.moduleId] ?? null;
}
