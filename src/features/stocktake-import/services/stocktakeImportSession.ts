import {
  buildStocktakeOutput,
  buildZoneFileName,
  type StocktakeImportResult,
} from './stocktakeImportParser';

export type ZoneConflict = {
  zoneCode: string;
  existingRows: number;
  incomingRows: number;
  duplicateWithinBatch: boolean;
};

export type ImportReviewMeta = {
  duplicateFiles: string[];
  sameNameDifferentContent: string[];
};

export function detectStocktakeImportConflicts(
  current: StocktakeImportResult | null,
  incoming: StocktakeImportResult[],
): ZoneConflict[] {
  const existingRows = new Map((current?.zones ?? []).map((zone) => [zone.zoneCode, zone.rows.length]));
  const incomingRows = new Map<string, number>();
  const incomingSources = new Map<string, number>();

  for (const result of incoming) {
    for (const zone of result.zones) {
      incomingRows.set(zone.zoneCode, (incomingRows.get(zone.zoneCode) ?? 0) + zone.rows.length);
      incomingSources.set(zone.zoneCode, (incomingSources.get(zone.zoneCode) ?? 0) + 1);
    }
  }

  return [...incomingRows.keys()]
    .filter((zoneCode) => existingRows.has(zoneCode) || (incomingSources.get(zoneCode) ?? 0) > 1)
    .map((zoneCode) => ({
      zoneCode,
      existingRows: existingRows.get(zoneCode) ?? 0,
      incomingRows: incomingRows.get(zoneCode) ?? 0,
      duplicateWithinBatch: (incomingSources.get(zoneCode) ?? 0) > 1,
    }));
}

export function mergeStocktakeImportSession(
  current: StocktakeImportResult | null,
  incoming: StocktakeImportResult[],
  employeeCode: string,
  mergeConflicts: boolean,
  reviewMeta: ImportReviewMeta = { duplicateFiles: [], sameNameDifferentContent: [] },
): StocktakeImportResult {
  if (incoming.length === 0) {
    if (!current) throw new Error('Không có dữ liệu để tạo phiên nhập.');
    return current;
  }

  const importedAt = current?.importedAt ?? incoming[0].importedAt;
  const zones = current
    ? current.zones.map((zone) => ({ ...zone, rows: [...zone.rows] }))
    : [];
  const zoneIndexes = new Map(zones.map((zone, index) => [zone.zoneCode, index]));
  const skippedZoneWarnings: string[] = [];
  const mergedZoneWarnings: string[] = [];

  for (const parsed of incoming) {
    for (const incomingZone of parsed.zones) {
      const existingIndex = zoneIndexes.get(incomingZone.zoneCode);
      if (existingIndex !== undefined) {
        if (mergeConflicts) {
          const sourceNames = [...new Set(incomingZone.rows.map((row) => row.sourceFileName).filter(Boolean))];
          mergedZoneWarnings.push(
            'Đã gộp ' + incomingZone.rows.length + ' dòng bổ sung vào vùng ' +
            incomingZone.zoneCode + (sourceNames.length ? ' từ ' + sourceNames.join(', ') : '') + ' sau xác nhận.',
          );
          zones[existingIndex] = {
            ...zones[existingIndex],
            rows: [...zones[existingIndex].rows, ...incomingZone.rows],
          };
        } else {
          const sourceNames = [...new Set(incomingZone.rows.map((row) => row.sourceFileName).filter(Boolean))];
          skippedZoneWarnings.push(
            'Đã bỏ qua ' + incomingZone.rows.length + ' dòng bổ sung của vùng ' +
            incomingZone.zoneCode + (sourceNames.length ? ' từ ' + sourceNames.join(', ') : '') + '.',
          );
        }
        continue;
      }
      zoneIndexes.set(incomingZone.zoneCode, zones.length);
      zones.push({ ...incomingZone, rows: [...incomingZone.rows] });
    }
  }

  const baseSources = current?.sourceFiles?.length
    ? current.sourceFiles
    : current ? [{
      name: current.sourceFileName,
      fingerprint: 'legacy:' + current.sourceFileName,
      size: 0,
      lastModified: 0,
    }] : [];
  const sourceFiles = [...baseSources, ...incoming.flatMap((item) => item.sourceFiles ?? [])]
    .filter((source, index, all) =>
      all.findIndex((candidate) => candidate.fingerprint === source.fingerprint) === index);

  return {
    sourceFileName: sourceFiles.length === 1 ? sourceFiles[0].name : sourceFiles.length + ' file nguồn',
    sourceFiles,
    importedAt,
    zones: zones.map((zone) => ({
      ...zone,
      content: buildStocktakeOutput(employeeCode, zone.zoneCode, zone.rows, new Date(importedAt)),
      fileName: buildZoneFileName(zone.zoneCode),
    })),
    warnings: [
      ...(current?.warnings ?? []),
      ...incoming.flatMap((item) => item.warnings),
      ...mergedZoneWarnings,
      ...skippedZoneWarnings,
      ...reviewMeta.sameNameDifferentContent.map((name) =>
        'Tên file ' + name + ' trùng với nguồn đã có nhưng nội dung chưa được xác nhận là trùng; đã nhận như một nguồn riêng.'),
      ...(reviewMeta.duplicateFiles.length
        ? ['Đã bỏ qua file trùng nội dung: ' + reviewMeta.duplicateFiles.join(', ') + '.']
        : []),
    ],
    blockingIssues: [
      ...(current?.blockingIssues ?? []),
      ...incoming.flatMap((item) => item.blockingIssues),
    ],
  };
}
