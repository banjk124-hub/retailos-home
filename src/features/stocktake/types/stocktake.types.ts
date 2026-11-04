export type StocktakeSession = {
  id: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  createdAt: string;
  status: 'active';
};

export type StocktakeZone = {
  id: string;
  sessionId: string;
  zoneCode: string;
  prefix: string;
  number: string;
  revision: number;
  status: 'draft' | 'exported' | 'superseded';
  createdAt: string;
  supersededAt?: string;
};

export type StocktakeEntry = {
  id: string;
  zoneId: string;
  barcode: string;
  quantity: number;
  sequence: number;
  scannedAt: string;
  source: 'scan' | 'manual';
  editedAt?: string;
};

export type StocktakeActionLog = {
  id: string;
  sessionId: string;
  zoneId?: string;
  action: string;
  timestamp: string;
  details: string;
};

export type StocktakeExport = {
  id: string;
  sessionId: string;
  zoneId: string;
  zoneCode: string;
  revision: number;
  fileName: string;
  exportedAt: string;
  fileContent: string;
  entryCount: number;
};
