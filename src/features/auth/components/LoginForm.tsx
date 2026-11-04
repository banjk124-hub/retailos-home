import {
  ArrowRight,
  Check,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import type { FormEvent } from 'react';
import type { LocalEmployeeRecord } from '../services/employeeDirectory';
import type { DepartmentConfig } from '../../../shared/config/departments';
import { MotionButton, MotionPresence } from '../../../shared/motion';
import { GlassSurface } from '../../../shared/components/glass';
import { getDepartmentIcon, MotionIcon } from '../../../shared/icons';

export type LoginStatus = 'idle' | 'submitting' | 'success' | 'error';

type Props = {
  employeeCode: string;
  status: LoginStatus;
  error: string;
  matchedEmployee?: LocalEmployeeRecord;
  matchedDepartment?: DepartmentConfig;
  onEmployeeCodeChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function LoginForm({
  employeeCode,
  status,
  error,
  matchedEmployee,
  matchedDepartment,
  onEmployeeCodeChange,
  onSubmit,
}: Props) {
  const isPending = status === 'submitting' || status === 'success';
  const EmployeeDepartmentIcon = getDepartmentIcon(matchedDepartment?.id);
  return (
    <GlassSurface
      as="section"
      material="frosted"
      className={`login-experience__panel${matchedEmployee && matchedDepartment ? ' has-employee' : ''}${status === 'submitting' ? ' is-loading' : ''}`}
      aria-labelledby="login-title"
    >
      <div className="login-panel__heading">
        <span className="login-panel__icon">
          <MotionIcon
            icon={LockKeyhole}
            variant="secure"
            state={status === 'error' || status === 'success' ? status : 'idle'}
            size={19}
          />
        </span>
        <span className="login-panel__eyebrow">CHÀO MỪNG TRỞ LẠI</span>
        <h2 id="login-title">Đăng nhập</h2>
        <div className="login-panel__identity-slot" aria-live="polite">
          {matchedEmployee && matchedDepartment && EmployeeDepartmentIcon ? (
            <MotionPresence
              key={matchedEmployee.employeeCode}
              preset="presence"
              className="login-panel__employee-presence"
            >
              <GlassSurface material="soft" className="login-panel__employee">
                <span className="login-panel__employee-icon">
                  <MotionIcon icon={EmployeeDepartmentIcon} variant="department" state="success" size={19} />
                </span>
                <span className="login-panel__employee-copy">
                  <strong>{matchedEmployee.name}</strong>
                  <small>{matchedDepartment.label} · {matchedDepartment.tagline}</small>
                </span>
                <span className="login-panel__employee-check">
                  <MotionIcon icon={Check} variant="secure" state="success" size={15} />
                </span>
              </GlassSurface>
            </MotionPresence>
          ) : (
            <p>Nhập mã nhân viên được cấp để tiếp tục.</p>
          )}
        </div>
      </div>

      <form className="login-form" onSubmit={onSubmit} noValidate>
        <div className="login-form__field">
          <label htmlFor="login-employee-code"><span>Mã nhân viên</span></label>
          <GlassSurface material="control" className="login-form__input-wrap" interactive data-glass-state={status === 'error' ? 'error' : undefined}>
            <span className="login-form__focus-ripple" aria-hidden="true" />
            <MotionIcon icon={UserRound} variant="secure" state={status === 'error' ? 'error' : undefined} size={18} />
            <input
              id="login-employee-code"
              name="employeeCode"
              type="text"
              inputMode="numeric"
              autoComplete="username"
              enterKeyHint="go"
              value={employeeCode}
              onChange={(event) => onEmployeeCodeChange(event.target.value.replace(/\D/g, ''))}
              placeholder="Nhập mã được cấp"
              aria-invalid={status === 'error'}
              aria-describedby={status === 'error' ? 'login-error' : undefined}
              required
            />
          </GlassSurface>
        </div>

        <div className="login-form__feedback-slot" aria-live="polite">
          {status === 'error' && (
            <MotionPresence preset="presence" className="login-form__feedback-presence">
              <div className="login-form__error" id="login-error" role="alert">
                <MotionIcon icon={ShieldCheck} variant="secure" state="error" size={17} />
                <span>{error}</span>
              </div>
            </MotionPresence>
          )}
          {status === 'success' && (
            <MotionPresence preset="presence" className="login-form__feedback-presence">
              <div className="login-form__success" role="status">
                <MotionIcon icon={Check} variant="secure" state="success" size={17} />
                <span>Đã xác thực. Đang mở không gian làm việc…</span>
              </div>
            </MotionPresence>
          )}
        </div>

        <MotionButton
          material="control"
          tone="brand"
          motionState={status === 'submitting'
            ? 'loading'
            : status === 'error' || status === 'success'
              ? status
              : employeeCode.trim() ? 'idle' : 'disabled'}
          motionPhase={status === 'submitting' ? 'activate' : 'press'}
          className="login-form__submit ro-button ro-button--primary"
          type="submit"
          disabled={!employeeCode.trim() || isPending}
          data-state={status}
          aria-busy={status === 'submitting'}
        >
          <span>{status === 'submitting' ? 'Đang xác thực' : status === 'success' ? 'Đang mở RetailOS' : 'Đăng nhập'}</span>
          <span className="login-form__submit-icon">
            {status === 'submitting'
              ? <MotionIcon icon={LoaderCircle} variant="secure" state="loading" size={19} />
              : status === 'success'
                ? <MotionIcon icon={Check} variant="secure" state="success" size={19} />
                : <MotionIcon icon={ArrowRight} variant="arrow" size={19} />}
          </span>
          {status === 'submitting' && <span className="login-form__energy motion-energy-sweep" aria-hidden="true" />}
        </MotionButton>
      </form>
    </GlassSurface>
  );
}
