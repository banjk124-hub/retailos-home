import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { getCameraErrorMessage } from '../services/cameraErrors';
import {
  acquireCameraStream,
  releaseCameraStream,
  subscribeCameraTrackEnded,
} from '../../../shared/services/cameraSession';
import { playScannerFeedback } from '../services/scannerFeedback';
import { unlockScannerAudio } from '../services/scannerAudio';
import {
  beginScannerDiagnostics,
  finishScannerDiagnostics,
  markScannerDiagnostics,
  recordFirstScannerResult,
  type ScannerDiagnosticsSession,
} from '../services/scannerDiagnostics';

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
  hapticFeedback?: boolean;
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
  hapticFeedback = true,
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
  const automaticRecoveryAttemptsRef = useRef(0);
  const lastDetectedAtRef = useRef(0);
  const detectedOnceRef = useRef(false);
  const stopAfterAttachRef = useRef(false);
  const diagnosticsRef = useRef<ScannerDiagnosticsSession | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { onDetectedRef.current = onDetected; }, [onDetected]);

  const stopDecoder = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setIsScanning(false);
  }, []);

  const detachOwnedStream = useCallback((stream: MediaStream) => {
    releaseCameraStream(stream);
    if (streamRef.current === stream) streamRef.current = null;
    if (videoRef.current?.srcObject === stream) videoRef.current.srcObject = null;
  }, []);

  const pauseScanner = useCallback(() => {
    finishScannerDiagnostics(diagnosticsRef.current, 'pause');
    diagnosticsRef.current = null;
    startGenerationRef.current += 1;
    restartRequestedRef.current = false;
    stopDecoder();
    releaseCameraStream();
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsStarting(false);
  }, [stopDecoder]);

  // automatic=true is reserved for browser lifecycle events and the one-shot
  // recovery path. A direct call from the Retry control starts a fresh recovery
  // budget, so repeated automatic interruptions cannot form an endless loop.
  const startScanner = useCallback(async (automatic = false) => {
    if (!automatic) automaticRecoveryAttemptsRef.current = 0;
    if (disposedRef.current || !desiredActiveRef.current || isDocumentHidden()) return;
    // A live decoder already owns this session. Focus/pageshow events must not
    // attach another decode loop to the same MediaStream.
    if (controlsRef.current) return;
    if (startingRef.current) {
      if (automatic) restartRequestedRef.current = true;
      return;
    }

    startingRef.current = true;
    restartRequestedRef.current = false;
    const generation = ++startGenerationRef.current;
    const diagnostics = beginScannerDiagnostics();
    diagnosticsRef.current = diagnostics;
    setIsStarting(true);
    setError('');
    detectedOnceRef.current = false;
    stopAfterAttachRef.current = false;

    try {
      const stream = await acquireCameraStream();
      const videoTrack = stream.getVideoTracks()[0];
      markScannerDiagnostics(diagnostics, 'camera-acquired', {
        trackSettings: videoTrack?.getSettings() ?? null,
      });
      if (
        disposedRef.current ||
        !desiredActiveRef.current ||
        isDocumentHidden() ||
        generation !== startGenerationRef.current ||
        !videoRef.current
      ) {
        detachOwnedStream(stream);
        return;
      }
      if (!stream.getVideoTracks().some((track) => track.readyState === 'live')) {
        throw new Error('Luồng camera đã kết thúc. Hãy thử kết nối lại camera.');
      }

      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();
      markScannerDiagnostics(diagnostics, 'video-playing', {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        readyState: video.readyState,
        trackSettings: videoTrack?.getSettings() ?? null,
      });

      if (
        disposedRef.current ||
        !desiredActiveRef.current ||
        isDocumentHidden() ||
        generation !== startGenerationRef.current
      ) {
        detachOwnedStream(stream);
        return;
      }

      const hints = new Map<DecodeHintType, any>();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [...SUPPORTED_BARCODE_FORMATS]);
      const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 70 });
      markScannerDiagnostics(diagnostics, 'decoder-starting', {
        configuredDelayBetweenScanAttemptsMs: 70,
      });
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
        recordFirstScannerResult(diagnostics, {
          format: BarcodeFormat[format],
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
        });
        playScannerFeedback({ audio: audioFeedback, haptic: hapticFeedback });
        onDetectedRef.current(value);

        if (mode === 'single') {
          stopAfterAttachRef.current = true;
          controlsRef.current?.stop();
          controlsRef.current = null;
          setIsScanning(false);
        }
      });

      markScannerDiagnostics(diagnostics, 'decoder-attached');
      if (
        disposedRef.current ||
        !desiredActiveRef.current ||
        isDocumentHidden() ||
        generation !== startGenerationRef.current ||
        !stream.getVideoTracks().some((track) => track.readyState === 'live')
      ) {
        controls.stop();
        finishScannerDiagnostics(diagnostics, 'startup-invalidated');
        if (diagnosticsRef.current === diagnostics) diagnosticsRef.current = null;
        return;
      }
      if (mode === 'single' && stopAfterAttachRef.current) {
        controls.stop();
        finishScannerDiagnostics(diagnostics, 'single-scan-complete');
        if (diagnosticsRef.current === diagnostics) diagnosticsRef.current = null;
        setIsScanning(false);
      } else {
        controlsRef.current = controls;
        setIsScanning(true);
      }
    } catch (cause) {
      // A failed/stale startup must never release a stream acquired by a newer
      // scanner instance. Only surface errors for this still-current attempt.
      const ownedStream = streamRef.current;
      if (ownedStream) detachOwnedStream(ownedStream);
      finishScannerDiagnostics(diagnostics, 'startup-error');
      if (diagnosticsRef.current === diagnostics) diagnosticsRef.current = null;

      if (
        generation === startGenerationRef.current &&
        !disposedRef.current &&
        desiredActiveRef.current &&
        !isAbortError(cause)
      ) {
        setError(getCameraErrorMessage(cause));
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
        queueMicrotask(() => { void startScanner(true); });
      }
    }
  }, [audioFeedback, detachOwnedStream, hapticFeedback, mode, scanCooldownMs]);

  const closeScanner = useCallback(() => {
    finishScannerDiagnostics(diagnosticsRef.current, 'close');
    diagnosticsRef.current = null;
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

    const unsubscribeTrackEnded = subscribeCameraTrackEnded((endedStream) => {
      // Ignore events from a stream that no longer belongs to this hook.
      if (streamRef.current !== endedStream) return;

      finishScannerDiagnostics(diagnosticsRef.current, 'camera-track-ended');
      diagnosticsRef.current = null;
      startGenerationRef.current += 1;
      stopDecoder();
      streamRef.current = null;
      if (videoRef.current?.srcObject === endedStream) {
        videoRef.current.srcObject = null;
      }
      setIsStarting(false);

      if (disposedRef.current || !desiredActiveRef.current || isDocumentHidden()) return;

      if (automaticRecoveryAttemptsRef.current >= 1) {
        setError('Camera bị ngắt kết nối nhiều lần. Hãy nhấn thử lại để kết nối lại.');
        return;
      }

      automaticRecoveryAttemptsRef.current += 1;
      setError('Kết nối camera bị gián đoạn. Đang thử kết nối lại…');
      if (startingRef.current) {
        restartRequestedRef.current = true;
      } else {
        queueMicrotask(() => { void startScanner(true); });
      }
    });

    const handleVisibilityChange = () => {
      if (isDocumentHidden()) {
        pauseScanner();
      } else if (desiredActiveRef.current && !disposedRef.current) {
        void startScanner(true);
      }
    };
    const resumeFromPageShow = () => {
      if (!isDocumentHidden() && desiredActiveRef.current) void startScanner(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', resumeFromPageShow);
    window.addEventListener('focus', resumeFromPageShow);

    return () => {
      finishScannerDiagnostics(diagnosticsRef.current, 'unmount');
      diagnosticsRef.current = null;
      disposedRef.current = true;
      desiredActiveRef.current = false;
      startGenerationRef.current += 1;
      restartRequestedRef.current = false;
      unsubscribeTrackEnded();
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
