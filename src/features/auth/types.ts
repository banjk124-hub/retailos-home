export type DepartmentId = 'fmcg' | 'fresh' | 'softline' | 'homeline' | 'warehouse';

export type EmployeeSession = {
  name: string;
  employeeCode: string;
  department: string;
  departmentId: DepartmentId;
  signedInAt: string;
};

export type LoginCredentials = {
  employeeCode: string;
};
