import { useCallback, useEffect, useRef, useState } from 'react';
import { SUPPORTED_BARCODE_FORMATS, type ScannerLifecycleObserver, type ScannerLifecycleState, type ScannerSession } from '../../../platform/scanner/contracts';
import { UniversalScannerSession } from '../../../platform/scanner/universalScannerSession';
import { playScannerFeedback } from '../services/scannerFeedback';
import { unlockScannerAudio } from '../services/scannerAudio';
import type { CameraLeaseRequest } from '../../../shared/services/cameraSession';
import { ScannerPageLifecycleCoordinator } from '../../../platform/scanner/scannerPageLifecycleCoordinator';

export type ScannerMode = 'single' | 'continuous';
type Options = {
  onDetected: (value: string) => void;
  mode?: ScannerMode;
  scanCooldownMs?: number;
  audioFeedback?: boolean;
  hapticFeedback?: boolean;
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
  audioFeedback = true,
  hapticFeedback = true,
  cameraLeaseRequest = null,
  lifecycleObserver,
}: Options) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<ScannerSession | null>(null);
  // Retain the just-closed session until the feature reports presentation completion.
  const lifecycleSessionRef = useRef<ScannerSession | null>(null);
  const cameraLeaseRequestRef = useRef(cameraLeaseRequest);
  const onDetectedRef = useRef(onDetected);
  const lifecycleObserverRef = useRef(lifecycleObserver);
  lifecycleObserverRef.current = lifecycleObserver;
  const desiredActiveRef = useRef(true);
  const pageVisibleRef = useRef(!isDocumentHidden());
  const startPromiseRef = useRef<Promise<void> | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [isPreviewReady, setIsPreviewReady] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');
  const lastUiStateChangeAtRef = useRef(performance.now());
  const mountedRef = useRef(false);

  useEffect(() => { onDetectedRef.current = onDetected; }, [onDetected]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const now = performance.now();
    console.info('[RetailOS Scanner] UI commit', {
      phase: isScanning ? 'scanning' : isStarting ? 'starting' : error ? 'error' : 'idle',
      phaseCommitIntervalMs: Number((now - lastUiStateChangeAtRef.current).toFixed(1)),
    });
    lastUiStateChangeAtRef.current = now;
  }, [isStarting, isScanning, error]);

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
      // The awaited attempt has settled but did not reach SCANNING (for
      // example, visibility suspension invalidated its generation). Do not
      // return the same completed promise: fall through and create a fresh
      // start attempt for the still-active session.
    }
    const video = videoRef.current;
    if (!video) return;
    setError('');
    setIsPreviewReady(false);
    setIsStarting(true);

    const start = (async () => {
      let session = sessionRef.current;
      if (!session || session.state === 'disposed') {
        session = new UniversalScannerSession(video, {
          profile: 'HIGH',
          formats: [...SUPPORTED_BARCODE_FORMATS],
          mode,
          sameCodeCooldownMs: scanCooldownMs,
          audioFeedback,
          hapticFeedback,
          lifecycleObserver: (event) => lifecycleObserverRef.current?.(event),
          onResult: (result) => {
            // Deliver the decoded value to the owning module first. Feedback is
            // deliberately isolated so a sound/haptic failure cannot block the
            // business callback or leave single-scan mode running forever.
            console.info('[RetailOS Scanner] Result delivered to feature callback', {
              session: session?.id,
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
              playScannerFeedback({ audio: audioFeedback, haptic: hapticFeedback });
            } catch (feedbackError) {
              console.warn('[RetailOS Scanner] Feedback failed after barcode delivery:', feedbackError);
            }
          },
          onStateChange: (state: ScannerLifecycleState) => {
            if (!mountedRef.current) return;
            if (state === 'requesting' || state === 'suspended' || state === 'stopped' || state === 'error' || state === 'disposed') {
              setIsPreviewReady(false);
            }
            setIsStarting(state === 'requesting' || state === 'initializing');
            setIsScanning(state === 'scanning');
            if (state === 'disposed' || state === 'stopped' || state === 'suspended') setIsScanning(false);
          },
          onPreviewReady: () => {
            if (mountedRef.current) setIsPreviewReady(true);
          },
          onError: (scannerError) => {
            if (!mountedRef.current) return;
            setError(scannerError.message);
            setIsStarting(false);
            // A decoder fault does not imply that getUserMedia or the video
            // track stopped. Keep the live preview/scanning state truthful.
            setIsScanning(sessionRef.current?.state === 'scanning');
          },
        }, cameraLeaseRequestRef.current ?? undefined);
        cameraLeaseRequestRef.current = null;
        sessionRef.current = session;
        lifecycleSessionRef.current = session;
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
  }, [audioFeedback, hapticFeedback, mode, scanCooldownMs]);

  const pauseScanner = useCallback(async () => {
    // A tap-started lease may still be waiting for the scanner component/session
    // handoff. Cancel that unclaimed request while backgrounded; otherwise iOS
    // can return with a pre-background stream that is no longer producing frames.
    const pendingLeaseRequest = cameraLeaseRequestRef.current;
    cameraLeaseRequestRef.current = null;
    pendingLeaseRequest?.cancel();

    // The page lifecycle coordinator serializes this suspension before any
    // foreground resume. Do not write UI state after awaiting teardown.
    await sessionRef.current?.suspend('hidden');
  }, []);

  const notifyExitPresentation = useCallback(() => {
    const session = lifecycleSessionRef.current ?? sessionRef.current;
    lifecycleSessionRef.current = null;
    session?.notifyExitPresentation();
  }, []);

  const closeScanner = useCallback(async () => {
    desiredActiveRef.current = false;
    const session = sessionRef.current;
    sessionRef.current = null;
    await session?.close();
    if (mountedRef.current) {
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
        await startScanner();
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
      // duplicate pageshow/visibility signals are coalesced by the start guard.
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
      const session = sessionRef.current;
      sessionRef.current = null;
      void session?.close();
    };
  }, [pauseScanner, startScanner]);

  return {
    videoRef, isStarting, isPreviewReady, isScanning, error, startScanner, pauseScanner, closeScanner,
    prepareAudio: unlockScannerAudio, notifyExitPresentation,
  };
}