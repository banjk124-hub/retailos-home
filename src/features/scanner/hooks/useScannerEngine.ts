import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { type ScannerLifecycleObserver, type ScannerLifecycleState, type ScannerSession, type ScannerSourceScanRegion, type ScannerTorchState } from '../../../platform/scanner/contracts';
import { UniversalScannerSession } from '../../../platform/scanner/universalScannerSession';
import { playScannerFeedback } from '../services/scannerFeedback';
import { getEnabledScannerSymbologies } from '../services/scannerSettingsStore';
import { unlockScannerAudio } from '../services/scannerAudio';
import type { CameraLeaseRequest } from '../../../shared/services/cameraSession';
import { DEFAULT_SCANNER_CAMERA_REQUEST, type ScannerCameraRequest } from '../../../platform/scanner/contracts';
import { ScannerPageLifecycleCoordinator } from '../../../platform/scanner/scannerPageLifecycleCoordinator';

export type ScannerMode = 'single' | 'continuous';

const EMPTY_TORCH_STATE: ScannerTorchState = { supported: false, enabled: false, pending: false };
type Options = {
  onDetected: (value: string) => void;
  mode?: ScannerMode;
  scanCooldownMs?: number;
  cameraLeaseRequest?: CameraLeaseRequest | null;
  /** Optional observer; the engine binds events to the real platform session ID. */
  lifecycleObserver?: ScannerLifecycleObserver;
};

function isDocumentHidden(): boolean {
  return typeof document !== 'undefined' && document.visibilityState === 'hidden';
}

