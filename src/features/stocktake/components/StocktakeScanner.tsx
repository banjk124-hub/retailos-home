import { AlertTriangle, Camera, X } from 'lucide-react';
import { useScannerEngine } from '../../scanner/hooks/useScannerEngine';

type Props = {
  onDetected: (value: string) => void;
  onClose: () => void;
};

/** Stocktake-owned scanner presentation; camera/decoder runtime stays shared. */
export default function StocktakeScanner({ onDetected, onClose }: Props) {
  const scanner = useScannerEngine({ onDetected, mode: 'single' });
  const close = () => {
    void scanner.closeScanner();
    onClose();
  };

  return (
    <section className="stocktake-scanner-surface" role="dialog" aria-modal="true" aria-labelledby="stocktake-scanner-title"
      onPointerDown={() => { void scanner.prepareAudio(); }}>
      <header className="stocktake-scanner-heading">
        <div><span className="stocktake-eyebrow">RETAILOS · KIỂM KÊ</span><h2 id="stocktake-scanner-title">Quét hàng hóa</h2><p>Đưa mã sản phẩm vào giữa khung hình</p></div>
        <button type="button" className="stocktake-icon-button" onClick={close} aria-label="Đóng máy quét"><X size={19} /></button>
      </header>
      <div className={`stocktake-scanner-preview ${scanner.isScanning ? 'is-active' : ''}`}>
        <video ref={scanner.videoRef} muted playsInline autoPlay aria-label="Camera quét barcode" />
        {scanner.isStarting && <div className="stocktake-scanner-message"><Camera size={25} /><span>Đang kết nối camera…</span></div>}
        {!scanner.isStarting && scanner.error && <div className="stocktake-scanner-message"><AlertTriangle size={25} /><span>Camera chưa sẵn sàng</span></div>}
        {scanner.isScanning && <div className="stocktake-scanner-reticle" aria-hidden="true"><i /></div>}
      </div>
      <p className="stocktake-scanner-instruction">Giữ mã vạch rõ nét, đủ sáng. Mỗi lần quét sẽ điền một dòng vào biểu mẫu; dữ liệu chỉ được lưu khi bạn xác nhận.</p>
      {scanner.error && <p className="stocktake-error" role="alert">{scanner.error}</p>}
      {scanner.error && <button type="button" className="stocktake-primary" onClick={() => { void scanner.startScanner(); }}>Thử kết nối lại</button>}
      <button type="button" className="stocktake-secondary" onClick={close}>Đóng camera</button>
    </section>
  );
}
