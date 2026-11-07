import { useCallback, useEffect, useRef, useState } from 'react';
import type { ScannerLifecycleState, ScannerSession } from '../../../platform/scanner/contracts';
import { UniversalScannerSession } from '../../../platform/scanner/universalScannerSession';
import { playScannerFeedback } from '../services/scannerFeedback';
import { unlockScannerAudio } from '../services/scannerAudio';

export type ScannerMode = 'single' | 'continuous';
type Options = {
  onDetected: (value: string) => void;
  mode?: ScannerMode;
  scanCooldownMs?: number;
  audioFeedback?: boolean;
  hapticFeedback?: boolean;
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
}: Options) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<ScannerSession | null>(null);
  const onDetectedRef = useRef(onDetected);
  const desiredActiveRef = useRef(true);
  const recoveryAttemptsRef = useRef(0);
  const startPromiseRef = useRef<Promise<void> | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { onDetectedRef.current = onDetected; }, [onDetected]);

  const startScanner = useCallback(async () => {
    if (!desiredActiveRef.current || isDocumentHidden()) return;
    if (startPromiseRef.current) {
      const pendingStart = startPromiseRef.current;
      await pendingStart;
      // A hide/suspend can invalidate an in-flight getUserMedia request. If the
      // page becomes visible again before that request settles, retry instead
      // of treating the stale promise as a successful camera start.
      if (!desiredActiveRef.current || isDocumentHidden()) return;
      if (sessionRef.current?.state === 'scanning') return;
      if (startPromiseRef.current && startPromiseRef.current !== pendingStart) {
        return startPromiseRef.current;
      }
    }
    const video = videoRef.current;
    if (!video) return;
    setError('');
    setIsStarting(true);

    const start = (async () => {
      let session = sessionRef.current;
      if (!session || session.state === 'disposed') {
        session = new UniversalScannerSession(video, {
          profile: 'HIGH',
          formats: [
            'EAN_8', 'EAN_13', 'UPC_A', 'UPC_E',
            'CODE_128', 'CODE_39', 'CODE_93', 'ITF', 'CODABAR',
            'QR_CODE', 'DATA_MATRIX', 'PDF_417', 'AZTEC',
            'RSS_14', 'RSS_EXPANDED',
          ],
          mode,
          sameCodeCooldownMs: scanCooldownMs,
          audioFeedback,
          hapticFeedback,
          onResult: (result) => {
            // Deliver the decoded value to the owning module first. Feedback is
            // deliberately isolated so a sound/haptic failure cannot block the
            // business callback or leave single-scan mode running forever.
            onDetectedRef.current(result.value);
            try {
              playScannerFeedback({ audio: audioFeedback, haptic: hapticFeedback });
            } catch (feedbackError) {
              console.warn('[RetailOS Scanner] Feedback failed after barcode delivery:', feedbackError);
            }
          },
          onStateChange: (state: ScannerLifecycleState) => {
            setIsStarting(state === 'requesting' || state === 'initializing');
            setIsScanning(state === 'scanning');
            if (state === 'scanning') recoveryAttemptsRef.current = 0;
            if (state === 'disposed' || state === 'stopped' || state === 'suspended') setIsScanning(false);
          },
          onError: (scannerError) => {
            setError(scannerError.message);
            setIsStarting(false);
            // A decoder fault does not imply that getUserMedia or the video
            // track stopped. Keep the live preview/scanning state truthful.
            setIsScanning(sessionRef.current?.state === 'scanning');
          },
        });
        sessionRef.current = session;
      }
      await session.start();
    })();

    startPromiseRef.current = start;
    try {
      await start;
    } finally {
      if (startPromiseRef.current === start) startPromiseRef.current = null;
      setIsStarting(false);
    }
  }, [audioFeedback, hapticFeedback, mode, scanCooldownMs]);

  const pauseScanner = useCallback(async () => {
    await sessionRef.current?.suspend('hidden');
    setIsStarting(false);
    setIsScanning(false);
  }, []);

  const closeScanner = useCallback(async () => {
    desiredActiveRef.current = false;
    const session = sessionRef.current;
    sessionRef.current = null;
    await session?.close();
    setIsStarting(false);
    setIsScanning(false);
  }, []);

  useEffect(() => {
    desiredActiveRef.current = true;
    void startScanner();

    const handleVisibility = () => {
      if (isDocumentHidden()) {
        void pauseScanner();
        return;
      }
      if (!desiredActiveRef.current) return;
      if (recoveryAttemptsRef.current >= 2) {
        setError('Camera đã bị gián đoạn nhiều lần. Hãy nhấn thử lại để kết nối.');
        return;
      }
      recoveryAttemptsRef.current += 1;
      void startScanner();
    };
    const handlePageShow = () => {
      if (!isDocumentHidden() && desiredActiveRef.current && sessionRef.current?.state !== 'scanning') {
        void startScanner();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pageshow', handlePageShow);
    return () => {
      desiredActiveRef.current = false;
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pageshow', handlePageShow);
      const session = sessionRef.current;
      sessionRef.current = null;
      void session?.close();
    };
  }, [pauseScanner, startScanner]);

  return {
    videoRef, isStarting, isScanning, error, startScanner, pauseScanner, closeScanner,
    prepareAudio: unlockScannerAudio,
  };
}