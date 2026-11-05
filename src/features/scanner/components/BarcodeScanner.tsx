import { AlertTriangle, Camera, X } from 'lucide-react';
import { useScannerEngine, type ScannerMode } from '../hooks/useScannerEngine';

type Props = {
  onDetected: (value: string) => void;
  onClose: () => void;
  /** single closes through the caller after one result; continuous keeps decoding. */
  mode?: ScannerMode;
  scanCooldownMs?: number;
  audioFeedback?: boolean;
  hapticFeedback?: boolean;
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
}: Props) {
  const scanner = useScannerEngine({ onDetected, mode, scanCooldownMs, audioFeedback, hapticFeedback });

  const handleClose = () => {
    scanner.closeScanner();
    onClose();
  };

  return <section
    className="barcode-scanner"
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
      <div className={`barcode-scanner-view ${scanner.isScanning ? 'is-scanning' : ''}`}>
        <video ref={scanner.videoRef} muted playsInline autoPlay aria-label="Hình ảnh camera để quét mã vạch" />
        {scanner.isScanning && <div className="barcode-scan-frame" aria-hidden="true"><i /></div>}
        {scanner.isStarting && <div className="barcode-scanner-placeholder"><Camera size={27} /><span>Đang kết nối camera…</span></div>}
        {!scanner.isStarting && scanner.error && <div className="barcode-scanner-placeholder"><Camera size={27} /><span>Camera chưa sẵn sàng</span></div>}
      </div>
      <p className="barcode-scanner-hint">Giữ mã vạch rõ nét, đủ sáng và nằm trong khung.</p>
      {scanner.error && <p className="barcode-scanner-error" role="alert"><AlertTriangle size={16} />{scanner.error}</p>}
      {scanner.error && <button className="barcode-scanner-retry" type="button" onClick={() => { void scanner.startScanner(); }}>Thử lại</button>}
      <span className="barcode-scanner-status" aria-live="polite">{scanner.isScanning ? 'Đang quét…' : scanner.isStarting ? 'Đang mở camera…' : 'Camera tắt'}</span>
    </div>
  </section>;
}
