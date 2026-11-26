import { useEffect, type RefObject } from 'react';

const activeDialogs: HTMLElement[] = [];
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) => {
    if (element.closest('[inert], [aria-hidden="true"]')) return false;
    if (element.getAttribute('aria-disabled') === 'true') return false;
    return element.getClientRects().length > 0;
  });
}

/**
 * Adds modal focus containment to an existing feature-owned dialog.
 * The feature remains responsible for open/close state, Escape and focus return.
 */
export function useDialogFocus<T extends HTMLElement>(
  active: boolean,
  dialogRef: RefObject<T>,
): void {
  useEffect(() => {
    if (!active) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    activeDialogs.push(dialog);
    const isTopmost = () => activeDialogs[activeDialogs.length - 1] === dialog;

    const containFocus = (event: KeyboardEvent) => {
      if (!isTopmost() || event.key !== 'Tab') return;
      const focusable = getFocusableElements(dialog);
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;
      if (event.shiftKey && (current === first || !dialog.contains(current))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (current === last || !dialog.contains(current))) {
        event.preventDefault();
        first.focus();
      }
    };

    const containProgrammaticFocus = (event: FocusEvent) => {
      if (!isTopmost() || dialog.contains(event.target as Node)) return;
      const focusable = getFocusableElements(dialog);
      (focusable[0] ?? dialog).focus();
    };

    document.addEventListener('keydown', containFocus, true);
    document.addEventListener('focusin', containProgrammaticFocus, true);
    return () => {
      document.removeEventListener('keydown', containFocus, true);
      document.removeEventListener('focusin', containProgrammaticFocus, true);
      const index = activeDialogs.lastIndexOf(dialog);
      if (index >= 0) activeDialogs.splice(index, 1);
    };
  }, [active, dialogRef]);
}
