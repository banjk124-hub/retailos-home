import type { DepartmentId } from './department';

/** Minimal employee identity shared across application features. Authentication owns its creation and lifecycle. */
export type EmployeeSession = {
  name: string;
  employeeCode: string;
  department: string;
  departmentId: DepartmentId;
  signedInAt: string;
};
