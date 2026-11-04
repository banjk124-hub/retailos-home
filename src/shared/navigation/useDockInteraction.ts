import { useEffect, useRef, useState } from 'react';

type Direction = 'none' | 'left' | 'right';

export function useDockInteraction(activeIndex: number) {
  const previousIndex = useRef(activeIndex);
  const [direction, setDirection] = useState<Direction>('none');
  const [isMoving, setIsMoving] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    if (activeIndex < 0 || activeIndex === previousIndex.current) return;

    setDirection(activeIndex > previousIndex.current ? 'right' : 'left');
    previousIndex.current = activeIndex;
    setIsMoving(true);

    const timer = window.setTimeout(() => {
      setIsMoving(false);
      setDirection('none');
    }, 300);
    return () => window.clearTimeout(timer);
  }, [activeIndex]);

  useEffect(() => {
    const mobileViewport = window.matchMedia('(max-width: 700px), (hover: none) and (pointer: coarse)');
    let focusOutFrame = 0;
    const updateKeyboardState = () => {
      const focused = document.activeElement;
      const isEditable = focused instanceof HTMLElement
        && (focused.matches('input, textarea, select') || focused.isContentEditable);
      setIsKeyboardOpen(mobileViewport.matches && isEditable);
    };
    const deferKeyboardStateUpdate = () => {
      if (focusOutFrame) window.cancelAnimationFrame(focusOutFrame);
      focusOutFrame = window.requestAnimationFrame(() => {
        focusOutFrame = 0;
        updateKeyboardState();
      });
    };

    document.addEventListener('focusin', updateKeyboardState);
    document.addEventListener('focusout', deferKeyboardStateUpdate);
    mobileViewport.addEventListener('change', updateKeyboardState);
    window.visualViewport?.addEventListener('resize', updateKeyboardState);
    updateKeyboardState();

    return () => {
      document.removeEventListener('focusin', updateKeyboardState);
      document.removeEventListener('focusout', deferKeyboardStateUpdate);
      mobileViewport.removeEventListener('change', updateKeyboardState);
      window.visualViewport?.removeEventListener('resize', updateKeyboardState);
      if (focusOutFrame) window.cancelAnimationFrame(focusOutFrame);
    };
  }, []);

  return { direction, isMoving, isKeyboardOpen };
}
