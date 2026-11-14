import { downloadFile } from '../../../shared/downloadFile';
import type { StocktakeEntry, StocktakeSession, StocktakeZone } from '../types/stocktake.types';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function createStocktakeFile(session: StocktakeSession, zone: StocktakeZone, entries: StocktakeEntry[], exportedAt = new Date()): { content: string; fileName: string; exportedAt: string } {
  const date = `${exportedAt.getFullYear()}/${pad(exportedAt.getMonth() + 1)}/${pad(exportedAt.getDate())}`;
  const time = `${pad(exportedAt.getHours())}:${pad(exportedAt.getMinutes())}:${pad(exportedAt.getSeconds())}`;
  const ymd = `${exportedAt.getFullYear()}${pad(exportedAt.getMonth() + 1)}${pad(exportedAt.getDate())}`;
  const lines = [
    `NHAN VIEN,${session.employeeCode},${date},${time}`,
    `ADRESSE,${zone.prefix},${zone.number}`,
    ...entries.map((entry) => `ARTICLE,${entry.barcode},${entry.quantity}`),
  ];
  return {
    content: lines.join('\r\n') + '\r\n',
    fileName: `${zone.zoneCode}_${ymd}.txt`,
    exportedAt: exportedAt.toISOString(),
  };
}

export function downloadStocktakeText(fileName: string, content: string): void {
  downloadFile(new Blob([content], { type: 'text/plain;charset=utf-8' }), fileName);
}
