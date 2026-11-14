/**
 * Download a generated Blob using one shared browser-safe anchor lifecycle.
 * The caller owns Blob construction and MIME type selection.
 */
export function downloadFile(blob: Blob, fileName: string, revokeDelayMs = 1000): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), revokeDelayMs);
}
