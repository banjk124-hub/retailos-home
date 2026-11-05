import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { getCameraErrorMessage } from '../services/cameraErrors';
import { acquireCameraStream, releaseCameraStream } from '../../../shared/services/cameraSession';
import { playScannerBeep, unlockScannerAudio } from '../services/scannerAudio';

export type ScannerMode = 'single' | 'continuous';

const SUPPORTED_BARCODE_FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.CODE_128,
] as const;

type Options = {
  onDetected: (value: string) => void;
  mode?: ScannerMode;
  scanCooldownMs?: number;
  audioFeedback?: boolean;
};

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

// Keep visibility checks behind a function so TypeScript does not incorrectly
// narrow document.visibilityState across asynchronous camera operations.
function isDocumentHidden(): boolean {
  return document.visibilityState === 'hidden';
}

/**
 * Shared scanner engine hook.
 * Feature modules own their own presentation and call this hook for camera,
 * decoder, lifecycle, result and audio behavior.
 */
export function useScannerEngine({
  onDetected,
  mode = 'single',
  scanCooldownMs = 700,
  audioFeedback = true,
}: Options) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onDetectedRef = useRef(onDetected);
  const disposedRef = useRef(false);
  const desiredActiveRef = useRef(true);
  const startingRef = useRef(false);
  const restartRequestedRef = useRef(false);
  const startGenerationRef = useRef(0);
  const lastDetectedAtRef = useRef(0);
  const detectedOnceRef = useRef(false);
  const stopAfterAttachRef = useRef(false);
  const [isStarting, setIsStarting] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { onDetectedRef.current = onDetected; }, [onDetected]);

  const stopDecoder = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setIsScanning(false);
  }, []);

  const pauseScanner = useCallback(() => {
    startGenerationRef.current += 1;
    restartRequestedRef.current = false;
    stopDecoder();
    releaseCameraStream();
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsStarting(false);
  }, [stopDecoder]);

  const startScanner = useCallback(async () => {
    if (disposedRef.current || !desiredActiveRef.current || isDocumentHidden()) return;
    // A live decoder already owns this session. Focus/pageshow events must not
    // attach another decode loop to the same MediaStream.
    if (controlsRef.current) return;
    if (startingRef.current) {
      restartRequestedRef.current = true;
      return;
    }

    startingRef.current = true;
    restartRequestedRef.current = false;
    const generation = ++startGenerationRef.current;
    setIsStarting(true);
    setError('');
    detectedOnceRef.current = false;
    stopAfterAttachRef.current = false;

    try {
      const stream = await acquireCameraStream();
      if (
        disposedRef.current ||
        !desiredActiveRef.current ||
        isDocumentHidden() ||
        generation !== startGenerationRef.current ||
        !videoRef.current
      ) {
        releaseCameraStream();
        streamRef.current = null;
        return;
      }

      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();

      if (
        disposedRef.current ||
        !desiredActiveRef.current ||
        isDocumentHidden() ||
        generation !== startGenerationRef.current
      ) {
        releaseCameraStream();
        streamRef.current = null;
        return;
      }

      const hints = new Map<DecodeHintType, any>();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [...SUPPORTED_BARCODE_FORMATS]);
      const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 70 });
      const controls = await reader.decodeFromStream(stream, video, (result) => {
        if (!result || disposedRef.current || !desiredActiveRef.current) return;
        const value = result.getText();
        const format = result.getBarcodeFormat();
        const isValidEan = (format === BarcodeFormat.EAN_13 && /^\d{13}$/.test(value))
          || (format === BarcodeFormat.EAN_8 && /^\d{8}$/.test(value));
        const isValidCode128 = format === BarcodeFormat.CODE_128
          && value.length > 0
          && !/[\u0000-\u001f\u007f]/.test(value);
        if (!isValidEan && !isValidCode128) return;
        const now = Date.now();
        if (mode === 'single' && detectedOnceRef.current) return;
        if (mode === 'continuous' && now - lastDetectedAtRef.current < scanCooldownMs) return;

        detectedOnceRef.current = true;
        lastDetectedAtRef.current = now;
        if (audioFeedback) playScannerBeep();
        onDetectedRef.current(value);

        if (mode === 'single') {
          stopAfterAttachRef.current = true;
          controlsRef.current?.stop();
          controlsRef.current = null;
          setIsScanning(false);
        }
      });

      if (
        disposedRef.current ||
        !desiredActiveRef.current ||
        isDocumentHidden() ||
        generation !== startGenerationRef.current
      ) {
        controls.stop();
        return;
      }
      if (mode === 'single' && stopAfterAttachRef.current) {
        controls.stop();
        setIsScanning(false);
      } else {
        controlsRef.current = controls;
        setIsScanning(true);
      }
    } catch (cause) {
      if (!disposedRef.current && desiredActiveRef.current && !isAbortError(cause)) {
        setError(getCameraErrorMessage(cause));
        releaseCameraStream();
        streamRef.current = null;
      }
    } finally {
      startingRef.current = false;
      if (!disposedRef.current) setIsStarting(false);

      if (
        restartRequestedRef.current &&
        desiredActiveRef.current &&
        !disposedRef.current &&
        !isDocumentHidden()
      ) {
        restartRequestedRef.current = false;
        queueMicrotask(() => { void startScanner(); });
      }
    }
  }, [audioFeedback, mode, scanCooldownMs]);

  const closeScanner = useCallback(() => {
    desiredActiveRef.current = false;
    startGenerationRef.current += 1;
    restartRequestedRef.current = false;
    stopDecoder();
    releaseCameraStream();
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, [stopDecoder]);

  useEffect(() => {
    disposedRef.current = false;
    desiredActiveRef.current = true;
    void startScanner();

    const handleVisibilityChange = () => {
      if (isDocumentHidden()) {
        pauseScanner();
      } else if (desiredActiveRef.current && !disposedRef.current) {
        void startScanner();
      }
    };
    const resumeFromPageShow = () => {
      if (!isDocumentHidden() && desiredActiveRef.current) void startScanner();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', resumeFromPageShow);
    window.addEventListener('focus', resumeFromPageShow);

    return () => {
      disposedRef.current = true;
      desiredActiveRef.current = false;
      startGenerationRef.current += 1;
      restartRequestedRef.current = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', resumeFromPageShow);
      window.removeEventListener('focus', resumeFromPageShow);
      stopDecoder();
      releaseCameraStream();
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [pauseScanner, startScanner, stopDecoder]);

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
