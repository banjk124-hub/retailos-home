import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const journey = read('../src/platform/journey/journey.types.ts');
const modules = read('../src/features/home/moduleRegistry.ts');
const app = read('../src/App.tsx');
const homeNavigation = read('../src/features/home/hooks/useHomeNavigation.ts');
const homeState = read('../src/features/home/homeStateStore.ts');
const updateSafety = read('../src/shared/pwa/updateSafety.ts');
const cameraSession = read('../src/shared/services/cameraSession.ts');

assert.match(journey, /import type \{ RetailModuleId \} from '\.\.\/\.\.\/features\/home\/moduleRegistry'/);
assert.match(journey, /export type ExperienceDestination =/);
assert.match(journey, /\| \{ kind: 'home' \}/);
assert.match(journey, /\| \{ kind: 'feature'; moduleId: RetailModuleId \}/);
assert.match(journey, /export type HomeSectionId = 'home' \| 'modules' \| 'activity'/);
assert.match(journey, /export type HomeReturnContext =/);
assert.match(journey, /activeSection: HomeSectionId/);
assert.match(journey, /searchQuery: string/);
assert.match(journey, /scrollY: number/);
assert.match(journey, /returnFocusKey\?: string/);
assert.match(journey, /export type JourneyNavigationCommand =/);
assert.match(journey, /kind: 'push'/);
assert.match(journey, /kind: 'pop'/);
assert.match(journey, /kind: 'replace'/);
assert.match(journey, /export type JourneyExitGuardResult =/);
assert.match(journey, /resolution: 'wait' \| 'confirm' \| 'stay'/);
assert.match(journey, /getJourneyDestinationKey/);
assert.match(journey, /isSameJourneyDestination/);
assert.match(journey, /getJourneyTransitionDirection/);

// Destination IDs derive from the existing workflow registry; no parallel ID list.
assert.match(modules, /export const RETAIL_MODULE_IDS = \[/);
assert.doesNotMatch(journey, /stocktake-import|stocktake|inventory|product-dates/);

// App continues to own authentication; JRN-01 does not duplicate auth/session state.
assert.match(app, /type AuthJourney = 'login' \| 'identity' \| 'home'/);
assert.match(app, /const \[authJourney, setAuthJourney\]/);
assert.match(journey, /App authentication remains owned by App\.tsx/);

// Home sections are in-page anchors, not authenticated page destinations.
assert.match(homeNavigation, /const DESTINATIONS = new Set\(\['home', 'modules', 'activity'\]\)/);
assert.match(homeNavigation, /scrollIntoView/);
assert.match(homeState, /activeNav: string/);
assert.match(homeState, /search: string/);
assert.match(homeState, /scrollY: number/);

// Existing update and camera guards remain the safety authority for feature exits.
assert.match(updateSafety, /registerPwaUpdateBlocker/);
assert.match(updateSafety, /getPwaUpdateBlockReason/);
assert.match(cameraSession, /registerPwaUpdateBlocker\('camera-session'/);

console.log('JRN-01 destination, navigation, Home-return and safe-exit contract tests passed.');
