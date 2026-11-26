import { useCallback, useEffect, useRef, useState } from 'react';

export function useHomeFeedback() {
  const [toast, setToast] = useState('');
  const timerRef = useRef<number | null>(null);

  const clearToast = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setToast('');
  }, []);

  const announce = useCallback((message: string) => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    setToast(message);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setToast('');
    }, 2600);
  }, []);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  return { toast, announce, clearToast };
}
