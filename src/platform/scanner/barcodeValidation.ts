import type { ScannerSymbology } from './contracts';

/** Retail barcode payload policy shared by the scanner session and tests. */
export function hasValidGs1CheckDigit(value: string): boolean {
  if (!/^\d+$/.test(value) || ![8, 12, 13].includes(value.length)) return false;
  const body = value.slice(0, -1);
  const expected = Number(value.slice(-1));
  const sum = [...body].reduce((total, digit, index) => {
    const weight = (body.length - index) % 2 === 1 ? 3 : 1;
    return total + Number(digit) * weight;
  }, 0);
  return (10 - (sum % 10)) % 10 === expected;
}

export function validateBarcodePayload(
  value: string,
  symbology: ScannerSymbology,
): { valid: boolean; reason: 'accepted' | 'unsupported-format' | 'empty' | 'invalid-length' | 'invalid-check-digit' | 'control-character' | 'invalid-character' } {
  if (symbology !== 'EAN_8' && symbology !== 'EAN_13'
    && symbology !== 'CODE_128' && symbology !== 'CODE_39') {
    return { valid: false, reason: 'unsupported-format' };
  }

  // Linear alphanumeric formats are opaque text payloads. Preserve whitespace
  // in Code 128 and Code 39; Code 39's space is a valid encoded character.
  const preservesText = symbology === 'CODE_128' || symbology === 'CODE_39';
  const normalized = preservesText ? value : value.trim();
  if (normalized.length === 0) return { valid: false, reason: 'empty' };
  if (/[\u0000-\u001f\u007f]/.test(normalized)) return { valid: false, reason: 'control-character' };
  if (symbology === 'CODE_128') return { valid: true, reason: 'accepted' };
  if (symbology === 'CODE_39') {
    // Standard Code 39 data alphabet; '*' is reserved for start/stop framing.
    if (!/^[A-Z0-9 .$\\x2F+%\-]+$/.test(normalized)) {
      return { valid: false, reason: 'invalid-character' };
    }
    return { valid: true, reason: 'accepted' };
  }

  const expectedLength = symbology === 'EAN_8' ? 8 : 13;
  if (normalized.length !== expectedLength || !/^\d+$/.test(normalized)) {
    return { valid: false, reason: 'invalid-length' };
  }
  if (!hasValidGs1CheckDigit(normalized)) return { valid: false, reason: 'invalid-check-digit' };
  return { valid: true, reason: 'accepted' };
}
