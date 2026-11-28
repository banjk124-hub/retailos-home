import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../src/platform/journey/journeyController.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

const module = { exports: {} };
const helpers = {
  getJourneyDestinationKey: (destination) => destination.kind === 'home' ? 'home' : `feature:${destination.moduleId}`,
  isSameJourneyDestination: (left, right) => helpers.getJourneyDestinationKey(left) === helpers.getJourneyDestinationKey(right),
  getJourneyTransitionDirection: (command) => command.kind === 'push' ? 'forward' : command.kind === 'pop' ? 'back' : 'none',
};
const resolver = (destination) => destination.kind === 'home'
  || (destination.kind === 'feature' && destination.moduleId === 'stocktake');
vm.runInNewContext(compiled, {
  module,
  exports: module.exports,
  require: (id) => {
    if (id === './journey.types') return helpers;
    if (id === './journeyPageRegistry') return { isJourneyDestinationResolvable: resolver };
    throw new Error(`Unexpected module import: ${id}`);
  },
});

const { JourneyController } = module.exports;
const home = { kind: 'home' };
const stocktake = { kind: 'feature', moduleId: 'stocktake' };
const unavailable = { kind: 'feature', moduleId: 'stocktake-import' };

const controller = new JourneyController();
assert.equal(controller.getSnapshot().stack.length, 1);
assert.equal(controller.getSnapshot().stack[0].destination.kind, 'home');

const homeContext = { activeSection: 'modules', searchQuery: 'milk', scrollY: 420, returnFocusKey: 'module-stocktake' };
assert.equal(await controller.dispatch({ kind: 'push', destination: stocktake, homeReturnContext: homeContext }), true);
assert.equal(controller.getSnapshot().stack.length, 2);
assert.equal(controller.getSnapshot().direction, 'forward');
assert.equal(controller.getSnapshot().stack[0].homeReturnContext.searchQuery, 'milk');
assert.equal(await controller.dispatch({ kind: 'push', destination: stocktake }), false, 'duplicate current Page must not be pushed');
assert.equal(await controller.dispatch({ kind: 'push', destination: unavailable }), false, 'unregistered Page must fail closed');
assert.equal(await controller.dispatch({ kind: 'pop' }), true);
assert.equal(controller.getSnapshot().stack.length, 1);
assert.equal(controller.getSnapshot().direction, 'back');
assert.equal(controller.getSnapshot().stack[0].homeReturnContext.returnFocusKey, 'module-stocktake');
assert.equal(await controller.dispatch({ kind: 'pop' }), false, 'root Home cannot be popped');

assert.equal(await controller.dispatch({ kind: 'replace', destination: stocktake }), true);
assert.equal(controller.getSnapshot().stack.length, 1);
assert.equal(controller.getSnapshot().direction, 'none');
assert.equal(controller.getSnapshot().stack[0].destination.moduleId, 'stocktake');

let releaseCount = 0;
const stayGuard = { evaluate: () => ({ status: 'block', reason: 'dirty', resolution: 'stay' }) };
const removeStayGuard = controller.registerExitGuard('stocktake', stayGuard);
assert.equal(await controller.dispatch({ kind: 'replace', destination: home }), false);
assert.equal(controller.getSnapshot().stack[0].destination.moduleId, 'stocktake');
removeStayGuard();

let evaluations = 0;
const waitGuard = {
  evaluate: () => (++evaluations === 1
    ? { status: 'block', reason: 'saving', resolution: 'wait' }
    : { status: 'allow' }),
  waitForSafeExit: async () => { releaseCount += 1; },
};
const removeWaitGuard = controller.registerExitGuard('stocktake-wait', waitGuard);
assert.equal(await controller.dispatch({ kind: 'replace', destination: home }), true);
assert.equal(evaluations, 2, 'wait must re-evaluate the guard after the operation settles');
assert.equal(releaseCount, 1);
removeWaitGuard();

assert.equal(await controller.dispatch({ kind: 'push', destination: stocktake }), true);
const blockedConfirm = { evaluate: () => ({ status: 'block', reason: 'confirmation required', resolution: 'confirm' }) };
const removeConfirmGuard = controller.registerExitGuard('confirm', blockedConfirm);
assert.equal(await controller.dispatch({ kind: 'pop' }), false, 'unconfirmed exit must remain blocked');
removeConfirmGuard();

const confirmedGuard = { evaluate: async () => ({ status: 'allow' }) };
const removeConfirmedGuard = controller.registerExitGuard('confirm-accepted', confirmedGuard);
assert.equal(await controller.dispatch({ kind: 'pop' }), true, 'feature-owned confirmation may authorize exit');
removeConfirmedGuard();

assert.equal(await controller.dispatch({ kind: 'push', destination: stocktake }), true);
const oldGuard = { evaluate: () => ({ status: 'allow' }) };
const newGuard = { evaluate: () => ({ status: 'block', reason: 'new owner', resolution: 'stay' }) };
const removeOld = controller.registerExitGuard('owner', oldGuard);
controller.registerExitGuard('owner', newGuard);
removeOld();
assert.equal(await controller.dispatch({ kind: 'pop' }), false, 'stale cleanup must not unregister a newer owner guard');

const failingController = new JourneyController();
assert.equal(await failingController.dispatch({ kind: 'push', destination: stocktake }), true);
failingController.registerExitGuard('rejecting', { evaluate: async () => { throw new Error('guard failed'); } });
assert.equal(await failingController.dispatch({ kind: 'pop' }), false, 'guard rejection must fail closed');
assert.equal(failingController.getSnapshot().stack.length, 2);

console.log('JRN-03A JourneyController runtime tests passed: stack, duplicate, resolver, Home context, wait/confirm/stay, owner cleanup and fail-closed behavior.');
