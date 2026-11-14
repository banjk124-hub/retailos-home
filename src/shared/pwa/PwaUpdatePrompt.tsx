import { useEffect, useState } from 'react';
import './pwa-update-prompt.css';

export default function PwaUpdatePrompt() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
    let registration: ServiceWorkerRegistration | null = null;
    let hasReloaded = false;
    let disposed = false;

    const revealWaitingWorker = () => {
      if (!disposed && registration?.waiting) setWaitingWorker(registration.waiting);
    };
    const checkForUpdate = () => {
      if (document.visibilityState === 'visible') void registration?.update().catch(() => undefined);
    };
    const register = async () => {
      try {
        registration = await navigator.serviceWorker.register(
          import.meta.env.BASE_URL + 'sw.js', { updateViaCache: 'none' }
        );
        if (disposed) return;
        revealWaitingWorker();
        registration.addEventListener('updatefound', () => {
          registration?.installing?.addEventListener('statechange', revealWaitingWorker);
        });
        window.addEventListener('online', checkForUpdate);
        document.addEventListener('visibilitychange', checkForUpdate);
        checkForUpdate();
      } catch (error) {
        console.warn('Không thể đăng ký Service Worker:', error);
      }
    };
    const handleControllerChange = () => {
      if (hasReloaded) return;
      hasReloaded = true;
      window.location.reload();
    };
    void register();
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    return () => {
      disposed = true;
      window.removeEventListener('online', checkForUpdate);
      document.removeEventListener('visibilitychange', checkForUpdate);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  const applyUpdate = () => {
    if (!waitingWorker) return;
    setIsApplying(true);
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  };
  if (!waitingWorker) return null;
  return (
    <aside className="pwa-update-prompt" role="status" aria-live="polite">
      <div className="pwa-update-prompt__copy">
        <strong>RetailOS có phiên bản mới</strong>
        <span>Cập nhật sẽ tải lại ứng dụng. Hãy hoàn tất thao tác đang thực hiện trước khi tiếp tục.</span>
      </div>
      <div className="pwa-update-prompt__actions">
        <button type="button" className="pwa-update-prompt__later" onClick={() => setWaitingWorker(null)}>Để sau</button>
        <button type="button" className="pwa-update-prompt__apply" onClick={applyUpdate} disabled={isApplying}>
          {isApplying ? 'Đang cập nhật…' : 'Cập nhật'}
        </button>
      </div>
    </aside>
  );
}
