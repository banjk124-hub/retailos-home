import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { getDepartment } from '../../../shared/config/departments';
import type { EmployeeSession } from '../types';
import { authenticateLocally } from '../services/localAuth';
import { findLocalEmployeeByCode } from '../services/employeeDirectory';
import { LoginDock } from '../components/LoginDock';
import { LoginForm, type LoginStatus } from '../components/LoginForm';
import { LoginHero } from '../components/LoginHero';
import { getMotionOrigin, MotionPage, useMotionState } from '../../../shared/motion';
import type { MotionOrigin } from '../../../shared/motion';
import '../../../styles/login-experience.css';

type Props = {
  onAuthenticated: (session: EmployeeSession, origin?: MotionOrigin) => void;
};

export default function LoginExperience({ onAuthenticated }: Props) {
  const [employeeCode, setEmployeeCode] = useState('');
  const [status, setStatus] = useState<LoginStatus>('idle');
  const [error, setError] = useState('');
  const [pendingSession, setPendingSession] = useState<EmployeeSession | null>(null);
  const [pendingOrigin, setPendingOrigin] = useState<MotionOrigin | null>(null);
  const transitionTimer = useRef<number | null>(null);
  const { prefersReducedMotion } = useMotionState();
  const matchedEmployee = findLocalEmployeeByCode(employeeCode);
  const matchedDepartment = matchedEmployee
    ? getDepartment(matchedEmployee.departmentId)
    : undefined;

  useEffect(() => {
    if (!pendingSession) return;
    transitionTimer.current = window.setTimeout(() => {
      onAuthenticated(pendingSession, pendingOrigin ?? undefined);
    }, prefersReducedMotion ? 0 : 180);
    return () => {
      if (transitionTimer.current !== null) {
        window.clearTimeout(transitionTimer.current);
        transitionTimer.current = null;
      }
    };
  }, [onAuthenticated, pendingOrigin, pendingSession, prefersReducedMotion]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === 'submitting' || status === 'success') return;

    setStatus('submitting');
    setError('');
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const submitButton = submitter instanceof HTMLElement
      ? submitter
      : event.currentTarget.querySelector<HTMLButtonElement>('.login-form__submit');
    setPendingOrigin(submitButton ? getMotionOrigin(submitButton) : null);
    const submittedCode = employeeCode.trim();

    // Allow React to paint the pressed/loading state before local validation runs.
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

  const updateEmployeeCode = (value: string) => {
    if (status === 'success' || status === 'submitting') return;
    setEmployeeCode(value);
    setStatus('idle');
    setError('');
    setPendingSession(null);
    setPendingOrigin(null);
  };

  return (
    <main className={`login-experience${status === 'success' ? ' is-authenticating' : ''}`}>
      <div className="login-experience__ambient" aria-hidden="true">
        <span />
        <span />
      </div>
      <MotionPage phase={status === 'success' ? 'reveal' : 'travel'} className="login-experience__layout">
        <LoginHero />
        <LoginForm
          employeeCode={employeeCode}
          matchedEmployee={matchedEmployee}
          matchedDepartment={matchedDepartment}
          status={status}
          error={error}
          onEmployeeCodeChange={updateEmployeeCode}
          onSubmit={handleSubmit}
        />
      </MotionPage>
      <LoginDock />
    </main>
  );
}
