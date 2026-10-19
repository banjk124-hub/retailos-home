import type { EmployeeSession, LoginCredentials } from '../types';
import { getDepartment } from '../../../shared/config/departments';
import { findLocalEmployeeByCode, LOCAL_EMPLOYEE_DIRECTORY } from './employeeDirectory';

/**
 * Frontend-only account matching for this internal prototype.
 * This is not a security boundary: client code can be inspected or modified.
 */
export type AuthResult = { ok: true; session: EmployeeSession } | { ok: false; message: string };

export function authenticateLocally(credentials: LoginCredentials): AuthResult {
  const employeeCode = credentials.employeeCode.trim();
  if (!employeeCode) {
    return { ok: false, message: 'Nhập mã nhân viên để tiếp tục.' };
  }

  const record = findLocalEmployeeByCode(employeeCode);
  if (!record) {
    const message = LOCAL_EMPLOYEE_DIRECTORY.length === 0
      ? 'Chưa có tài khoản nào. Hãy thêm nhân viên vào danh mục tài khoản.'
      : 'Mã nhân viên không khớp với tài khoản được cấp hoặc tài khoản đã bị khóa.';
    return { ok: false, message };
  }

  const department = getDepartment(record.departmentId);
  if (!department) {
    return { ok: false, message: 'Bộ phận của tài khoản chưa được cấu hình hợp lệ.' };
  }

  return {
    ok: true,
    session: {
      name: record.name,
      employeeCode: record.employeeCode,
      department: department.label,
      departmentId: department.id,
      signedInAt: new Date().toISOString(),
    },
  };
}
