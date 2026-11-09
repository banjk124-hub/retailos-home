import { useRef, useState, type AnimationEvent, type CSSProperties } from 'react';
import type { ScannerLifecycleEvent } from '../../../platform/scanner/contracts';
import { AlertTriangle, Camera, Flashlight, FlashlightOff, X } from 'lucide-react';
import type { CameraLeaseRequest } from '../../../shared/services/cameraSession';
import type { MotionOrigin } from '../../../shared/motion';
import { useScannerEngine } from '../../scanner/hooks/useScannerEngine';
import { captureScannerPreviewFrame } from '../../scanner/services/captureScannerPreviewFrame';
import { StocktakeScannerExitGate } from '../services/stocktakeScannerExitGate';

type ScannerTransitionStyle = CSSProperties & {
  '--scanner-origin-x': string;
  '--scanner-origin-y': string;
};

type Props = {
  onDetected: (value: string) => void;
  onClose: () => void;
  cameraLeaseRequest?: CameraLeaseRequest | null;
  motionOrigin?: MotionOrigin | null;
};

/** Stocktake-owned scanner presentation; camera/decoder runtime stays shared. */
export default function StocktakeScanner({ onDetected, onClose, cameraLeaseRequest = null, motionOrigin = null }: Props) {
  const [isClosing, setIsClosing] = useState(false);
  const [exitFrame, setExitFrame] = useState<string | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const exitGateRef = useRef<StocktakeScannerExitGate | null>(null);
  if (!exitGateRef.current) {
    exitGateRef.current = new StocktakeScannerExitGate(() => onCloseRef.current());
  }
  const handleLifecycleEvent = (event: ScannerLifecycleEvent) => {
    exitGateRef.current?.observe(event.type);
  };
  const finishClose = (event: AnimationEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget || event.animationName !== 'scanner-stocktake-close') return;
    // Stocktake owns this UI milestone; it is not sent into the scanner engine.
    exitGateRef.current?.completePresentation();
  };
  const scanner = useScannerEngine({ onDetected: (value) => {
    setExitFrame(scanner.videoRef.current ? captureScannerPreviewFrame(scanner.videoRef.current) : null);
    setIsClosing(true);
    onDetected(value);
  }, mode: 'single', cameraLeaseRequest, lifecycleObserver: handleLifecycleEvent });
  const transitionStyle: ScannerTransitionStyle = {
    '--scanner-origin-x': motionOrigin ? `${motionOrigin.x}px` : '50vw',
    '--scanner-origin-y': motionOrigin ? `${motionOrigin.y}px` : '50vh',
  };
  const close = () => {
    if (isClosing) return;
    setExitFrame(scanner.videoRef.current ? captureScannerPreviewFrame(scanner.videoRef.current) : null);
    setIsClosing(true);
    void scanner.closeScanner();
  };

  return (
    <section className={`stocktake-scanner-surface scanner-stocktake-surface-enter ${isClosing ? 'is-closing' : ''}`} style={transitionStyle} onAnimationEnd={finishClose} role="dialog" aria-modal="true" aria-labelledby="stocktake-scanner-title"
      onPointerDown={() => { void scanner.prepareAudio(); }}>
      <header className="stocktake-scanner-heading">
        <div><span className="stocktake-eyebrow">RETAILOS · KIỂM KÊ</span><h2 id="stocktake-scanner-title">Quét hàng hóa</h2><p>Đưa mã sản phẩm vào giữa khung hình</p></div>
        {scanner.torch.supported && <button
          type="button"
          className="stocktake-icon-button scanner-torch-toggle"
          onClick={() => { void scanner.setTorchEnabled(!scanner.torch.enabled); }}
          disabled={scanner.torch.pending || isClosing}
          aria-label={`${scanner.torch.enabled ? 'Tắt đèn flash' : 'Bật đèn flash'}${scanner.torch.error ? `. ${scanner.torch.error}` : ''}`}
          aria-pressed={scanner.torch.enabled}
          title={scanner.torch.error ?? (scanner.torch.enabled ? 'Tắt đèn flash' : 'Bật đèn flash')}
        >
          {scanner.torch.enabled ? <FlashlightOff size={19} /> : <Flashlight size={19} />}
        </button>}
        <button type="button" className="stocktake-icon-button" onClick={close} aria-label="Đóng máy quét"><X size={19} /></button>
      </header>
      <div className={`stocktake-scanner-preview ${scanner.isPreviewReady ? 'has-preview' : ''} ${scanner.isScanning ? 'is-active' : ''}`}>
        <video key={scanner.videoSurfaceKey} ref={scanner.videoRef} muted playsInline autoPlay aria-label="Camera quét barcode" />
        {exitFrame && <img className="stocktake-scanner-exit-frame" src={exitFrame} alt="" aria-hidden="true" />}
        {!scanner.isPreviewReady && scanner.isStarting && <div className="stocktake-scanner-message" role="status" aria-live="polite"><Camera size={17} /><span>Đang mở camera…</span></div>}
        {!scanner.isPreviewReady && scanner.error && <div className="stocktake-scanner-message is-error"><AlertTriangle size={18} /><span>Camera chưa sẵn sàng</span></div>}
        {scanner.isScanning && <div className="stocktake-scanner-reticle" aria-hidden="true"><i /></div>}
      </div>
      <p className="stocktake-scanner-instruction">Giữ mã vạch rõ nét, đủ sáng. Mỗi lần quét sẽ điền một dòng vào biểu mẫu; dữ liệu chỉ được lưu khi bạn xác nhận.</p>
      {scanner.error && <p className="stocktake-error" role="alert">{scanner.error}</p>}
      {scanner.error && <button type="button" className="stocktake-primary" onClick={() => { void scanner.startScanner(); }}>Thử kết nối lại</button>}
      <button type="button" className="stocktake-secondary" onClick={close}>Đóng camera</button>
    </section>
  );
}
