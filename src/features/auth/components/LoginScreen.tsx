import { type FormEvent, useEffect, useRef, useState } from 'react';
import { ArrowRight, Bell, Camera, Check, Eye, EyeOff, LockKeyhole, PackageCheck, ShieldCheck } from 'lucide-react';
import { getDepartment } from '../../../shared/config/departments';
import { Brand } from '../../../shared/components/Brand';
import { DEVICE_ACCESS, readDeviceAccessStatuses, requestDeviceAccess, type DeviceAccessId, type DeviceAccessStatus } from '../services/deviceAccess';
import { isPushConfigured, subscribeForPushNotifications } from '../../notifications/pushNotifications';
import { authenticateLocally } from '../services/localAuth';
import { findLocalEmployeeByCode } from '../services/employeeDirectory';
import { readLastLoginName, saveLastLoginName } from '../services/lastLoginStore';
import type { EmployeeSession } from '../types';

type Props = { onAuthenticated: (session: EmployeeSession) => void };
type LoginStatus = 'idle' | 'error' | 'loading';
type PushStatus = 'idle' | 'ready' | 'not-configured' | 'error';

export default function LoginScreen({ onAuthenticated }: Props) {
  const [employeeCode, setEmployeeCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [status, setStatus] = useState<LoginStatus>('idle');
  const [error, setError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [rememberedName] = useState(() => Boolean(readLastLoginName()));
  const [deviceAccessStatuses, setDeviceAccessStatuses] = useState<Record<DeviceAccessId, DeviceAccessStatus>>({
    camera: 'checking',
    notifications: 'checking',
  });
  const [requestingAccess, setRequestingAccess] = useState<DeviceAccessId | null>(null);
  const [pushStatus, setPushStatus] = useState<PushStatus>('idle');
  const [pendingSession, setPendingSession] = useState<EmployeeSession | null>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const matchedEmployee = findLocalEmployeeByCode(employeeCode);
  const matchedDepartment = matchedEmployee ? getDepartment(matchedEmployee.departmentId) : undefined;

  useEffect(() => {
    if (status !== 'loading') return;
    let isCurrent = true;
    void readDeviceAccessStatuses().then((statuses) => {
      if (!isCurrent) return;
      setDeviceAccessStatuses(statuses);
      if (statuses.notifications === 'granted' && !isPushConfigured()) setPushStatus('not-configured');
    });
    return () => { isCurrent = false; };
  }, [status]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === 'loading') return;

    const result = authenticateLocally({ employeeCode });
    if (result.ok === false) {
      setError(result.message);
      setStatus('error');
      setFailedAttempts((attempts) => attempts + 1);
      return;
    }

    saveLastLoginName(result.session.name);
    setError('');
    setStatus('loading');
    setDeviceAccessStatuses({ camera: 'checking', notifications: 'checking' });
    setRequestingAccess(null);
    setPushStatus('idle');
    codeInputRef.current?.blur();
    setPendingSession(result.session);
  };

  const handleRequestAccess = async (id: DeviceAccessId) => {
    if (requestingAccess !== null) return;
    setRequestingAccess(id);
    setDeviceAccessStatuses((statuses) => ({ ...statuses, [id]: 'checking' }));
    try {
      const permissionStatus = id === 'notifications' && deviceAccessStatuses.notifications === 'granted'
        ? 'granted'
        : await requestDeviceAccess(id);
      setDeviceAccessStatuses((statuses) => ({ ...statuses, [id]: permissionStatus }));
      if (id === 'notifications' && permissionStatus === 'granted') {
        const result = await subscribeForPushNotifications();
        setPushStatus(result);
      }
    } catch {
      if (id === 'notifications' && Notification.permission === 'granted') {
        setDeviceAccessStatuses((statuses) => ({ ...statuses, notifications: 'granted' }));
        setPushStatus('error');
      } else {
        setDeviceAccessStatuses((statuses) => ({ ...statuses, [id]: 'error' }));
      }
    } finally {
      setRequestingAccess(null);
    }
  };

  const continueToApp = () => {
    if (pendingSession) onAuthenticated(pendingSession);
  };

  const updateCode = (value: string) => {
    setEmployeeCode(value);
    setStatus('idle');
    setError('');
    setPendingSession(null);
  };

  if (status === 'loading' && matchedDepartment && pendingSession) {
    const DepartmentIcon = matchedDepartment.icon;
    return <main className={`auth-page auth-page--loading auth-page--${matchedDepartment.id}`}>
      <div className="auth-loading-orbit auth-loading-orbit--outer" aria-hidden="true" />
      <div className="auth-loading-orbit auth-loading-orbit--inner" aria-hidden="true" />
      <section className="auth-loading-card" aria-labelledby="auth-loading-title">
        <Brand />
        <div className="auth-loading-symbol"><DepartmentIcon size={26} /></div>
        <span className="auth-loading-label">KHỞI TẠO KHÔNG GIAN</span>
        <h1 id="auth-loading-title">{matchedDepartment.label}</h1>
        <p>{matchedDepartment.greeting}</p>
        <div className="device-access-list" aria-label="Quyền thiết bị">
          {DEVICE_ACCESS.map((access) => {
            const accessStatus = deviceAccessStatuses[access.id];
            const statusText: Record<DeviceAccessStatus, string> = {
              checking: 'Đang kiểm tra quyền…',
              prompt: 'Chưa cấp quyền',
              granted: 'Đã cấp quyền trên thiết bị',
              denied: 'Đã bị chặn trong cài đặt trình duyệt',
              unsupported: access.id === 'camera' && !window.isSecureContext
                ? 'Cần HTTPS để trình duyệt yêu cầu quyền camera'
                : 'Thiết bị hoặc trình duyệt không hỗ trợ',
              'needs-install': 'Cần cài ứng dụng vào Màn hình chính',
              error: 'Không thể yêu cầu quyền lúc này',
            };
            const accessStatusText = access.id === 'notifications' && accessStatus === 'granted'
              ? pushStatus === 'ready'
                ? 'Đã đăng ký nhận push trên thiết bị'
                : 'Đã cấp quyền thông báo của trình duyệt'
              : statusText[accessStatus];
            const canRequest = accessStatus === 'prompt' || accessStatus === 'error' ||
              (access.id === 'camera' && accessStatus === 'denied') ||
              (access.id === 'notifications' && accessStatus === 'granted' && pushStatus !== 'ready' && isPushConfigured());
            const isRequesting = requestingAccess === access.id;
            return <div className="device-access-item" key={access.id}>
              <div className="device-access-copy">
                <span className={`device-access-icon device-access-icon--${accessStatus}`}>
                  {access.id === 'camera' ? <Camera size={16} /> : <Bell size={16} />}
                </span>
                <span>
                  <strong>{access.label}</strong>
                  <small aria-live="polite">{isRequesting && access.id === 'notifications' ? 'Đang đăng ký push…' : accessStatusText}</small>
                  <small>{access.description}</small>
                </span>
              </div>
              <button
                className="device-access-request"
                type="button"
                disabled={!canRequest || requestingAccess !== null}
                onClick={() => { void handleRequestAccess(access.id); }}
              >
                {isRequesting ? 'Đang chờ…' : accessStatus === 'granted' && access.id === 'camera' ? <Check size={16} /> : accessStatus === 'granted' ? 'Kết nối push' : accessStatus === 'denied' && access.id === 'camera' ? 'Kiểm tra lại' : 'Cho phép'}
              </button>
              {access.id === 'camera' && !window.isSecureContext && <p className="device-access-note">Mở ứng dụng bằng HTTPS. Địa chỉ LAN dạng http://192.168.x.x không được trình duyệt cho phép mở camera.</p>}
              {accessStatus === 'needs-install' && access.iosNote && <p className="device-access-note">{access.iosNote}</p>}
              {accessStatus === 'denied' && <p className="device-access-note">Mở cài đặt trang web trong trình duyệt để đổi quyền.</p>}
              {accessStatus === 'error' && <p className="device-access-note">Kiểm tra kết nối bảo mật và thử lại.</p>}
              {access.id === 'notifications' && pushStatus === 'not-configured' && <p className="device-access-note">Cần cấu hình backend push và khóa VAPID công khai để đăng ký nhận thông báo đẩy.</p>}
              {access.id === 'notifications' && pushStatus === 'error' && <p className="device-access-note">Không đăng ký được push. Kiểm tra endpoint HTTPS, CORS và cấu hình backend rồi thử lại.</p>}
            </div>;
          })}
        </div>
        <p className="device-access-privacy">Bạn có thể tiếp tục mà không cấp quyền. Quyền được lưu theo cài đặt của thiết bị/trình duyệt.</p>
        <button className="auth-submit auth-loading-continue" type="button" onClick={continueToApp}>
          <span>Tiếp tục vào RetailOS</span>
          <span className="auth-submit-icon"><ArrowRight size={18} /></span>
        </button>
      </section>
    </main>;
  }

  return <main className={`auth-page ${matchedDepartment ? `auth-page--${matchedDepartment.id}` : ''}`}>
    <div className="auth-orb auth-orb--one" aria-hidden="true" />
    <div className="auth-orb auth-orb--two" aria-hidden="true" />
    <div className="auth-layout">
      <section className="auth-story" aria-label="RetailOS">
        <div className="auth-story-top"><Brand /><span className="auth-version">NỘI BỘ · 0.3</span></div>

        <div className="auth-story-copy">
          <span className="auth-eyebrow"><i /> KHÔNG GIAN VẬN HÀNH</span>
          <h1>Mọi hoạt động.<br /><span>Một tầm nhìn.</span></h1>
          <p>Đăng nhập để tiếp tục quản lý công việc và hoạt động bán lẻ của bạn.</p>
        </div>

        <div className="auth-visual" aria-hidden="true">
          <div className="auth-visual-grid" />
          <div className="auth-ring auth-ring--outer" />
          <div className="auth-ring auth-ring--inner" />
          <div className="auth-visual-card">
            <div className="auth-visual-card-head"><span><PackageCheck size={16} /></span><i /></div>
            <strong>{matchedDepartment ? matchedDepartment.label : 'Vận hành'}<br />{matchedDepartment ? matchedDepartment.tagline : 'liền mạch'}</strong>
            <div className="auth-visual-bars"><i /><i /><i /><i /><i /><i /></div>
            <div className="auth-visual-caption"><span>RETAIL OPERATIONS</span><ArrowRight size={14} /></div>
          </div>
          <span className="auth-orbit-dot auth-orbit-dot--one" />
          <span className="auth-orbit-dot auth-orbit-dot--two" />
        </div>

        <div className="auth-story-foot"><span><span className="auth-foot-dot" /> HỆ THỐNG SẴN SÀNG</span><span>RETAILOS</span></div>
      </section>

      <section className="auth-form-side" aria-labelledby="auth-title">
        <div className="auth-form-card">
          <div className="auth-mobile-brand"><Brand /></div>
          <div className="auth-heading">
            <span className="auth-heading-icon"><LockKeyhole size={19} /></span>
            <div className="auth-eyebrow">CHÀO MỪNG TRỞ LẠI</div>
            <h2 id="auth-title">Đăng nhập</h2>
            <p>{matchedEmployee ? `Xin chào ${matchedEmployee.name}, nhập mã để tiếp tục.` : 'Nhập mã nhân viên được cấp cho bạn.'}</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label htmlFor="auth-code">Mã nhân viên <span>BẢO MẬT</span></label>
              <div className={`auth-input-wrap ${status === 'error' ? 'has-error' : ''}`}>
                <LockKeyhole size={18} aria-hidden="true" />
                <input
                  ref={codeInputRef}
                  id="auth-code"
                  name="employeeCode"
                  autoComplete="off"
                  inputMode="numeric"
                  autoFocus
                  enterKeyHint="go"
                  type={showCode ? 'text' : 'password'}
                  value={employeeCode}
                  onChange={(event) => updateCode(event.target.value)}
                  placeholder="Nhập mã được cấp"
                  aria-invalid={status === 'error'}
                  aria-describedby={status === 'error' ? 'auth-error' : 'auth-code-hint'}
                  required
                />
                <button
                  className="auth-reveal"
                  type="button"
                  aria-label={showCode ? 'Ẩn mã nhân viên' : 'Hiện mã nhân viên'}
                  onClick={() => setShowCode((visible) => !visible)}
                >
                  {showCode ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              <span className="auth-field-hint" id="auth-code-hint">
                {matchedEmployee && matchedDepartment
                  ? `Tài khoản: ${matchedEmployee.name} · ${matchedDepartment.label}`
                  : 'Tên và bộ phận sẽ tự nhận diện theo tài khoản.'}
              </span>
            </div>

            {status === 'error' && <div
              key={failedAttempts}
              className={`auth-error auth-error--${failedAttempts % 2}`}
              id="auth-error"
              role="alert"
            >
              <ShieldCheck size={17} aria-hidden="true" />
              <span>{error}</span>
            </div>}

            <button className="auth-submit" type="submit" disabled={!employeeCode.trim() || status === 'loading'}>
              <span>Đăng nhập</span>
              <span className="auth-submit-icon"><ArrowRight size={18} /></span>
            </button>
          </form>

          <div className="auth-session-note">
            <ShieldCheck size={16} aria-hidden="true" />
            <span>{rememberedName ? 'Tên tài khoản gần nhất được ghi nhớ trên thiết bị này.' : 'Phiên đăng nhập sẽ được ghi nhớ trên thiết bị này.'}</span>
          </div>
          <div className="auth-managed-note">TÀI KHOẢN ĐƯỢC CẤP BỞI QUẢN TRỊ VIÊN</div>
        </div>
      </section>
    </div>
  </main>;
}
