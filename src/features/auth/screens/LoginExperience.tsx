import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowUpRight, Check, LockKeyhole, ScanLine, ShieldCheck, UserRound } from 'lucide-react';
import { getDepartment } from '../../../shared/config/departments';
import type { EmployeeSession } from '../types';
import { authenticateLocally } from '../services/localAuth';
import { findLocalEmployeeByCode } from '../services/employeeDirectory';
import { Brand } from '../../../shared/brand';
import { getMotionOrigin, useMotionState } from '../../../shared/motion';
import type { MotionOrigin } from '../../../shared/motion';
import './retail-login.css';

type LoginStatus = 'idle' | 'submitting' | 'success' | 'error';
type Props = { onAuthenticated: (session: EmployeeSession, origin?: MotionOrigin) => void };

export default function LoginExperience({ onAuthenticated }: Props) {
  const [employeeCode, setEmployeeCode] = useState('');
  const [status, setStatus] = useState<LoginStatus>('idle');
  const [error, setError] = useState('');
  const [pendingSession, setPendingSession] = useState<EmployeeSession | null>(null);
  const [pendingOrigin, setPendingOrigin] = useState<MotionOrigin | null>(null);
  const transitionTimer = useRef<number | null>(null);
  const { prefersReducedMotion } = useMotionState();
  const matchedEmployee = findLocalEmployeeByCode(employeeCode);
  const matchedDepartment = matchedEmployee ? getDepartment(matchedEmployee.departmentId) : undefined;

  useEffect(() => {
    if (!pendingSession) return;
    transitionTimer.current = window.setTimeout(
      () => onAuthenticated(pendingSession, pendingOrigin ?? undefined),
      prefersReducedMotion ? 0 : 180,
    );
    return () => {
      if (transitionTimer.current !== null) {
        window.clearTimeout(transitionTimer.current);
        transitionTimer.current = null;
      }
    };
  }, [onAuthenticated, pendingOrigin, pendingSession, prefersReducedMotion]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!employeeCode.trim() || status === 'submitting' || status === 'success') return;
    setStatus('submitting');
    setError('');
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const button = submitter instanceof HTMLElement ? submitter : event.currentTarget.querySelector('button[type="submit"]');
    setPendingOrigin(button ? getMotionOrigin(button) : null);
    const submittedCode = employeeCode.trim();
    window.setTimeout(() => {
      const result = authenticateLocally({ employeeCode: submittedCode });
      if (result.ok === false) {
        setError(result.message);
        setStatus('error');
        setPendingSession(null);
        setPendingOrigin(null);
        return;
      }
      setStatus('success');
      setPendingSession(result.session);
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    }, 120);
  };

  const updateCode = (value: string) => {
    if (status === 'submitting' || status === 'success') return;
    setEmployeeCode(value.replace(/\\D/g, ''));
    setStatus('idle');
    setError('');
    setPendingSession(null);
    setPendingOrigin(null);
  };

  return (
    <main className={`retail-login ${status === 'success' ? 'is-success' : ''}`}>
      <section className="retail-login__story" aria-label="RetailOS workspace">
        <div className="retail-login__story-top">
          <Brand variant="full" surface="dark" />
          <span className="retail-login__edition">STORE OPERATIONS PLATFORM</span>
        </div>
        <div className="retail-login__story-copy">
          <span className="retail-login__overline"><i /> RETAIL OPERATIONS · WORKSPACE</span>
          <h1>Vận hành<br /><em>liền mạch.</em></h1>
          <p>Một không gian làm việc thống nhất cho con người, hàng hóa và hoạt động tại cửa hàng.</p>
        </div>
        <div className="retail-login__story-bottom">
          <div className="retail-login__signal"><span className="retail-login__signal-icon"><ScanLine size={17} /></span><span><b>CONNECTED WORKSPACE</b><small>Hệ thống vận hành bán lẻ</small></span></div>
          <span className="retail-login__index">01 / 04</span>
        </div>
        <div className="retail-login__orb retail-login__orb--one" aria-hidden="true" />
        <div className="retail-login__orb retail-login__orb--two" aria-hidden="true" />
        <div className="retail-login__grid" aria-hidden="true" />
      </section>

      <section className="retail-login__access">
        <div className="retail-login__access-inner">
          <div className="retail-login__mobile-brand"><Brand variant="full" surface="light" /></div>
          <div className="retail-login__access-heading">
            <span className="retail-login__overline">EMPLOYEE ACCESS</span>
            <h2>Chào mừng trở lại</h2>
            <p>Đăng nhập bằng mã nhân viên được cấp.</p>
          </div>

          <form className="retail-login__form" onSubmit={handleSubmit} noValidate>
            <label htmlFor="retail-employee-code">Mã nhân viên</label>
            <div className={`retail-login__field ${status === 'error' ? 'has-error' : ''} ${matchedEmployee ? 'has-match' : ''}`}>
              <UserRound size={19} aria-hidden="true" />
              <input
                id="retail-employee-code"
                name="employeeCode"
                type="text"
                inputMode="numeric"
                autoComplete="username"
                enterKeyHint="go"
                value={employeeCode}
                onChange={(event) => updateCode(event.target.value)}
                placeholder="Nhập mã nhân viên"
                aria-invalid={status === 'error'}
                aria-describedby={status === 'error' ? 'retail-login-error' : matchedEmployee ? 'retail-login-match' : undefined}
                required
              />
              {matchedEmployee && <Check className="retail-login__field-check" size={18} aria-hidden="true" />}
            </div>

            <div className="retail-login__identity" aria-live="polite">
              {matchedEmployee && matchedDepartment ? (
                <div className="retail-login__employee" id="retail-login-match">
                  <span className="retail-login__employee-avatar">{matchedEmployee.name.split(/\\s+/).filter(Boolean).slice(-2).map((part) => part[0]?.toUpperCase()).join('')}</span>
                  <span><b>{matchedEmployee.name}</b><small>{matchedDepartment.label} · {matchedDepartment.tagline}</small></span>
                  <ShieldCheck size={18} />
                </div>
              ) : <span className="retail-login__hint"><LockKeyhole size={14} /> Phiên truy cập nội bộ dành cho nhân viên</span>}
            </div>

            <div className="retail-login__feedback" aria-live="polite">
              {status === 'error' && <p id="retail-login-error" role="alert">{error}</p>}
              {status === 'success' && <p className="is-success"><Check size={16} /> Đã xác thực. Đang mở không gian làm việc…</p>}
            </div>

            <button className="retail-login__submit" type="submit" disabled={!employeeCode.trim() || status === 'submitting' || status === 'success'} aria-busy={status === 'submitting'}>
              <span>{status === 'submitting' ? 'Đang xác thực…' : status === 'success' ? 'Đang mở RetailOS' : 'Vào không gian làm việc'}</span>
              {status === 'success' ? <Check size={19} /> : <ArrowUpRight size={19} />}
            </button>
          </form>

          <div className="retail-login__security"><ShieldCheck size={15} /><span>Truy cập được xác thực theo danh tính nhân viên trên thiết bị.</span></div>
        </div>
        <footer className="retail-login__footer"><span>RETAILOS</span><span>BUILT FOR EVERYDAY OPERATIONS</span></footer>
      </section>
    </main>
  );
}
