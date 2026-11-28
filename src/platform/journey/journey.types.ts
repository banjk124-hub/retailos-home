import type { RetailModuleId } from '../../features/home/moduleRegistry';

/**
 * App authentication remains owned by App.tsx.
 * This type is the authenticated experience destination model only.
 */
export type ExperienceDestination =
  | { kind: 'home' }
  | { kind: 'feature'; moduleId: RetailModuleId };

export type HomeSectionId = 'home' | 'modules' | 'activity';

/**
 * Ephemeral Home context captured before leaving Home for a Feature Page.
 * It is navigation state, not business data and must never replace feature persistence.
 */
export type HomeReturnContext = {
  activeSection: HomeSectionId;
  searchQuery: string;
  scrollY: number;
  /** Stable semantic key used to restore focus to the entry control when possible. */
  returnFocusKey?: string;
};

export type JourneyDestinationKey =
  | 'home'
  | `feature:${RetailModuleId}`;

export type JourneyStackEntry = {
  destination: ExperienceDestination;
  /** Context is captured only when leaving Home and restored when returning. */
  homeReturnContext?: HomeReturnContext;
};

export type JourneyNavigationCommand =
  | {
      kind: 'push';
      destination: ExperienceDestination;
      homeReturnContext?: HomeReturnContext;
    }
  | { kind: 'pop' }
  | {
      kind: 'replace';
      destination: ExperienceDestination;
    };

export type JourneyTransitionDirection = 'forward' | 'back' | 'none';

/**
 * A feature may veto navigation when work is unsafe to abandon.
 * "wait" means an operation must finish; "confirm" means the user must decide;
 * "stay" means navigation is not currently permitted.
 */
export type JourneyExitGuardResult =
  | { status: 'allow' }
  | {
      status: 'block';
      reason: string;
      resolution: 'wait' | 'confirm' | 'stay';
    };

export function getJourneyDestinationKey(destination: ExperienceDestination): JourneyDestinationKey {
  return destination.kind === 'home' ? 'home' : `feature:${destination.moduleId}`;
}

export function isSameJourneyDestination(
  left: ExperienceDestination,
  right: ExperienceDestination,
): boolean {
  return getJourneyDestinationKey(left) === getJourneyDestinationKey(right);
}

export function getJourneyTransitionDirection(
  command: JourneyNavigationCommand,
): JourneyTransitionDirection {
  if (command.kind === 'push') return 'forward';
  if (command.kind === 'pop') return 'back';
  return 'none';
}
