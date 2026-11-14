const activeLocks = new WeakMap();

/**
 * Acquire a reference-counted body scroll lock.
 * Each caller receives an idempotent release function. The original inline
 * overflow value is restored only after the final active lock is released.
 */
export function acquireBodyScrollLock(targetDocument = document) {
  const body = targetDocument.body;
  if (!body) return () => {};

  let state = activeLocks.get(targetDocument);
  if (!state) {
    state = { count: 0, originalOverflow: body.style.overflow };
    activeLocks.set(targetDocument, state);
  }

  state.count += 1;
  body.style.overflow = 'hidden';

  let released = false;
  return () => {
    if (released) return;
    released = true;

    const current = activeLocks.get(targetDocument);
    if (!current) return;

    current.count = Math.max(0, current.count - 1);
    if (current.count > 0) return;

    body.style.overflow = current.originalOverflow;
    activeLocks.delete(targetDocument);
  };
}
