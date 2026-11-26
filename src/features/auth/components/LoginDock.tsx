import { BookOpenText, Camera, CircleHelp, ShieldCheck } from 'lucide-react';
import { Surface } from '../../../shared/components/surface/Surface';
import { MOTION_PRESETS } from '../../../shared/motion';
import { Icon, MotionIcon } from '../../../shared/icons';

export function LoginDock() {
  return (
    <Surface
      as="aside"
      variant="floating"
      className="login-dock motion-presence"
      data-motion-preset={MOTION_PRESETS.dock}
      aria-label="Hướng dẫn đăng nhập"
    >
      <div className="login-dock__identity">
        <span className="login-dock__identity-icon">
          <MotionIcon icon={ShieldCheck} variant="secure" size={17} />
        </span>
        <span>
          <strong>Truy cập nội bộ</strong>
          <small>Kết nối bảo mật trên thiết bị</small>
        </span>
      </div>
      <details className="login-dock__help">
        <GlassSurface as="summary" variant="control" interactive className="login-dock__help-trigger" aria-label="Mở hướng dẫn đăng nhập">
          <MotionIcon icon={CircleHelp} variant="navigation" size={18} />
          <span>Trợ giúp</span>
        </GlassSurface>
        <GlassSurface as="div" variant="inverse" className="login-dock__help-content motion-presence" data-motion-preset="presence">
          <h3><Icon icon={BookOpenText} size="sm" /> Hướng dẫn nhanh</h3>
          <p>Nhập mã nhân viên do quản trị viên cấp. Nếu tài khoản chưa được kích hoạt, hãy liên hệ người quản lý.</p>
          <p><Icon icon={Camera} size="sm" /> Quyền camera chỉ được yêu cầu khi bạn mở chức năng quét barcode.</p>
          <p>RetailOS không yêu cầu quyền camera hoặc thông báo trong lúc đăng nhập.</p>
        </GlassSurface>
      </details>
    </GlassSurface>
  );
}
