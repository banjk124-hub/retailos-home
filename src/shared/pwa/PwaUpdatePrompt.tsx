import { useCallback, useEffect, useRef, useState } from 'react';
import './pwa-update-prompt.css';
import { registerRetailOsServiceWorker } from './serviceWorkerRegistration';
import { getPwaUpdateBlockReason } from './updateSafety';

declare const __RETAILOS_BUILD_ID__: string;

type ReleaseManifest = {
  schemaVersion: number;
  buildId: string;
  base: string;
  version: string;
  title: string;
  summary: string;
  sections: Array<{ heading: string; items: string[] }>;
  compatibility: string[];
  warnings: string[];
  resources: Array<{ path: string; cache: 'shell' | 'assets'; size: number; sha256: string }>;
};

type UpdatePhase = 'loading-info' | 'available' | 'downloading' | 'staged' | 'error' | 'activating';

function formatBytes(value: number): string {
  if (value < 1024) return value + ' B';
  if (value < 1024 * 1024) return (value / 1024).toFixed(1) + ' KB';
  return (value / (1024 * 1024)).toFixed(1) + ' MB';
}

function requestWorkerMessage(worker: ServiceWorker, message: unknown, timeoutMs = 8000): Promise<any> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timeout = window.setTimeout(() => {
      channel.port1.close();
      resolve(null);
    }, timeoutMs);
    channel.port1.onmessage = (event) => {
      window.clearTimeout(timeout);
      channel.port1.close();
      resolve(event.data);
    };
    try {
      worker.postMessage(message, [channel.port2]);
    } catch {
      window.clearTimeout(timeout);
      channel.port1.close();
      resolve(null);
    }
  });
}

