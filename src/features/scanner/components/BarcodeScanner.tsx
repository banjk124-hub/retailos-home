import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { AlertTriangle, Camera, X } from 'lucide-react';
import { getCameraErrorMessage } from '../services/cameraErrors';
import { acquireCameraStream, releaseCameraStream } from '../../../shared/services/cameraSession';
import { playScannerBeep, unlockScannerAudio } from '../services/scannerAudio';

type Props = {
  onDetected: (value: string) => void;
  onClose: () => void;
  /** single closes through the caller after one result; continuous keeps decoding. */
  mode?: 'single' | 'continuous';
  scanCooldownMs?: number;
  /** Feature-level choice; enabled by default for barcode capture feedback. */
  audioFeedback?: boolean;
};

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export default function BarcodeScanner({
  onDetected,
  onClose,
  mode = 'single',
  scanCooldownMs = 700,
  audioFeedback = true,
}: Props) {
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
  const [isStarting, setIsStarting] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { onDetectedRef.current = onDetected; }, [onDetected]);

  const stopDecoder = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setIsScanning(false);
  }, []);

  const stopScanner = useCallback((release = true) => {
    stopDecoder();
    if (release) {
      releaseCameraStream();
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    }
  }, [stopDecoder]);

  const startScanner = useCallback(async () => {
    if (disposedRef.current || !desiredActiveRef.current || document.visibilityState === 'hidden') return;
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

    try {
      const stream = await acquireCameraStream();
      if (
        disposedRef.current ||
        !desiredActiveRef.current ||
        document.visibilityState === 'hidden' ||
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
        document.visibilityState === 'hidden' ||
        generation !== startGenerationRef.current
      ) {
        releaseCameraStream();
        streamRef.current = null;
        return;
      }

      const reader = new BrowserMultiFormatReader(undefined, { delayBetweenScanAttempts: 70 });
      const controls = await reader.decodeFromStream(stream, video, (result) => {
        if (!result || disposedRef.current || !desiredActiveRef.current) return;
        const now = Date.now();
        if (mode === 'single' && detectedOnceRef.current) return;
        if (mode === 'continuous' && now - lastDetectedAtRef.current < scanCooldownMs) return;

        detectedOnceRef.current = true;
        lastDetectedAtRef.current = now;
        if (audioFeedback) playScannerBeep();
        onDetectedRef.current(result.getText());

        if (mode === 'single') {
          controlsRef.current?.stop();
          controlsRef.current = null;
          setIsScanning(false);
        }
      });

      if (
        disposedRef.current ||
        !desiredActiveRef.current ||
        document.visibilityState === 'hidden' ||
        generation !== startGenerationRef.current
      ) {
        controls.stop();
        return;
      }
      controlsRef.current = controls;
      setIsScanning(true);
    } catch (cause) {
      if (!disposedRef.current && desiredActiveRef.current && !isAbortError(cause)) {
        setError(getCameraErrorMessage(cause));
        releaseCameraStream();
        streamRef.current = null;
      }
    } finally {
      startingRef.current = false;
      if (!disposedRef.current) setIsStarting(false);

      // If the app returned to foreground while getUserMedia was still settling,
      // perform one fresh start after the previous attempt has fully unwound.
      if (
        restartRequestedRef.current &&
        desiredActiveRef.current &&
        !disposedRef.current &&
        document.visibilityState !== 'hidden'
      ) {
        restartRequestedRef.current = false;
        queueMicrotask(() => { void startScanner(); });
      }
    }
  }, [audioFeedback, mode, scanCooldownMs]);

  useEffect(() => {
    disposedRef.current = false;
    desiredActiveRef.current = true;
    void startScanner();

    const pauseForBackground = () => {
      if (document.visibilityState === 'hidden') {
        startGenerationRef.current += 1;
        restartRequestedRef.current = false;
        stopScanner(true);
        setIsStarting(false);
        return;
      }

      if (desiredActiveRef.current && !disposedRef.current) {
        // visibilitychange/pageshow/focus may fire together; startScanner
        // coalesces them into a single in-flight camera request.
        void startScanner();
      }
    };
    const resumeFromPageShow = () => {
      if (document.visibilityState !== 'hidden' && desiredActiveRef.current) void startScanner();
    };

    document.addEventListener('visibilitychange', pauseForBackground);
    window.addEventListener('pageshow', resumeFromPageShow);
    window.addEventListener('focus', resumeFromPageShow);

    return () => {
      disposedRef.current = true;
      desiredActiveRef.current = false;
      startGenerationRef.current += 1;
      restartRequestedRef.current = false;
      document.removeEventListener('visibilitychange', pauseForBackground);
      window.removeEventListener('pageshow', resumeFromPageShow);
      window.removeEventListener('focus', resumeFromPageShow);
      stopScanner(true);
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [startScanner, stopScanner]);

  const handleClose = () => {
    desiredActiveRef.current = false;
    startGenerationRef.current += 1;
    restartRequestedRef.current = false;
    stopScanner(true);
    onClose();
  };

  return <section
    className="barcode-scanner"
    role="dialog"
    aria-modal="true"
    aria-labelledby="barcode-scanner-title"
    onPointerDown={() => { if (audioFeedback) void unlockScannerAudio(); }}
  >
    <div className="barcode-scanner-card">
      <header className="barcode-scanner-header">
        <span className="barcode-scanner-title-icon"><Camera size={19} /></span>
        <div><h2 id="barcode-scanner-title">Quét mã vạch</h2><p>Đưa mã vạch vào khung hình</p></div>
        <button className="barcode-scanner-close" type="button" onClick={handleClose} aria-label="Đóng máy quét"><X size={19} /></button>
      </header>
      <div className={`barcode-scanner-view ${isScanning ? 'is-scanning' : ''}`}>
        <video ref={videoRef} muted playsInline autoPlay aria-label="Hình ảnh camera để quét mã vạch" />
        {isScanning && <div className="barcode-scan-frame" aria-hidden="true"><i /></div>}
        {isStarting && <div className="barcode-scanner-placeholder"><Camera size={27} /><span>Đang kết nối camera…</span></div>}
        {!isStarting && error && <div className="barcode-scanner-placeholder"><Camera size={27} /><span>Camera chưa sẵn sàng</span></div>}
      </div>
      <p className="barcode-scanner-hint">Giữ mã vạch rõ nét, đủ sáng và nằm trong khung.</p>
      {error && <p className="barcode-scanner-error" role="alert"><AlertTriangle size={16} />{error}</p>}
      {error && <button className="barcode-scanner-retry" type="button" onClick={() => { void startScanner(); }}>Thử lại</button>}
      <span className="barcode-scanner-status" aria-live="polite">{isScanning ? 'Đang quét…' : isStarting ? 'Đang mở camera…' : 'Camera tắt'}</span>
    </div>
  </section>;
}
