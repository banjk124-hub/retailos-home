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
  return document.visibilityState === 'hidden';
}

/** React bridge only: feature callbacks and presentation stay outside runtime. */
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
  const [isStarting, setIsStarting] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { onDetectedRef.current = onDetected; }, [onDetected]);

  const startScanner = useCallback(async () => {
    if (!desiredActiveRef.current || isDocumentHidden()) return;
    const video = videoRef.current;
    if (!video) return;
    setError('');
    setIsStarting(true);

    let session = sessionRef.current;
    if (!session || session.state === 'disposed') {
      session = new UniversalScannerSession(video, {
        profile: 'HIGH',
        formats: ['EAN_8', 'EAN_13', 'CODE_128'],
        mode,
        sameCodeCooldownMs: scanCooldownMs,
        audioFeedback,
        hapticFeedback,
        onResult: (result) => {
          playScannerFeedback({ audio: audioFeedback, haptic: hapticFeedback });
          onDetectedRef.current(result.value);
        },
        onStateChange: (state: ScannerLifecycleState) => {
          setIsStarting(state === 'requesting' || state === 'initializing');
          setIsScanning(state === 'scanning');
          if (state === 'disposed' || state === 'stopped' || state === 'suspended') setIsScanning(false);
        },
        onError: (scannerError) => {
          setError(scannerError.message);
          setIsStarting(false);
          setIsScanning(false);
        },
      });
      sessionRef.current = session;
    }
    try {
      await session.start();
    } finally {
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
      if (recoveryAttemptsRef.current >= 1) {
        setError('Camera đã bị gián đoạn. Hãy nhấn thử lại để kết nối.');
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
    videoRef,
    isStarting,
    isScanning,
    error,
    startScanner,
    pauseScanner,
    closeScanner,
    prepareAudio: unlockScannerAudio,
  };
}
