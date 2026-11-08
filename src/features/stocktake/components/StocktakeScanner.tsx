import type { CSSProperties } from 'react';
import { AlertTriangle, Camera, X } from 'lucide-react';
import type { CameraLeaseRequest } from '../../../shared/services/cameraSession';
import type { MotionOrigin } from '../../../shared/motion';
import { useScannerEngine } from '../../scanner/hooks/useScannerEngine';

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
  const scanner = useScannerEngine({ onDetected, mode: 'single', cameraLeaseRequest });
  const transitionStyle: ScannerTransitionStyle = {
    '--scanner-origin-x': motionOrigin ? `${motionOrigin.x}px` : '50vw',
    '--scanner-origin-y': motionOrigin ? `${motionOrigin.y}px` : '50vh',
  };
  const close = () => {
    void scanner.closeScanner();
    onClose();
  };

  return (
    <section className="stocktake-scanner-surface scanner-stocktake-surface-enter" style={transitionStyle} role="dialog" aria-modal="true" aria-labelledby="stocktake-scanner-title"
      onPointerDown={() => { void scanner.prepareAudio(); }}>
      <header className="stocktake-scanner-heading">
        <div><span className="stocktake-eyebrow">RETAILOS · KIỂM KÊ</span><h2 id="stocktake-scanner-title">Quét hàng hóa</h2><p>Đưa mã sản phẩm vào giữa khung hình</p></div>
        <button type="button" className="stocktake-icon-button" onClick={close} aria-label="Đóng máy quét"><X size={19} /></button>
      </header>
      <div className={`stocktake-scanner-preview ${scanner.isPreviewReady ? 'has-preview' : ''} ${scanner.isScanning ? 'is-active' : ''}`}>
        <video ref={scanner.videoRef} muted playsInline autoPlay aria-label="Camera quét barcode" />
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
