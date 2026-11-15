export type PwaUpdateBlocker = () => string | null;

const blockers = new Map<string, PwaUpdateBlocker>();

function signalSafetyChange() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('retailos:update-safety-changed'));
}

/** Register a module-owned critical operation that must finish before app reload. */
export function registerPwaUpdateBlocker(key: string, blocker: PwaUpdateBlocker): () => void {
  blockers.set(key, blocker);
  signalSafetyChange();
  return () => {
    if (blockers.get(key) === blocker) blockers.delete(key);
    signalSafetyChange();
  };
}

/** Call after a module's non-DOM dirty/active state changes. */
export function notifyPwaUpdateSafetyChanged() {
  signalSafetyChange();
}

export function getPwaUpdateBlockReason(): string | null {
  for (const blocker of blockers.values()) {
    const reason = blocker();
    if (reason) return reason;
  }

  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLElement && activeElement.isContentEditable) {
    return 'Đang chỉnh sửa nội dung. Hãy hoàn tất hoặc lưu thay đổi trước khi cập nhật.';
  }

  const controls = Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    'input, textarea, select',
  ));
  for (const control of controls) {
    if (control instanceof HTMLInputElement) {
      if (control.type === 'file' && control.files && control.files.length > 0) {
        return 'Đang có tệp được chọn. Hãy hoàn tất thao tác nhập tệp trước khi cập nhật.';
      }
      if (control.type === 'checkbox' || control.type === 'radio') {
        if (control.checked !== control.defaultChecked) {
          return 'Biểu mẫu đang có thay đổi chưa được xác nhận.';
        }
        continue;
      }
      if (['button', 'submit', 'reset', 'hidden'].includes(control.type)) continue;
    }
    if (control instanceof HTMLSelectElement) {
      if (Array.from(control.options).some((option) => option.selected !== option.defaultSelected)) {
        return 'Biểu mẫu đang có thay đổi chưa được xác nhận.';
      }
      continue;
    }
    if (control.value !== control.defaultValue) {
      return 'Biểu mẫu đang có thay đổi chưa được xác nhận.';
    }
  }

  const activeCamera = Array.from(document.querySelectorAll('video')).some((video) => {
    const stream = video.srcObject;
    return stream instanceof MediaStream && stream.getVideoTracks().some((track) => track.readyState === 'live');
  });
  if (activeCamera) return 'Camera đang hoạt động. Hãy đóng phiên quét trước khi cập nhật.';

  return null;
}
