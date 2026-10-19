import type { DepartmentId } from '../types';

/**
 * Add or update employee accounts here. Set active to false to disable an account.
 * This frontend list is visible to users and is not secure authorization.
 */
export type LocalEmployeeRecord = {
  name: string;
  employeeCode: string;
  departmentId: DepartmentId;
  active?: boolean;
};

export const LOCAL_EMPLOYEE_DIRECTORY: LocalEmployeeRecord[] = [
  { name: 'Trương Dương', employeeCode: '20286233', departmentId: 'fmcg' },
  { name: 'Thiên Phú', employeeCode: '20401122', departmentId: 'fmcg' },
  { name: 'Hoàng An', employeeCode: '20401122', departmentId: 'fmcg' },
];

export function findLocalEmployeeByCode(employeeCode: string): LocalEmployeeRecord | undefined {
  const normalizedCode = employeeCode.trim().toLocaleLowerCase('vi');
  if (!normalizedCode) return undefined;

  return LOCAL_EMPLOYEE_DIRECTORY.find((employee) =>
    employee.employeeCode.toLocaleLowerCase('vi') === normalizedCode && employee.active !== false,
  );
}
