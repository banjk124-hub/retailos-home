import { useCallback, useEffect, useRef, useState } from 'react';
import './pwa-update-prompt.css';

declare const __RETAILOS_BUILD_ID__: string;
import { registerRetailOsServiceWorker } from './serviceWorkerRegistration';
import { getPwaUpdateBlockReason } from './updateSafety';
import { readUpdateCenterEntry, writeUpdateCenterEntry } from './updateCenterStore';

declare const __RETAILOS_APP_VERSION__: string;

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
type WorkerReply = {
  type?: string;
  manifest?: ReleaseManifest;
  staged?: boolean;
  staging?: boolean;
  progress?: { completed: number; total: number; bytesDownloaded: number; totalBytes: number } | null;
  message?: string;
};

function formatBytes(value: number): string {
  if (value < 1024) return value + ' B';
  if (value < 1024 * 1024) return (value / 1024).toFixed(1) + ' KB';
  return (value / (1024 * 1024)).toFixed(1) + ' MB';
}

function requestWorkerMessage(worker: ServiceWorker, message: unknown, timeoutMs = 8000): Promise<WorkerReply | null> {
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
  const manifestRef = useRef<ReleaseManifest | null>(null);
  manifestRef.current = manifest;
  const [phase, setPhase] = useState<UpdatePhase>('loading-info');
  const [progress, setProgress] = useState({ completed: 0, total: 0, bytesDownloaded: 0, totalBytes: 0 });
  const [notice, setNotice] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [isDeferred, setIsDeferred] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);
  const stagedRef = useRef(false);
  const activationRequestedRef = useRef(false);
  const isApplyingUpdate = useRef(false);
  const hasReloaded = useRef(false);

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
    setNotice('Đã xác nhận cập nhật. RetailOS đang chuyển phiên bản tại thời điểm an toàn.');
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
    if (manifest) writeUpdateCenterEntry({ buildId: manifest.buildId, version: manifest.version, title: manifest.title, summary: manifest.summary, status: 'downloading', updatedAt: new Date().toISOString() });
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
        if (manifest) writeUpdateCenterEntry({ buildId: manifest.buildId, version: manifest.version, title: manifest.title, summary: manifest.summary, status: 'error', updatedAt: new Date().toISOString() });
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
        setNotice('Đã tải và xác minh toàn bộ tài nguyên. Hãy xác nhận cập nhật khi đã sẵn sàng.');
        if (manifest) writeUpdateCenterEntry({ buildId: manifest.buildId, version: manifest.version, title: manifest.title, summary: manifest.summary, status: 'staged', updatedAt: new Date().toISOString() });
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

    const loadCandidateInfo = async (worker: ServiceWorker) => {
      waitingWorkerRef.current = worker;
      stagedRef.current = false;
      activationRequestedRef.current = false;
      setWaitingWorker(worker);
      setManifest(null);
      manifestRef.current = null;
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
        || !Array.isArray(nextManifest.resources)
        || !nextManifest.resources.length
      ) {
        setPhase('error');
        setNotice('Manifest phiên bản không hợp lệ. RetailOS giữ nguyên phiên bản đang chạy.');
        return;
      }
      // A waiting worker can be redundant after a deployment that republishes
      // the same build. Matching IDs mean there is no update, not bad metadata.
      // Dismiss it quietly so the prompt cannot become stranded in an error loop.
      if (nextManifest.buildId === __RETAILOS_BUILD_ID__) {
        setWaitingWorker(null);
        waitingWorkerRef.current = null;
        setManifest(null);
        manifestRef.current = null;
        setPhase('available');
        setNotice('');
        return;
      }
      const persistedUpdate = readUpdateCenterEntry();
      const deferred = persistedUpdate?.buildId === nextManifest.buildId && persistedUpdate.status === 'deferred';
      setIsDeferred(deferred);
      manifestRef.current = nextManifest;
      setManifest(nextManifest);
      writeUpdateCenterEntry({ buildId: nextManifest.buildId, version: nextManifest.version, title: nextManifest.title, summary: nextManifest.summary, status: deferred ? 'deferred' : response.staged === true ? 'staged' : 'available', updatedAt: new Date().toISOString() });
      if (response.staged === true) {
        stagedRef.current = true;
        const totalBytes = nextManifest.resources.reduce((sum, resource) => sum + resource.size, 0);
        setProgress({
          completed: nextManifest.resources.length,
          total: nextManifest.resources.length,
          bytesDownloaded: totalBytes,
          totalBytes,
        });
        setPhase('staged');
        setNotice('Phiên bản đã được tải và xác minh. Hãy xác nhận cập nhật khi đã sẵn sàng.');
        return;
        return;
      }
      if (response.staging === true) {
        const currentProgress = response.progress;
        setProgress({
          completed: currentProgress?.completed ?? 0,
          total: currentProgress?.total ?? nextManifest.resources.length,
          bytesDownloaded: currentProgress?.bytesDownloaded ?? 0,
          totalBytes: currentProgress?.totalBytes ?? nextManifest.resources.reduce((sum, resource) => sum + resource.size, 0),
        });
        setPhase('downloading');
        setNotice('Đang tiếp tục tải phiên bản đã được bạn chấp thuận. Bản hiện tại vẫn hoạt động.');
        return;
      }
      setPhase('available');
      setNotice('');
      if (deferred) setIsExpanded(false);
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
      if (!isApplyingUpdate.current || hasReloaded.current) return;
      hasReloaded.current = true;
      window.location.reload();
    };
    const handleWorkerMessage = (event: MessageEvent) => {
      const message = event.data;
      const currentManifest = manifestRef.current;
      if (currentManifest && message?.buildId === currentManifest.buildId) {
        if (message.type === 'RELEASE_DOWNLOAD_PROGRESS') {
          setPhase('downloading');
          setProgress({
            completed: message.completed ?? 0,
            total: message.total ?? currentManifest.resources.length,
            bytesDownloaded: message.bytesDownloaded ?? 0,
            totalBytes: message.totalBytes ?? 0,
          });
        }
        if (message.type === 'RELEASE_STAGED') {
          stagedRef.current = true;
          setProgress({
            completed: message.completed ?? currentManifest.resources.length,
            total: message.total ?? currentManifest.resources.length,
            bytesDownloaded: message.totalBytes ?? 0,
            totalBytes: message.totalBytes ?? 0,
          });
          setPhase('staged');
          setNotice('Đã tải và xác minh toàn bộ tài nguyên. Hãy xác nhận cập nhật khi đã sẵn sàng.');
          writeUpdateCenterEntry({ buildId: currentManifest.buildId, version: currentManifest.version, title: currentManifest.title, summary: currentManifest.summary, status: 'staged', updatedAt: new Date().toISOString() });
        }
        if (message.type === 'RELEASE_STAGE_FAILED') {
          stagedRef.current = false;
          activationRequestedRef.current = false;
          isApplyingUpdate.current = false;
          setPhase('error');
          setNotice(message.message || 'Không thể tải đầy đủ phiên bản mới. Bản hiện tại vẫn được giữ nguyên.');
          writeUpdateCenterEntry({ buildId: currentManifest.buildId, version: currentManifest.version, title: currentManifest.title, summary: currentManifest.summary, status: 'error', updatedAt: new Date().toISOString() });
        }
      }
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
        stagedRef.current = false;
        activationRequestedRef.current = false;
        isApplyingUpdate.current = false;
        setPhase('error');
        setNotice('Phiên bản chưa được tải và xác minh đầy đủ. Hãy thử tải lại.');
      }
      if (event.data?.type === 'UPDATE_ACTIVATION_FAILED') {
        activationRequestedRef.current = false;
        isApplyingUpdate.current = false;
        setPhase('staged');
        setNotice('Tài nguyên đã sẵn sàng nhưng trình duyệt chưa thể chuyển phiên bản. RetailOS sẽ tự thử lại khi có thể.');
      }
    };
    const retrySafeActivation = () => {
      const reason = getPwaUpdateBlockReason();
      setBlockReason(reason || '');
    };
    const handleUpdateCenterOpen = () => { setIsDeferred(false); setIsExpanded(true); };
    window.addEventListener('retailos:update-center-open', handleUpdateCenterOpen);
    const safetyEvents = ['input', 'change', 'focusout', 'reset'];
    safetyEvents.forEach((name) => document.addEventListener(name, retrySafeActivation));
    window.addEventListener('retailos:update-safety-changed', retrySafeActivation);
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
      window.removeEventListener('retailos:update-safety-changed', retrySafeActivation);
      window.removeEventListener('retailos:update-center-open', handleUpdateCenterOpen);
      window.removeEventListener('focus', retrySafeActivation);
      document.removeEventListener('visibilitychange', retrySafeActivation);
      retryInfoRef.current = () => undefined;
      navigator.serviceWorker.removeEventListener('message', handleWorkerMessage);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, [tryActivate]);

  const currentBlockReason = getPwaUpdateBlockReason();
  const isBusinessBusy = Boolean(currentBlockReason);
  useEffect(() => { setIsExpanded(!isBusinessBusy); }, [isBusinessBusy]);
  if (!waitingWorker || isDeferred) return null;

  const totalBytes = manifest?.resources.reduce((sum, resource) => sum + resource.size, 0) ?? 0;
  const progressPercent = progress.totalBytes > 0
    ? Math.min(100, Math.round((progress.bytesDownloaded / progress.totalBytes) * 100))
    : progress.total > 0 ? Math.min(100, Math.round((progress.completed / progress.total) * 100)) : 0;

  return (
    <aside className={`pwa-update-prompt ${isBusinessBusy ? 'is-busy' : 'is-modal'} ${isExpanded ? 'is-expanded' : 'is-collapsed'}`} role="region" aria-label="Cập nhật RetailOS" data-business-busy={isBusinessBusy ? 'true' : 'false'}>
      {isBusinessBusy && <button type="button" className="pwa-update-prompt__collapse" onClick={() => setIsExpanded((value) => !value)} aria-expanded={isExpanded}>{isExpanded ? 'Thu gọn' : 'Cập nhật đang chờ'}</button>}
      <div className="pwa-update-prompt__content">
      <div className="pwa-update-prompt__header">
        <div className="pwa-update-prompt__eyebrow">RETAILOS · PHIÊN BẢN MỚI</div>
        <strong>{manifest?.title || 'Đang kiểm tra phiên bản mới'}</strong>
        {manifest && <span className="pwa-update-prompt__version">Đang chạy {__RETAILOS_APP_VERSION__} · Bản mới {manifest.version}</span>}
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
              if (manifest) writeUpdateCenterEntry({ buildId: manifest.buildId, version: manifest.version, title: manifest.title, summary: manifest.summary, status: 'deferred', updatedAt: new Date().toISOString() });
              setIsDeferred(true);
            }}>Để sau</button>
            <button type="button" className="pwa-update-prompt__apply" onClick={startDownload}>Tải và cập nhật</button>
          </>
        )}
        {phase === 'error' && manifest && (
          <>
            <button type="button" className="pwa-update-prompt__later" onClick={() => {
              writeUpdateCenterEntry({ buildId: manifest.buildId, version: manifest.version, title: manifest.title, summary: manifest.summary, status: 'deferred', updatedAt: new Date().toISOString() });
              setIsDeferred(true);
            }}>Để sau</button>
            <button type="button" className="pwa-update-prompt__apply" onClick={startDownload}>Thử tải lại</button>
          </>
        )}
        {phase === 'error' && !manifest && (
          <button type="button" className="pwa-update-prompt__apply" onClick={() => retryInfoRef.current()}>Thử kiểm tra lại</button>
        )}
        {phase === 'loading-info' && <span className="pwa-update-prompt__loading">Đang kiểm tra thông tin phiên bản…</span>}
        {phase === 'downloading' && <span className="pwa-update-prompt__loading">Không đóng ứng dụng trong khi tải</span>}
        {phase === 'staged' && <>
          <button type="button" className="pwa-update-prompt__later" onClick={() => { if (manifest) writeUpdateCenterEntry({ buildId: manifest.buildId, version: manifest.version, title: manifest.title, summary: manifest.summary, status: 'deferred', updatedAt: new Date().toISOString() }); setIsDeferred(true); }}>Để sau</button>
          <button type="button" className="pwa-update-prompt__apply" disabled={isBusinessBusy} onClick={tryActivate}>Xác nhận cập nhật</button>
        </>}
        {phase === 'staged' && isBusinessBusy && <span className="pwa-update-prompt__loading">Đang chờ hoàn tất nghiệp vụ: {currentBlockReason}</span>}
      </div>
      </div>
    </aside>
  );
}