export default function PwaUpdatePrompt() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [manifest, setManifest] = useState<ReleaseManifest | null>(null);
  const [phase, setPhase] = useState<UpdatePhase>('loading-info');
  const [progress, setProgress] = useState({ completed: 0, total: 0, bytesDownloaded: 0, totalBytes: 0 });
  const [notice, setNotice] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);
  const stagedRef = useRef(false);
  const activationRequestedRef = useRef(false);
  const isApplyingUpdate = useRef(false);
  const hasReloaded = useRef(false);
  const dismissedBuildId = useRef<string | null>(null);
  const retryInfoRef = useRef<() => void>(() => undefined);

  const tryActivate = useCallback(() => {
    const worker = waitingWorkerRef.current;
    if (!worker || !stagedRef.current || activationRequestedRef.current) return;
    const reason = getPwaUpdateBlockReason();
    setBlockReason(reason || '');
    if (reason) return;
    activationRequestedRef.current = true;
    isApplyingUpdate.current = true;
    setPhase('activating');
    setNotice('Đã tải và xác minh đầy đủ. RetailOS đang chuyển sang phiên bản mới an toàn.');
    try {
      worker.postMessage({ type: 'ACTIVATE_RELEASE' });
    } catch {
      activationRequestedRef.current = false;
      isApplyingUpdate.current = false;
      setPhase('staged');
      setNotice('Chưa thể chuyển phiên bản ở thời điểm này. RetailOS sẽ tự thử lại khi có thể.');
    }
  }, []);

  const startDownload = useCallback(() => {
    const worker = waitingWorkerRef.current;
    if (!worker || phase === 'downloading' || phase === 'activating') return;
    setPhase('downloading');
    setNotice('Đang tải toàn bộ tài nguyên ứng dụng. Phiên bản hiện tại vẫn hoạt động trong quá trình này.');
    setBlockReason('');
    setProgress({
      completed: 0,
      total: manifest?.resources.length ?? 0,
      bytesDownloaded: 0,
      totalBytes: manifest?.resources.reduce((sum, resource) => sum + resource.size, 0) ?? 0,
    });
    const channel = new MessageChannel();
    channel.port1.onmessage = (event) => {
      const message = event.data;
      if (message?.type === 'RELEASE_DOWNLOAD_PROGRESS') {
        setProgress({
          completed: message.completed ?? 0,
          total: message.total ?? 0,
          bytesDownloaded: message.bytesDownloaded ?? 0,
          totalBytes: message.totalBytes ?? 0,
        });
      }
      if (message?.type === 'RELEASE_STAGE_FAILED') {
        channel.port1.close();
        setPhase('error');
        setNotice(message.message || 'Không thể tải đầy đủ phiên bản mới. Bản hiện tại vẫn được giữ nguyên.');
      }
      if (message?.type === 'RELEASE_STAGED') {
        channel.port1.close();
        stagedRef.current = true;
        setProgress((current) => ({
          completed: message.completed ?? current.total,
          total: message.total ?? current.total,
          bytesDownloaded: message.totalBytes ?? current.totalBytes,
          totalBytes: message.totalBytes ?? current.totalBytes,
        }));
        setPhase('staged');
        setNotice('Đã tải và xác minh toàn bộ tài nguyên. RetailOS sẽ tự cập nhật khi có thể chuyển giao an toàn.');
        tryActivate();
      }
    };
    try {
      worker.postMessage({ type: 'STAGE_RELEASE' }, [channel.port2]);
    } catch {
      channel.port1.close();
      setPhase('error');
      setNotice('Không thể bắt đầu tải phiên bản. Bản hiện tại vẫn hoạt động bình thường.');
    }
  }, [manifest, phase, tryActivate]);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
    let registration: ServiceWorkerRegistration | null = null;
    let disposed = false;
    let installingWorker: ServiceWorker | null = null;

    const reportHealthyBoot = () => {
      document.documentElement.dataset.retailosBootHealthy = 'true';
      navigator.serviceWorker.controller?.postMessage({
        type: 'APP_BOOT_OK',
        buildId: __RETAILOS_BUILD_ID__,
      });
      window.dispatchEvent(new Event('retailos:boot-healthy'));
    };
    reportHealthyBoot();

    const loadCandidateInfo = async (worker: ServiceWorker) => {
      waitingWorkerRef.current = worker;
      stagedRef.current = false;
      activationRequestedRef.current = false;
      setWaitingWorker(worker);
      setManifest(null);
      setPhase('loading-info');
      setNotice('Đang đọc thông tin phiên bản mới…');
      const response = await requestWorkerMessage(worker, { type: 'GET_RELEASE_INFO' });
      if (disposed || waitingWorkerRef.current !== worker) return;
      if (response?.type !== 'RELEASE_INFO' || response.manifest?.buildId == null) {
        setPhase('error');
        setNotice(response?.message || 'Không thể xác minh thông tin phiên bản. Chưa có tài nguyên mới nào được tải.');
        return;
      }
      const nextManifest = response.manifest as ReleaseManifest;
      if (
        nextManifest.schemaVersion !== 1
        || nextManifest.buildId === __RETAILOS_BUILD_ID__
        || !Array.isArray(nextManifest.resources)
        || !nextManifest.resources.length
      ) {
        setPhase('error');
        setNotice('Manifest phiên bản không hợp lệ. RetailOS giữ nguyên phiên bản đang chạy.');
        return;
      }
      if (dismissedBuildId.current === nextManifest.buildId) {
        setWaitingWorker(null);
        waitingWorkerRef.current = null;
        return;
      }
      setManifest(nextManifest);
      setPhase('available');
      setNotice('');
    };

    retryInfoRef.current = () => {
      const candidate = registration?.waiting;
      if (candidate) void loadCandidateInfo(candidate);
    };

    const revealWaitingWorker = () => {
      const candidate = registration?.waiting;
      if (!disposed && candidate && candidate !== waitingWorkerRef.current) {
        void loadCandidateInfo(candidate);
      }
    };
    const checkForUpdate = () => {
      if (document.visibilityState !== 'visible') return;
      void registration?.update().then(revealWaitingWorker).catch(() => undefined);
      revealWaitingWorker();
    };
    const observeInstallingWorker = () => {
      installingWorker?.removeEventListener('statechange', revealWaitingWorker);
      installingWorker = registration?.installing ?? null;
      installingWorker?.addEventListener('statechange', revealWaitingWorker);
    };
    const register = async () => {
      try {
        registration = await registerRetailOsServiceWorker();
        if (disposed) return;
        revealWaitingWorker();
        registration.addEventListener('updatefound', observeInstallingWorker);
        observeInstallingWorker();
        window.addEventListener('online', checkForUpdate);
        window.addEventListener('focus', checkForUpdate);
        document.addEventListener('visibilitychange', checkForUpdate);
        checkForUpdate();
      } catch (error) {
        console.warn('Không thể đăng ký Service Worker:', error);
      }
    };

    const handleControllerChange = () => {
      reportHealthyBoot();
      if (!isApplyingUpdate.current || hasReloaded.current) return;
      hasReloaded.current = true;
      window.location.reload();
    };
    const handleWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'UPDATE_BLOCKED_MULTIPLE_CLIENTS') {
        activationRequestedRef.current = false;
        setPhase('staged');
        setNotice('Bản mới đã sẵn sàng. Hãy đóng các tab hoặc cửa sổ RetailOS khác; ứng dụng sẽ tự tiếp tục cập nhật.');
      }
      if (event.data?.type === 'UPDATE_ROLLBACK_UNAVAILABLE') {
        activationRequestedRef.current = false;
        setPhase('error');
        setNotice('Không tìm thấy bản ổn định để khôi phục. Hãy giữ ứng dụng đang mở và liên hệ quản trị viên.');
      }
      if (event.data?.type === 'UPDATE_NOT_STAGED') {
        activationRequestedRef.current = false;
        setPhase('error');
        setNotice('Phiên bản chưa được tải và xác minh đầy đủ. Hãy thử tải lại.');
      }
    };
    const retrySafeActivation = () => {
      if (stagedRef.current && !activationRequestedRef.current) tryActivate();
    };
    const safetyEvents = ['input', 'change', 'focusout', 'reset', 'retailos:update-safety-changed'];
    safetyEvents.forEach((name) => document.addEventListener(name, retrySafeActivation));
    window.addEventListener('focus', retrySafeActivation);
    document.addEventListener('visibilitychange', retrySafeActivation);

    void register();
    navigator.serviceWorker.addEventListener('message', handleWorkerMessage);
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    return () => {
      disposed = true;
      registration?.removeEventListener('updatefound', observeInstallingWorker);
      installingWorker?.removeEventListener('statechange', revealWaitingWorker);
      installingWorker = null;
      window.removeEventListener('online', checkForUpdate);
      window.removeEventListener('focus', checkForUpdate);
      document.removeEventListener('visibilitychange', checkForUpdate);
      safetyEvents.forEach((name) => document.removeEventListener(name, retrySafeActivation));
      window.removeEventListener('focus', retrySafeActivation);
      document.removeEventListener('visibilitychange', retrySafeActivation);
      retryInfoRef.current = () => undefined;
      navigator.serviceWorker.removeEventListener('message', handleWorkerMessage);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, [tryActivate]);

  if (!waitingWorker) return null;

  const totalBytes = manifest?.resources.reduce((sum, resource) => sum + resource.size, 0) ?? 0;
  const progressPercent = progress.total > 0
    ? Math.min(100, Math.round((progress.completed / progress.total) * 100))
    : 0;

  return (
    <aside className="pwa-update-prompt" role="region" aria-label="Cập nhật RetailOS">
      <div className="pwa-update-prompt__header">
        <div className="pwa-update-prompt__eyebrow">RETAILOS · PHIÊN BẢN MỚI</div>
        <strong>{manifest?.title || 'Đang kiểm tra phiên bản mới'}</strong>
        {manifest && <span className="pwa-update-prompt__version">Phiên bản {manifest.version}</span>}
        <p>{manifest?.summary || notice}</p>
      </div>

      {manifest && phase !== 'loading-info' && (
        <div className="pwa-update-prompt__details">
          {manifest.sections.map((section) => (
            <section key={section.heading}>
              <h3>{section.heading}</h3>
              <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
          ))}
          {manifest.compatibility.length > 0 && (
            <section>
              <h3>Tương thích</h3>
              <ul>{manifest.compatibility.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
          )}
          {manifest.warnings.length > 0 && (
            <section className="pwa-update-prompt__warnings">
              <h3>Lưu ý vận hành</h3>
              <ul>{manifest.warnings.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
          )}
          <div className="pwa-update-prompt__download-size">
            Dung lượng cần tải: <strong>{formatBytes(totalBytes)}</strong>
          </div>
        </div>
      )}

      {phase === 'downloading' && (
        <div className="pwa-update-prompt__progress">
          <div className="pwa-update-prompt__progress-meta">
            <span>Đang tải tài nguyên</span>
            <strong>{progressPercent}%</strong>
          </div>
          <div className="pwa-update-prompt__progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent}>
            <span style={{ width: progressPercent + '%' }} />
          </div>
          <small>{progress.completed}/{progress.total} tài nguyên · {formatBytes(progress.bytesDownloaded)} / {formatBytes(progress.totalBytes)}</small>
        </div>
      )}

      {(phase === 'staged' || phase === 'activating') && (
        <div className="pwa-update-prompt__handoff" role="status" aria-live="polite">
          <span className="pwa-update-prompt__status-dot" />
          <div>
            <strong>{phase === 'activating' ? 'Đang kích hoạt phiên bản mới' : 'Đã tải và xác minh hoàn tất'}</strong>
            <p>{blockReason || notice}</p>
          </div>
        </div>
      )}

      {phase === 'error' && <p className="pwa-update-prompt__error" role="alert">{notice}</p>}

      <div className="pwa-update-prompt__actions">
        {phase === 'available' && (
          <>
            <button type="button" className="pwa-update-prompt__later" onClick={() => {
              dismissedBuildId.current = manifest?.buildId ?? null;
              waitingWorkerRef.current = null;
              setWaitingWorker(null);
            }}>Để sau</button>
            <button type="button" className="pwa-update-prompt__apply" onClick={startDownload}>Tải và cập nhật</button>
          </>
        )}
        {phase === 'error' && manifest && (
          <>
            <button type="button" className="pwa-update-prompt__later" onClick={() => {
              dismissedBuildId.current = manifest.buildId;
              waitingWorkerRef.current = null;
              setWaitingWorker(null);
            }}>Để sau</button>
            <button type="button" className="pwa-update-prompt__apply" onClick={startDownload}>Thử tải lại</button>
          </>
        )}
        {phase === 'error' && !manifest && (
          <button type="button" className="pwa-update-prompt__apply" onClick={() => retryInfoRef.current()}>Thử kiểm tra lại</button>
        )}
        {phase === 'loading-info' && <span className="pwa-update-prompt__loading">Đang kiểm tra thông tin phiên bản…</span>}
        {phase === 'downloading' && <span className="pwa-update-prompt__loading">Không đóng ứng dụng trong khi tải</span>}
      </div>
    </aside>
  );
}
