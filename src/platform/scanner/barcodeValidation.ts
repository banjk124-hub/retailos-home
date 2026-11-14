import type { ScannerSymbology } from './contracts';

/** GS1 Mod-10 check digit used by EAN, UPC-A and GTIN-14 payloads. */
export function hasValidGs1CheckDigit(value: string): boolean {
  if (!/^\d+$/.test(value) || ![8, 12, 13, 14].includes(value.length)) return false;
  const body = value.slice(0, -1);
  const expected = Number(value.slice(-1));
  const sum = [...body].reduce((total, digit, index) => {
    const weight = (body.length - index) % 2 === 1 ? 3 : 1;
    return total + Number(digit) * weight;
  }, 0);
  return (10 - (sum % 10)) % 10 === expected;
}

function isValidUpcE(value: string): boolean {
  if (!/^[01]\d{7}$/.test(value)) return false;
  const [numberSystem, d1, d2, d3, d4, d5, d6, checkDigit] = value;
  let expanded: string;
  if ('012'.includes(d6)) {
    expanded = numberSystem + d1 + d2 + d6 + '0000' + d3 + d4 + d5 + checkDigit;
  } else if (d6 === '3') {
    expanded = numberSystem + d1 + d2 + d3 + '00000' + d4 + d5 + checkDigit;
  } else if (d6 === '4') {
    expanded = numberSystem + d1 + d2 + d3 + d4 + '00000' + d5 + checkDigit;
  } else {
    expanded = numberSystem + d1 + d2 + d3 + d4 + d5 + '0000' + d6 + checkDigit;
  }
  return hasValidGs1CheckDigit(expanded);
}

function invalid(reason: 'unsupported-format' | 'empty' | 'invalid-length' | 'invalid-check-digit' | 'control-character' | 'invalid-character') {
  return { valid: false as const, reason };
}

export function validateBarcodePayload(
  value: string,
  symbology: ScannerSymbology,
): { valid: boolean; reason: 'accepted' | 'unsupported-format' | 'empty' | 'invalid-length' | 'invalid-check-digit' | 'control-character' | 'invalid-character' } {
  const textFormats: ScannerSymbology[] = [
    'CODE_128', 'CODE_39', 'CODE_93', 'QR_CODE', 'DATA_MATRIX',
    'PDF_417', 'AZTEC', 'MAXICODE', 'MICRO_QR_CODE', 'RSS_EXPANDED',
  ];
  const preservesText = textFormats.includes(symbology) || symbology === 'CODABAR';
  const normalized = preservesText ? value : value.trim();
  if (normalized.length === 0) return invalid('empty');

  // GS (ASCII 29) is retained for GS1/2D payloads; other control characters
  // are rejected to avoid invisible data corrupting lookups or UI state.
  const allowsGroupSeparator = ['QR_CODE', 'DATA_MATRIX', 'PDF_417', 'AZTEC', 'MAXICODE', 'MICRO_QR_CODE', 'RSS_EXPANDED'].includes(symbology);
  const controlPattern = allowsGroupSeparator
    ? /[\u0000-\u0008\u000A-\u001C\u001E-\u001F\u007F]/
    : /[\u0000-\u001F\u007F]/;
  if (controlPattern.test(normalized)) return invalid('control-character');

  switch (symbology) {
    case 'EAN_8':
      if (!/^\d{8}$/.test(normalized)) return invalid('invalid-length');
      return hasValidGs1CheckDigit(normalized) ? { valid: true, reason: 'accepted' } : invalid('invalid-check-digit');
    case 'EAN_13':
      if (!/^\d{13}$/.test(normalized)) return invalid('invalid-length');
      return hasValidGs1CheckDigit(normalized) ? { valid: true, reason: 'accepted' } : invalid('invalid-check-digit');
    case 'UPC_A':
      if (!/^\d{12}$/.test(normalized)) return invalid('invalid-length');
      return hasValidGs1CheckDigit(normalized) ? { valid: true, reason: 'accepted' } : invalid('invalid-check-digit');
    case 'UPC_E':
      if (!/^[01]\d{7}$/.test(normalized)) return invalid('invalid-length');
      return isValidUpcE(normalized) ? { valid: true, reason: 'accepted' } : invalid('invalid-check-digit');
    case 'CODE_128':
      return { valid: true, reason: 'accepted' };
    case 'CODE_39':
      if (!/^[A-Z0-9 .$\x2F+%\-]+$/.test(normalized)) return invalid('invalid-character');
      return { valid: true, reason: 'accepted' };
    case 'CODE_93':
      if (!/^[\x20-\x7E]+$/.test(normalized)) return invalid('invalid-character');
      return { valid: true, reason: 'accepted' };
    case 'ITF':
      if (!/^\d{2,}$/.test(normalized) || normalized.length % 2 !== 0) return invalid('invalid-length');
      return { valid: true, reason: 'accepted' };
    case 'CODABAR':
      if (!/^[0-9$+:\x2F.\-]+$/.test(normalized)) return invalid('invalid-character');
      return { valid: true, reason: 'accepted' };
    case 'RSS_14':
      if (!/^\d{14}$/.test(normalized)) return invalid('invalid-length');
      return hasValidGs1CheckDigit(normalized) ? { valid: true, reason: 'accepted' } : invalid('invalid-check-digit');
    case 'RSS_EXPANDED':
    case 'QR_CODE':
    case 'DATA_MATRIX':
    case 'PDF_417':
    case 'AZTEC':
    case 'MAXICODE':
    case 'MICRO_QR_CODE':
      return { valid: true, reason: 'accepted' };
    default:
      return invalid('unsupported-format');
  }
}
