import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { AlertTriangle, Camera, X } from 'lucide-react';
import { getCameraErrorMessage } from '../services/cameraErrors';
import { acquireCameraStream, releaseCameraStream } from '../../../shared/services/cameraSession';

type Props = {
  onDetected: (value: string) => void;
  onClose: () => void;
  /** single closes through the caller after one result; continuous keeps decoding. */
  mode?: 'single' | 'continuous';
  scanCooldownMs?: number;
};

export default function BarcodeScanner({ onDetected, onClose, mode = 'single', scanCooldownMs = 700 }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const disposedRef = useRef(false);
  const startingRef = useRef(false);
  const lastDetectedAtRef = useRef(0);
  const detectedOnceRef = useRef(false);
  const [isStarting, setIsStarting] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');

  const stopScanner = useCallback((release = true) => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    if (release) {
      releaseCameraStream();
      streamRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const startScanner = useCallback(async () => {
    if (startingRef.current || disposedRef.current || !videoRef.current) return;
    startingRef.current = true;
    setIsStarting(true);
    setError('');
    detectedOnceRef.current = false;

    try {
      const stream = await acquireCameraStream();
      if (disposedRef.current || !videoRef.current) return;
      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();

      const reader = new BrowserMultiFormatReader(undefined, { delayBetweenScanAttempts: 70 });
      const controls = await reader.decodeFromStream(stream, video, (result) => {
        if (!result || disposedRef.current) return;
        const now = Date.now();
        if (mode === 'single' && detectedOnceRef.current) return;
        if (mode === 'continuous' && now - lastDetectedAtRef.current < scanCooldownMs) return;
        detectedOnceRef.current = true;
        lastDetectedAtRef.current = now;
        onDetected(result.getText());
        if (mode === 'single') {
          controlsRef.current?.stop();
          controlsRef.current = null;
          setIsScanning(false);
        }
      });
      if (disposedRef.current) {
        controls.stop();
        return;
      }
      controlsRef.current = controls;
      setIsScanning(true);
    } catch (cause) {
      if (!disposedRef.current) {
        setError(getCameraErrorMessage(cause));
        releaseCameraStream();
        streamRef.current = null;
      }
    } finally {
      startingRef.current = false;
      if (!disposedRef.current) setIsStarting(false);
    }
  }, [mode, onDetected, scanCooldownMs]);

  useEffect(() => {
    disposedRef.current = false;
    void startScanner();
    const pauseForBackground = () => {
      if (document.visibilityState === 'hidden') {
        stopScanner(true);
        if (!disposedRef.current) setError('Camera đã tạm dừng khi ứng dụng chuyển nền. Chạm “Thử lại” để tiếp tục quét.');
      }
    };
    document.addEventListener('visibilitychange', pauseForBackground);
    return () => {
      disposedRef.current = true;
      document.removeEventListener('visibilitychange', pauseForBackground);
      stopScanner(true);
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [startScanner, stopScanner]);

  const handleClose = () => {
    stopScanner(true);
    onClose();
  };

  return <section className="barcode-scanner" role="dialog" aria-modal="true" aria-labelledby="barcode-scanner-title">
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
