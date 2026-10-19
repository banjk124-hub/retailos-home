import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { AlertTriangle, Camera, X } from 'lucide-react';
import { getCameraErrorMessage } from '../services/cameraErrors';

type Props = {
  onDetected: (value: string) => void;
  onClose: () => void;
  initialStream: MediaStream | null;
  initialError: string;
};

export default function BarcodeScanner({ onDetected, onClose, initialStream, initialError }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isDisposedRef = useRef(false);
  const isStartingRef = useRef(false);
  const hasDetectedRef = useRef(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    isDisposedRef.current = false;
    return () => {
      isDisposedRef.current = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);
  useEffect(() => {
    const stopForBackground = () => {
      controlsRef.current?.stop();
      controlsRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setIsScanning(false);
      if (!isDisposedRef.current) {
        setError('Camera đã tạm dừng khi ứng dụng chuyển nền. Chạm “Thử lại” để tiếp tục quét.');
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') stopForBackground();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', stopForBackground);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', stopForBackground);
    };
  }, []);

  const startScanner = async (providedStream?: MediaStream) => {
    if (!videoRef.current || isStartingRef.current || isStarting || isScanning) return;
    if (!providedStream && (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)) {
      setError('Camera chỉ hoạt động trên HTTPS hoặc localhost. Hãy mở ứng dụng bằng địa chỉ bảo mật rồi thử lại.');
      return;
    }
    isStartingRef.current = true;
    setIsStarting(true);
    setError('');
    hasDetectedRef.current = false;

    try {
      const reader = new BrowserMultiFormatReader();
      const stream = providedStream ?? await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' } },
      });
      streamRef.current = stream;
      setIsScanning(true);
      const controls = await reader.decodeFromStream(
        stream,
        videoRef.current,
        (result, _decodeError, scannerControls) => {
          if (!result || hasDetectedRef.current) return;
          hasDetectedRef.current = true;
          scannerControls.stop();
          controlsRef.current = null;
          streamRef.current = null;
          setIsScanning(false);
          onDetected(result.getText());
        },
      );
      if (isDisposedRef.current) {
        controls.stop();
        streamRef.current = null;
        return;
      }
      controlsRef.current = controls;
    } catch (cause) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (isDisposedRef.current) return;
      setIsScanning(false);
      setError(getCameraErrorMessage(cause));
    } finally {
      isStartingRef.current = false;
      setIsStarting(false);
    }
  };

  useEffect(() => {
    if (initialStream) void startScanner(initialStream);
  }, [initialStream]);
  useEffect(() => {
    if (initialError) setError(initialError);
  }, [initialError]);

  const stopScanner = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setIsScanning(false);
  };

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  return <section className="barcode-scanner" role="dialog" aria-modal="true" aria-labelledby="barcode-scanner-title">
    <div className="barcode-scanner-card">
      <header className="barcode-scanner-header">
        <span className="barcode-scanner-title-icon"><Camera size={19} /></span>
        <div>
          <h2 id="barcode-scanner-title">Quét mã vạch</h2>
          <p>Đưa mã vạch vào khung hình</p>
        </div>
        <button className="barcode-scanner-close" type="button" onClick={handleClose} aria-label="Đóng máy quét"><X size={19} /></button>
      </header>

      <div className={`barcode-scanner-view ${isScanning ? 'is-scanning' : ''}`}>
        <video ref={videoRef} muted playsInline aria-label="Hình ảnh camera để quét mã vạch" />
        {isScanning && <div className="barcode-scan-frame" aria-hidden="true"><i /></div>}
        {!isScanning && <div className="barcode-scanner-placeholder"><Camera size={27} /><span>{isStarting ? 'Đang kết nối camera để bắt đầu quét…' : error ? 'Không thể tự mở camera. Kiểm tra quyền truy cập rồi thử lại.' : 'Đang chuẩn bị camera…'}</span></div>}
      </div>

      <p className="barcode-scanner-hint">Giữ mã vạch rõ nét, đủ sáng và nằm trong khung.</p>
      {error && <p className="barcode-scanner-error" role="alert"><AlertTriangle size={16} />{error}</p>}

      {isScanning
        ? <button className="barcode-scanner-action barcode-scanner-action--secondary" type="button" onClick={stopScanner}>Dừng camera</button>
        : <button
          className="barcode-scanner-action"
          type="button"
          disabled={isStarting}
          onClick={() => { void startScanner(); }}
        >
          <Camera size={17} />{isStarting ? 'Đang mở camera…' : 'Bắt đầu quét'}
        </button>}

      {error && <button className="barcode-scanner-retry" type="button" onClick={() => { void startScanner(); }}>Thử lại</button>}
      <span className="barcode-scanner-status" aria-live="polite">{isScanning ? 'Đang quét…' : 'Camera tắt'}</span>
    </div>
  </section>;
}
