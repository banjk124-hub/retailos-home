import { ArrowLeft, ScanBarcode, Volume2, Vibrate } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useBodyScrollLock } from '../../../shared/hooks/useBodyScrollLock';
import { useScannerSettings } from '../hooks/useScannerSettings';
import {
  isScannerVibrationSupported,
  updateScannerSettings,
  SCANNER_SYMBOLOGY_OPTIONS,
  getEnabledScannerSymbologies,
  updateScannerSymbologyEnabled,
} from '../services/scannerSettingsStore';
import { previewScannerBeep } from '../services/scannerFeedback';
import '../../../styles/scanner-settings.css';

type Props = { onClose: () => void };

export default function ScannerSettingsPanel({ onClose }: Props) {
  const settings = useScannerSettings();
  const vibrationSupported = isScannerVibrationSupported();
  const backButtonRef = useRef<HTMLButtonElement>(null);
  useBodyScrollLock(true);

  useEffect(() => {
    backButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [onClose]);

  const volumeLabel = settings.beepVolume === 0 ? 'Tắt' : `${settings.beepVolume}%`;
  const enabledSymbologyCount = getEnabledScannerSymbologies(settings).length;
  const linearOptions = SCANNER_SYMBOLOGY_OPTIONS.filter((option) => option.group === 'linear');
  const matrixOptions = SCANNER_SYMBOLOGY_OPTIONS.filter((option) => option.group === 'matrix');

  return <div className="scanner-settings-backdrop" onClick={(event) => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <section className="scanner-settings-panel scanner-settings-panel--detail" role="dialog" aria-modal="true" aria-labelledby="scanner-settings-title">
      <header className="scanner-settings-header">
        <button ref={backButtonRef} type="button" className="scanner-settings-back" onClick={onClose} aria-label="Quay lại cài đặt"><ArrowLeft size={19} /></button>
        <span className="scanner-settings-header-icon"><ScanBarcode size={21} /></span>
        <div>
          <span className="scanner-settings-eyebrow">RETAILOS · SCANNER</span>
          <h2 id="scanner-settings-title">Cài đặt máy quét</h2>
          <p>Định dạng nhận diện và phản hồi khi quét thành công</p>
        </div>
      </header>

      <section className="scanner-preference-card scanner-symbology-card" aria-labelledby="scanner-symbology-title">
        <div className="scanner-preference-heading">
          <span className="scanner-preference-icon"><ScanBarcode size={19} /></span>
          <div>
            <h3 id="scanner-symbology-title">Định dạng barcode</h3>
            <p>{enabledSymbologyCount}/{SCANNER_SYMBOLOGY_OPTIONS.length} định dạng đang bật</p>
          </div>
        </div>
        <p className="scanner-preference-note">Chỉ những định dạng đang bật mới được gửi vào decoder. Bốn định dạng hiện tại được bật mặc định; các định dạng mở rộng mặc định tắt.</p>
        <div className="scanner-symbology-group">
          <h4>MÃ TUYẾN TÍNH · 1D</h4>
          {linearOptions.map((option) => {
            const enabled = settings.symbologyEnabled[option.format];
            const isLastEnabled = enabled && enabledSymbologyCount <= 1;
            return <div className="scanner-symbology-row" key={option.format}>
              <div className="scanner-symbology-copy">
                <strong>{option.label}</strong>
                <span>{option.description}</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                aria-label={`${enabled ? 'Tắt' : 'Bật'} ${option.label}`}
                className={`scanner-settings-switch scanner-symbology-switch ${enabled ? 'is-on' : ''}`}
                disabled={isLastEnabled}
                onClick={() => updateScannerSymbologyEnabled(option.format, !enabled)}
              ><span /></button>
            </div>;
          })}
        </div>
        <div className="scanner-symbology-group">
          <h4>MÃ MA TRẬN · 2D</h4>
          {matrixOptions.map((option) => {
            const enabled = settings.symbologyEnabled[option.format];
            const isLastEnabled = enabled && enabledSymbologyCount <= 1;
            return <div className="scanner-symbology-row" key={option.format}>
              <div className="scanner-symbology-copy">
                <strong>{option.label}</strong>
                <span>{option.description}</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                aria-label={`${enabled ? 'Tắt' : 'Bật'} ${option.label}`}
                className={`scanner-settings-switch scanner-symbology-switch ${enabled ? 'is-on' : ''}`}
                disabled={isLastEnabled}
                onClick={() => updateScannerSymbologyEnabled(option.format, !enabled)}
              ><span /></button>
            </div>;
          })}
        </div>
        <p className="scanner-preference-note">Ít nhất một định dạng phải được bật. Thay đổi áp dụng từ lần mở máy quét tiếp theo và được dùng chung cho Home, Kiểm kê.</p>
      </section>

      <section className="scanner-preference-card" aria-labelledby="scanner-vibration-title">
        <div className="scanner-preference-heading">
          <span className="scanner-preference-icon"><Vibrate size={19} /></span>
          <div><h3 id="scanner-vibration-title">Rung khi quét thành công</h3><p>Một nhịp rung ngắn sau mỗi barcode được chấp nhận</p></div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.vibrationEnabled}
          aria-label={settings.vibrationEnabled ? "Tắt rung khi quét thành công" : "Bật rung khi quét thành công"}
          className={`scanner-settings-switch ${settings.vibrationEnabled ? 'is-on' : ''}`}
          disabled={!vibrationSupported}
          onClick={() => updateScannerSettings({ vibrationEnabled: !settings.vibrationEnabled })}
        ><span /></button>
        {!vibrationSupported
          ? <p className="scanner-preference-note is-unavailable">Trình duyệt hoặc thiết bị hiện tại không cung cấp API rung. Tùy chọn được giữ lại để dùng trên thiết bị có hỗ trợ.</p>
          : <p className="scanner-preference-note">Đang {settings.vibrationEnabled ? 'bật' : 'tắt'}. Cài đặt này áp dụng chung cho mọi chức năng Scanner.</p>}
      </section>

      <section className="scanner-preference-card" aria-labelledby="scanner-beep-title">
        <div className="scanner-preference-heading">
          <span className="scanner-preference-icon"><Volume2 size={19} /></span>
          <div><h3 id="scanner-beep-title">Âm lượng beep</h3><p>Điều chỉnh âm báo xác nhận khi quét thành công</p></div>
          <strong className="scanner-volume-value" aria-live="polite">{volumeLabel}</strong>
        </div>
        <label className="scanner-volume-control">
          <input
            type="range"
            min="0"
            max="100"
            step="10"
            value={settings.beepVolume}
            onChange={(event) => updateScannerSettings({ beepVolume: Number(event.currentTarget.value) })}
            aria-label="Âm lượng beep"
          />
          <span className="scanner-volume-scale"><span>0 · Tắt</span><span>50 · Mức trung bình</span><span>100 · Tối đa</span></span>
        </label>
        <div className="scanner-beep-preview-row">
          <p className="scanner-preference-note">Đã tăng mức âm thanh và kéo dài beep lên 140 ms. Âm lượng thực tế còn phụ thuộc âm lượng media của thiết bị.</p>
          <button type="button" className="scanner-beep-preview" disabled={settings.beepVolume === 0} onClick={() => { void previewScannerBeep(); }}>
            <Volume2 size={16} /> Thử beep
          </button>
        </div>
      </section>

      <p className="scanner-settings-footnote">Cấu hình được lưu cục bộ trên thiết bị. Home, Kiểm kê và các Scanner consumer khác luôn đọc cùng một bộ thiết lập.</p>
    </section>
  </div>;
}
