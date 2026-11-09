import { useRef, useState, type AnimationEvent, type CSSProperties } from 'react';
import type { ScannerLifecycleEvent } from '../../../platform/scanner/contracts';
import { AlertTriangle, Flashlight, FlashlightOff, X } from 'lucide-react';
import type { CameraLeaseRequest } from '../../../shared/services/cameraSession';
import type { MotionOrigin } from '../../../shared/motion';
import { useScannerEngine, type ScannerMode } from '../hooks/useScannerEngine';
import { useScannerViewportStyle } from '../hooks/useScannerViewportStyle';
import { captureScannerPreviewFrame } from '../services/captureScannerPreviewFrame';
import ScannerTorchDiagnosticPanel from './ScannerTorchDiagnosticPanel';

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

/** Home's full-screen quick product lookup presentation; camera/decoder runtime is shared. */
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
  const [exitFrame, setExitFrame] = useState<string | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const exitMilestonesRef = useRef({ closeStarted: false, presentation: false, cameraLeaseReleased: false, disposed: false, completed: false });
  const tryCompleteClose = () => {
    const milestones = exitMilestonesRef.current;
    if (milestones.closeStarted && milestones.presentation && milestones.cameraLeaseReleased && milestones.disposed && !milestones.completed) {
      milestones.completed = true;
      onCloseRef.current();
    }
  };
  const handleLifecycleEvent = (event: ScannerLifecycleEvent) => {
    if (event.type === 'SESSION_CLOSE_STARTED') exitMilestonesRef.current.closeStarted = true;
    if (event.type === 'CAMERA_LEASE_RELEASED') exitMilestonesRef.current.cameraLeaseReleased = true;
    if (event.type === 'DISPOSED') exitMilestonesRef.current.disposed = true;
    tryCompleteClose();
  };
  const viewportStyle = useScannerViewportStyle();
  const finishClose = (event: AnimationEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget || event.animationName !== 'scanner-home-close') return;
    exitMilestonesRef.current.presentation = true;
    tryCompleteClose();
  };
  const scanner = useScannerEngine({ onDetected: (value) => {
    if (mode === 'single') {
      setExitFrame(scanner.videoRef.current ? captureScannerPreviewFrame(scanner.videoRef.current) : null);
      setIsClosing(true);
    }
    onDetected(value);
  }, mode, scanCooldownMs, audioFeedback, hapticFeedback, cameraLeaseRequest, lifecycleObserver: handleLifecycleEvent });
  const transitionStyle: ScannerTransitionStyle = {
    '--scanner-origin-x': motionOrigin ? `${motionOrigin.x}px` : '50vw',
    '--scanner-origin-y': motionOrigin ? `${motionOrigin.y}px` : '50vh',
  };

  const handleClose = () => {
    if (isClosing) return;
    setExitFrame(scanner.videoRef.current ? captureScannerPreviewFrame(scanner.videoRef.current) : null);
    setIsClosing(true);
    void scanner.closeScanner();
  };

  return <section
    className={`barcode-scanner scanner-home-transition ${isClosing ? 'is-closing' : ''}`}
    style={{ ...transitionStyle, ...viewportStyle }}
    onAnimationEnd={finishClose}
    role="dialog"
    aria-modal="true"
    aria-labelledby="barcode-scanner-title"
    onPointerDown={() => { if (audioFeedback) void scanner.prepareAudio(); }}
  >
    <div className="barcode-scanner-card">
      <div className={`barcode-scanner-view ${scanner.isPreviewReady ? 'has-preview' : ''} ${scanner.isScanning ? 'is-scanning' : ''}`}>
        <video key={scanner.videoSurfaceKey} ref={scanner.videoRef} muted playsInline autoPlay aria-label="Hình ảnh camera để tra cứu sản phẩm" />
        {exitFrame && <img className="barcode-scanner-exit-frame" src={exitFrame} alt="" aria-hidden="true" />}
        <header className="barcode-scanner-header">
          <div className="barcode-scanner-header-copy">
            <span>RETAILOS · TRA CỨU NHANH</span>
            <h2 id="barcode-scanner-title">Tra cứu sản phẩm</h2>
          </div>
          {scanner.torch.supported && <button
            className="scanner-torch-toggle"
            type="button"
            onClick={() => { void scanner.setTorchEnabled(!scanner.torch.enabled); }}
            disabled={scanner.torch.pending || isClosing}
            aria-label={`${scanner.torch.enabled ? 'Tắt đèn flash' : 'Bật đèn flash'}${scanner.torch.error ? `. ${scanner.torch.error}` : ''}`}
            aria-pressed={scanner.torch.enabled}
            title={scanner.torch.error ?? (scanner.torch.enabled ? 'Tắt đèn flash' : 'Bật đèn flash')}
          >
            {scanner.torch.enabled ? <FlashlightOff size={19} /> : <Flashlight size={19} />}
          </button>}
          <button className="barcode-scanner-close" type="button" onClick={handleClose} aria-label="Đóng tra cứu"><X size={20} /></button>
        </header>
        {scanner.isScanning && <div className="barcode-scan-frame" aria-hidden="true"><i /></div>}
        {!scanner.isPreviewReady && scanner.error && <div className="barcode-scanner-placeholder"><AlertTriangle size={25} /><span>Camera chưa sẵn sàng</span></div>}
        {scanner.error && <div className="barcode-scanner-error-panel" role="alert"><span>{scanner.error}</span><button className="barcode-scanner-retry" type="button" onClick={() => { void scanner.startScanner(); }}>Thử lại</button></div>}
      </div>
    </div>
    {scanner.diagnosticsEnabled && <ScannerTorchDiagnosticPanel samples={scanner.torchDiagnostics} onProbe={() => { void scanner.probeTorchCompatibility(); }} probePending={scanner.torchProbePending} probeResult={scanner.torchProbeResult} />}
  </section>;
}