/** React bridge only: camera/decoder lifecycle stays in the platform session. */
export function useScannerEngine({
  onDetected,
  mode = 'single',
  scanCooldownMs = 700,
  cameraLeaseRequest = null,
  lifecycleObserver,
}: Options) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoSurfaceKey, setVideoSurfaceKey] = useState(0);
  const videoSurfaceKeyRef = useRef(0);
  const pendingVideoSurfaceRef = useRef<{
    key: number;
    resolve: (video: HTMLVideoElement | null) => void;
  } | null>(null);
  const sessionRef = useRef<ScannerSession | null>(null);
  // A session detached during foreground recovery may still need to publish
  // its terminal close milestones if the feature closes before replacement.
  const recoveryRetiredSessionRef = useRef<ScannerSession | null>(null);
  const cameraLeaseRequestRef = useRef(cameraLeaseRequest);
  // Keep the initiating module's intent after its one-shot lease request is
  // claimed; foreground recovery creates a new session and reacquires using it.
  const cameraRequestRef = useRef<ScannerCameraRequest>(
    cameraLeaseRequest?.cameraRequest ?? DEFAULT_SCANNER_CAMERA_REQUEST,
  );
  const onDetectedRef = useRef(onDetected);
  const lifecycleObserverRef = useRef(lifecycleObserver);
  lifecycleObserverRef.current = lifecycleObserver;
  const desiredActiveRef = useRef(true);
  const pageVisibleRef = useRef(!isDocumentHidden());
  const recoveryRequiredRef = useRef(false);
  const recoveryPromiseRef = useRef<Promise<void> | null>(null);
  const startPromiseRef = useRef<Promise<void> | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [isPreviewReady, setIsPreviewReady] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');
  const [torch, setTorch] = useState<ScannerTorchState>(EMPTY_TORCH_STATE);
  const lastUiStateChangeAtRef = useRef(performance.now());
  const mountedRef = useRef(false);

  useEffect(() => { onDetectedRef.current = onDetected; }, [onDetected]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Resolve only after React has committed the replacement <video> node.
  useLayoutEffect(() => {
    const pending = pendingVideoSurfaceRef.current;
    if (!pending || pending.key !== videoSurfaceKey || !videoRef.current) return;
    pendingVideoSurfaceRef.current = null;
    pending.resolve(videoRef.current);
  }, [videoSurfaceKey]);

  useEffect(() => () => {
    const pending = pendingVideoSurfaceRef.current;
    pendingVideoSurfaceRef.current = null;
    pending?.resolve(null);
  }, []);

  useEffect(() => {
    const now = performance.now();
    console.info('[RetailOS Scanner] UI commit', {
      phase: isScanning ? 'scanning' : isStarting ? 'starting' : error ? 'error' : 'idle',
      phaseCommitIntervalMs: Number((now - lastUiStateChangeAtRef.current).toFixed(1)),
    });
    lastUiStateChangeAtRef.current = now;
  }, [isStarting, isScanning, error]);

  const replaceVideoSurface = useCallback((): Promise<HTMLVideoElement | null> => {
    const nextKey = videoSurfaceKeyRef.current + 1;
    videoSurfaceKeyRef.current = nextKey;
    return new Promise((resolve) => {
      pendingVideoSurfaceRef.current = { key: nextKey, resolve };
      setVideoSurfaceKey(nextKey);
    });
  }, []);

  const createSession = useCallback((video: HTMLVideoElement): ScannerSession => {
    setTorch(EMPTY_TORCH_STATE);
    let session: ScannerSession;
    session = new UniversalScannerSession(video, {
      profile: 'HIGH',
      formats: getEnabledScannerSymbologies(),
      mode,
      sameCodeCooldownMs: scanCooldownMs,
      lifecycleObserver: (event) => lifecycleObserverRef.current?.(event),
      onTorchStateChange: (state) => {
        if (mountedRef.current && sessionRef.current === session) setTorch(state);
      },
      onResult: (result) => {
        // Ignore callbacks from a retired session after recovery has detached it.
        if (sessionRef.current !== session) return;
        console.info('[RetailOS Scanner] Result delivered to feature callback', {
          session: session.id,
          symbology: result.symbology,
          valueLength: result.value.length,
          mode,
        });
        // A single-result session is terminal for this mounted scanner.
        // Prevent visibility/page lifecycle recovery from reopening the
        // camera while its owning feature plays the exit transition.
        if (mode === 'single') desiredActiveRef.current = false;
        onDetectedRef.current(result.value);
        try {
          playScannerFeedback();
        } catch (feedbackError) {
          console.warn('[RetailOS Scanner] Feedback failed after barcode delivery:', feedbackError);
        }
      },
      onStateChange: (state: ScannerLifecycleState) => {
        if (!mountedRef.current || sessionRef.current !== session) return;
        if (state === 'requesting' || state === 'suspended' || state === 'stopped' || state === 'error' || state === 'disposed') {
          setIsPreviewReady(false);
        }
        setIsStarting(state === 'requesting' || state === 'initializing');
        setIsScanning(state === 'scanning');
        if (state === 'disposed' || state === 'stopped' || state === 'suspended') setIsScanning(false);
      },
      onPreviewReady: () => {
        if (mountedRef.current && sessionRef.current === session) setIsPreviewReady(true);
      },
      onError: (scannerError) => {
        if (!mountedRef.current || sessionRef.current !== session) return;
        setError(scannerError.message);
        setIsStarting(false);
        // A decoder fault does not imply that getUserMedia or the video
        // track stopped. Keep the live preview/scanning state truthful.
        setIsScanning(sessionRef.current?.state === 'scanning');
      },
    }, cameraLeaseRequestRef.current ?? undefined, cameraRequestRef.current);
    cameraLeaseRequestRef.current = null;
    sessionRef.current = session;
    recoveryRetiredSessionRef.current = null;
    return session;
  }, [mode, scanCooldownMs]);

  const startScanner = useCallback(async () => {
    if (!desiredActiveRef.current || !pageVisibleRef.current || isDocumentHidden()) return;
    if (startPromiseRef.current) {
      const pendingStart = startPromiseRef.current;
      await pendingStart;
      // A hide/suspend can invalidate an in-flight getUserMedia request. If the
      // page becomes visible again before that request settles, retry instead
      // of treating the stale promise as a successful camera start.
      if (!desiredActiveRef.current || !pageVisibleRef.current || isDocumentHidden()) return;
      if (sessionRef.current?.state === 'scanning') return;
      if (startPromiseRef.current && startPromiseRef.current !== pendingStart) {
        return startPromiseRef.current;
      }
      // The previous attempt has settled. Continue with the current video
      // surface and create a new session if recovery retired the previous one.
    }
    const video = videoRef.current;
    if (!video) return;
    setError('');
    setIsPreviewReady(false);
    setIsStarting(true);

    const start = (async () => {
      let session = sessionRef.current;
      if (!session || session.state === 'disposed') {
        session = createSession(video);
      }
      await session.start();
    })();

    startPromiseRef.current = start;
    try {
      await start;
    } finally {
      // A previous start attempt must not overwrite the UI state of a newer
      // attempt that began after a visibility suspend/resume transition.
      if (startPromiseRef.current === start) {
        startPromiseRef.current = null;
        if (mountedRef.current && desiredActiveRef.current && pageVisibleRef.current && !isDocumentHidden()) setIsStarting(false);
      }
    }
  }, [createSession]);

  const pauseScanner = useCallback(async () => {
    // A tap-started lease may still be waiting for the scanner component/session
    // handoff. Cancel that unclaimed request while backgrounded; otherwise iOS
    // can return with a pre-background stream that is no longer producing frames.
    const pendingLeaseRequest = cameraLeaseRequestRef.current;
    cameraLeaseRequestRef.current = null;
    pendingLeaseRequest?.cancel();

    // The page lifecycle coordinator serializes this suspension before any
    // foreground recovery. The old session is retired only after suspension.
    try {
      await sessionRef.current?.suspend('hidden');
    } catch (suspendError) {
      console.warn('[RetailOS Scanner] Background suspension failed; foreground will retire the old session:', suspendError);
    } finally {
      // Keep the old start promise registered until its in-flight camera lease
      // handoff settles. Recovery waits for it before acquiring a new lease.
      // This prevents two generations from racing the shared stream ref-count.
      recoveryRequiredRef.current = true;
    }
  }, []);

  const recoverScanner = useCallback(async () => {
    if (!desiredActiveRef.current || !pageVisibleRef.current || isDocumentHidden()) return;
    if (recoveryPromiseRef.current) return recoveryPromiseRef.current;

    const recovery = (async () => {
      setError('');
      setIsPreviewReady(false);
      setIsScanning(false);
      setTorch(EMPTY_TORCH_STATE);
      setIsStarting(true);

      // Detach the old session first so late callbacks cannot mutate the new UI.
      const previousSession = sessionRef.current;
      sessionRef.current = null;
      // Keep only the recovery-retired session, not a presentation owner.
      // If the feature closes before replacement, close() can still publish
      // the old session's terminal technical milestones after recovery ends.
      if (previousSession) recoveryRetiredSessionRef.current = previousSession;
      await previousSession?.disposeForRecovery();

      if (!desiredActiveRef.current || !pageVisibleRef.current || isDocumentHidden()) return;

      // WebKit may retain a stale native presentation layer on a reused video
      // node. Replace only that disposable surface, then use the normal startup
      // pipeline (stream attach -> play -> fresh frame -> decoder). The feature
      // owns DOM geometry; the platform session does not wait for a layout barrier.
      const video = await replaceVideoSurface();
      if (!video || !desiredActiveRef.current || !pageVisibleRef.current || isDocumentHidden()) return;

      recoveryRequiredRef.current = false;
      await startScanner();
    })();

    recoveryPromiseRef.current = recovery;
    try {
      await recovery;
    } catch (recoveryError) {
      console.error('[RetailOS Scanner] Foreground recovery failed:', recoveryError);
      if (mountedRef.current) {
        setError(recoveryError instanceof Error ? recoveryError.message : 'Không thể khôi phục camera. Hãy thử kết nối lại.');
        setIsStarting(false);
      }
    } finally {
      if (recoveryPromiseRef.current === recovery) recoveryPromiseRef.current = null;
    }
  }, [replaceVideoSurface, startScanner]);

  const setTorchEnabled = useCallback((enabled: boolean): Promise<ScannerTorchState> => {
    const session = sessionRef.current;
    if (!session) return Promise.resolve(EMPTY_TORCH_STATE);
    return session.setTorchEnabled(enabled);
  }, []);

  const setScanRegion = useCallback((region: ScannerSourceScanRegion | null) => {
    // Region publication is an in-place session update. It must not alter
    // session generation, decoder ownership, frame cadence or camera leases.
    sessionRef.current?.setScanRegion(region);
  }, []);

  const closeScanner = useCallback(async () => {
    desiredActiveRef.current = false;
    const pendingLeaseRequest = cameraLeaseRequestRef.current;
    cameraLeaseRequestRef.current = null;
    pendingLeaseRequest?.cancel();

    // If close races a foreground recovery, let that serialized operation
    // finish its retirement boundary before closing whichever session remains.
    await recoveryPromiseRef.current?.catch(() => undefined);
    const session = sessionRef.current ?? recoveryRetiredSessionRef.current;
    sessionRef.current = null;
    recoveryRetiredSessionRef.current = null;
    await session?.close();
    if (mountedRef.current) {
      setTorch(EMPTY_TORCH_STATE);
      setIsStarting(false);
      setIsPreviewReady(false);
      setIsScanning(false);
    }
  }, []);

  useEffect(() => {
    desiredActiveRef.current = true;
    pageVisibleRef.current = !isDocumentHidden();

    const coordinator = new ScannerPageLifecycleCoordinator(
      pageVisibleRef.current,
      async () => {
        await pauseScanner();
      },
      async () => {
        // Event handlers update pageVisibleRef synchronously. Do not let an
        // older queued transition overwrite a newer browser visibility signal.
        if (!desiredActiveRef.current || !pageVisibleRef.current || isDocumentHidden()) return;
        if (recoveryRequiredRef.current) await recoverScanner();
        else await startScanner();
      },
    );

    // Initial startup uses the same serialized path as every later resume.
    if (pageVisibleRef.current) void coordinator.transition(true, true);

    const handleVisibility = () => {
      const visible = !isDocumentHidden();
      pageVisibleRef.current = visible;
      void coordinator.transition(visible);
    };
    const handlePageHide = () => {
      console.info('[RetailOS Scanner] Page lifecycle', { pageLifecycle: 'pagehide' });
      pageVisibleRef.current = false;
      void coordinator.transition(false);
    };
    const handlePageShow = () => {
      console.info('[RetailOS Scanner] Page lifecycle', { pageLifecycle: 'pageshow' });
      const visible = !isDocumentHidden();
      pageVisibleRef.current = visible;
      if (!visible) return;

      // pageshow may restore a BFCache page without a fresh visibility edge.
      // Force reconciliation only when the session is not already scanning;
      // duplicate lifecycle signals are coalesced by the start guard.
      void coordinator.transition(true, Boolean(sessionRef.current && sessionRef.current.state !== 'scanning' && !startPromiseRef.current));
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);
    return () => {
      desiredActiveRef.current = false;
      pageVisibleRef.current = false;
      coordinator.dispose();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
      const pendingLeaseRequest = cameraLeaseRequestRef.current;
      cameraLeaseRequestRef.current = null;
      pendingLeaseRequest?.cancel();
      const pendingSurface = pendingVideoSurfaceRef.current;
      pendingVideoSurfaceRef.current = null;
      pendingSurface?.resolve(null);
      const session = sessionRef.current;
      sessionRef.current = null;
      void session?.close();
    };
  }, [pauseScanner, recoverScanner, startScanner]);

  return {
    videoRef, videoSurfaceKey, isStarting, isPreviewReady, isScanning, error, torch,
    setTorchEnabled, setScanRegion,
    startScanner, pauseScanner, closeScanner, prepareAudio: unlockScannerAudio,
  };
}
