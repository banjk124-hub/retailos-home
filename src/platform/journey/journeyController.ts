import {
  getJourneyDestinationKey,
  getJourneyTransitionDirection,
  isSameJourneyDestination,
  type ExperienceDestination,
  type JourneyExitGuardResult,
  type JourneyNavigationCommand,
  type JourneyStackEntry,
  type JourneyTransitionDirection,
} from './journey.types';
import { isJourneyDestinationResolvable } from './journeyPageRegistry';

export type JourneySnapshot = {
  stack: readonly JourneyStackEntry[];
  direction: JourneyTransitionDirection;
  revision: number;
  isNavigating: boolean;
};

export type JourneyExitGuard = {
  evaluate: () => JourneyExitGuardResult | Promise<JourneyExitGuardResult>;
  /** Resolves the active operation when evaluate() reports resolution: wait. */
  waitForSafeExit?: () => Promise<void>;
};

type GuardRegistration = { owner: string; guard: JourneyExitGuard };
type Listener = () => void;

const INITIAL_STACK: readonly JourneyStackEntry[] = [{ destination: { kind: 'home' } }];

export class JourneyController {
  private snapshot: JourneySnapshot = {
    stack: INITIAL_STACK,
    direction: 'none',
    revision: 0,
    isNavigating: false,
  };
  private listeners = new Set<Listener>();
  private exitGuard: GuardRegistration | null = null;

  getSnapshot = (): JourneySnapshot => this.snapshot;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  registerExitGuard(owner: string, guard: JourneyExitGuard): () => void {
    this.exitGuard = { owner, guard };
    return () => {
      if (this.exitGuard?.owner === owner && this.exitGuard.guard === guard) {
        this.exitGuard = null;
      }
    };
  }

  async dispatch(command: JourneyNavigationCommand): Promise<boolean> {
    if (this.snapshot.isNavigating) return false;

    const current = this.snapshot.stack[this.snapshot.stack.length - 1];
    if (!current) return false;

    if (command.kind === 'push') {
      if (!isJourneyDestinationResolvable(command.destination)) return false;
      if (isSameJourneyDestination(current.destination, command.destination)) return false;
    } else if (command.kind === 'replace') {
      if (!isJourneyDestinationResolvable(command.destination)) return false;
      if (isSameJourneyDestination(current.destination, command.destination)) return false;
    } else if (this.snapshot.stack.length <= 1) {
      return false;
    }

    this.setSnapshot({ ...this.snapshot, isNavigating: true });

    try {
      if (!(await this.canExitCurrentPage())) return false;

      const stack = [...this.snapshot.stack];
      if (command.kind === 'push') {
        const currentIndex = stack.length - 1;
        if (command.homeReturnContext && stack[currentIndex]?.destination.kind === 'home') {
          stack[currentIndex] = { ...stack[currentIndex], homeReturnContext: command.homeReturnContext };
        }
        stack.push({ destination: command.destination });
      } else if (command.kind === 'pop') {
        stack.pop();
      } else {
        stack[stack.length - 1] = { destination: command.destination };
      }

      this.setSnapshot({
        stack,
        direction: getJourneyTransitionDirection(command),
        revision: this.snapshot.revision + 1,
        isNavigating: true,
      });
      return true;
    } catch {
      // A guard failure must fail closed; the active Page remains mounted.
      return false;
    } finally {
      this.setSnapshot({ ...this.snapshot, isNavigating: false });
    }
  }

  private async canExitCurrentPage(): Promise<boolean> {
    let registration = this.exitGuard;
    if (!registration) return true;

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const result = await registration.guard.evaluate();
      if (this.exitGuard?.owner !== registration.owner || this.exitGuard.guard !== registration.guard) return false;
      if (result.status === 'allow') return true;
      if (result.resolution !== 'wait' || !registration.guard.waitForSafeExit) return false;

      await registration.guard.waitForSafeExit();
      if (this.exitGuard?.owner !== registration.owner || this.exitGuard.guard !== registration.guard) {
        return false;
      }
      registration = this.exitGuard;
    }

    return false;
  }

  private setSnapshot(snapshot: JourneySnapshot) {
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener());
  }
}

export function getActiveJourneyDestination(snapshot: JourneySnapshot): ExperienceDestination {
  return snapshot.stack[snapshot.stack.length - 1]?.destination ?? { kind: 'home' };
}

export function getActiveJourneyKey(snapshot: JourneySnapshot): string {
  return getJourneyDestinationKey(getActiveJourneyDestination(snapshot));
}
