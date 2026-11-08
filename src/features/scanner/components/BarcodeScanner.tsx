import { useState, type AnimationEvent, type CSSProperties } from 'react';
import { AlertTriangle, Camera, X } from 'lucide-react';
import type { CameraLeaseRequest } from '../../../shared/services/cameraSession';
import type { MotionOrigin } from '../../../shared/motion';
import { useScannerEngine, type ScannerMode } from '../hooks/useScannerEngine';

type ScannerTransitionStyle = CSSProperties & {
  '--scanner-origin-x': string;
  '--scanner-origin-y': string;
};

type Props = {
  onDetected: (value: string) => void;
  onClose: () => void;
  /** single closes through the caller after one result; continuous keeps decoding. */
  mode?: ScannerMode;
  scanCooldownMs?: number;
  audioFeedback?: boolean;
  hapticFeedback?: boolean;
  cameraLeaseRequest?: CameraLeaseRequest | null;
  motionOrigin?: MotionOrigin | null;
};

/**
 * Default scanner presentation used by Home today.
 * Other features may build a different UI while reusing useScannerEngine.
 */
export default function BarcodeScanner({
  onDetected,
  onClose,
  mode = 'single',
  scanCooldownMs = 700,
  audioFeedback = true,
  hapticFeedback = true,
  cameraLeaseRequest = null,
  motionOrigin = null,
}: Props) {
  const [isClosing, setIsClosing] = useState(false);
  const finishClose = (event: AnimationEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget || event.animationName !== 'scanner-home-close') return;
    onClose();
  };
  const handleDetected = (value: string) => {
    setIsClosing(true);
    onDetected(value);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) onClose();
  };
  const scanner = useScannerEngine({ onDetected: handleDetected, mode, scanCooldownMs, audioFeedback, hapticFeedback, cameraLeaseRequest });
  const transitionStyle: ScannerTransitionStyle = {
    '--scanner-origin-x': motionOrigin ? `${motionOrigin.x}px` : '50vw',
    '--scanner-origin-y': motionOrigin ? `${motionOrigin.y}px` : '50vh',
  };

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    void scanner.closeScanner();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) onClose();
  };

  return <section
    className={`barcode-scanner scanner-home-transition ${isClosing ? 'is-closing' : ''}`}
    style={transitionStyle}
    onAnimationEnd={finishClose}
    role="dialog"
    aria-modal="true"
    aria-labelledby="barcode-scanner-title"
    onPointerDown={() => { if (audioFeedback) void scanner.prepareAudio(); }}
  >
    <div className="barcode-scanner-card">
      <header className="barcode-scanner-header">
        <span className="barcode-scanner-title-icon"><Camera size={19} /></span>
        <div><h2 id="barcode-scanner-title">Quét mã vạch</h2><p>Đưa mã vạch vào khung hình</p></div>
        <button className="barcode-scanner-close" type="button" onClick={handleClose} aria-label="Đóng máy quét"><X size={19} /></button>
      </header>
      <div className={`barcode-scanner-view ${scanner.isPreviewReady ? 'has-preview' : ''} ${scanner.isScanning ? 'is-scanning' : ''}`}>
        <video ref={scanner.videoRef} muted playsInline autoPlay aria-label="Hình ảnh camera để quét mã vạch" />
        {scanner.isScanning && <div className="barcode-scan-frame" aria-hidden="true"><i /></div>}
        {!scanner.isPreviewReady && scanner.error && <div className="barcode-scanner-placeholder"><AlertTriangle size={25} /><span>Camera chưa sẵn sàng</span></div>}
      </div>
      <p className="barcode-scanner-hint">Giữ mã vạch rõ nét, đủ sáng và nằm trong khung.</p>
      {scanner.error && <p className="barcode-scanner-error" role="alert"><AlertTriangle size={16} />{scanner.error}</p>}
      {scanner.error && <button className="barcode-scanner-retry" type="button" onClick={() => { void scanner.startScanner(); }}>Thử lại</button>}
      <span className="barcode-scanner-status" aria-live="polite">{scanner.isScanning ? 'Đang quét…' : scanner.isPreviewReady ? 'Đang chuẩn bị quét…' : scanner.isStarting ? 'Đang mở camera…' : 'Camera tắt'}</span>
    </div>
  </section>;
}
