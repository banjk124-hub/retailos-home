import { useEffect, useRef, useState } from 'react';
import './pwa-update-prompt.css';
import { registerRetailOsServiceWorker } from './serviceWorkerRegistration';

export default function PwaUpdatePrompt() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [updateNotice, setUpdateNotice] = useState('');
  const isApplyingUpdate = useRef(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
    let registration: ServiceWorkerRegistration | null = null;
    let hasReloaded = false;
    let disposed = false;
    let installingWorker: ServiceWorker | null = null;

    const revealWaitingWorker = () => {
      if (!disposed && registration?.waiting) setWaitingWorker(registration.waiting);
    };
    const checkForUpdate = () => {
      if (document.visibilityState === 'visible') {
        void registration?.update().then(revealWaitingWorker).catch(() => undefined);
        revealWaitingWorker();
      }
    };
    const register = async () => {
      try {
        registration = await registerRetailOsServiceWorker();
        if (disposed) return;
        revealWaitingWorker();
        const observeInstallingWorker = () => {
          installingWorker?.removeEventListener('statechange', revealWaitingWorker);
          installingWorker = registration?.installing ?? null;
          installingWorker?.addEventListener('statechange', revealWaitingWorker);
        };
        registration.addEventListener('updatefound', observeInstallingWorker);
        observeInstallingWorker();
        window.addEventListener('online', checkForUpdate);
        document.addEventListener('visibilitychange', checkForUpdate);
        checkForUpdate();
      } catch (error) {
        console.warn('Không thể đăng ký Service Worker:', error);
      }
    };
    const handleControllerChange = () => {
      if (!isApplyingUpdate.current || hasReloaded) return;
      hasReloaded = true;
      window.location.reload();
    };
    void register();
    const handleWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'UPDATE_BLOCKED_MULTIPLE_CLIENTS') {
        isApplyingUpdate.current = false;
        setIsApplying(false);
        setUpdateNotice('Đang có RetailOS mở ở tab hoặc cửa sổ khác. Hãy đóng các phiên còn lại rồi thử cập nhật.');
      }
    };
    navigator.serviceWorker.addEventListener('message', handleWorkerMessage);
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    return () => {
      disposed = true;
      registration?.removeEventListener('updatefound', observeInstallingWorker);
      installingWorker?.removeEventListener('statechange', revealWaitingWorker);
      installingWorker = null;
      window.removeEventListener('online', checkForUpdate);
      document.removeEventListener('visibilitychange', checkForUpdate);
      navigator.serviceWorker.removeEventListener('message', handleWorkerMessage);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  const applyUpdate = () => {
    if (!waitingWorker) return;
    setIsApplying(true);
    setUpdateNotice('');
    isApplyingUpdate.current = true;
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  };
  if (!waitingWorker) return null;
  return (
    <aside className="pwa-update-prompt" role="status" aria-live="polite">
      <div className="pwa-update-prompt__copy">
        <strong>RetailOS có phiên bản mới</strong>
        <span>{updateNotice || 'Cập nhật sẽ tải lại ứng dụng. Hãy hoàn tất thao tác đang thực hiện trước khi tiếp tục.'}</span>
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
