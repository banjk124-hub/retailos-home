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
    try {
      const reason = blocker();
      if (reason) return reason;
    } catch {
      return 'Một nghiệp vụ chưa xác nhận trạng thái an toàn. Hãy hoàn tất thao tác trước khi cập nhật.';
    }
  }

  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLElement && activeElement.isContentEditable) {
    return 'Đang chỉnh sửa nội dung. Hãy hoàn tất hoặc lưu thay đổi trước khi cập nhật.';
  }
  if (
    activeElement instanceof HTMLInputElement
    && !['button', 'submit', 'reset', 'hidden', 'checkbox', 'radio'].includes(activeElement.type)
  ) {
    return 'Đang nhập dữ liệu. Hãy hoàn tất hoặc lưu thao tác trước khi cập nhật.';
  }
  if (activeElement instanceof HTMLTextAreaElement || activeElement instanceof HTMLSelectElement) {
    return 'Đang thao tác trên biểu mẫu. Hãy hoàn tất hoặc lưu thay đổi trước khi cập nhật.';
  }
  const selectedFile = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="file"]'))
    .some((input) => Boolean(input.files?.length));
  if (selectedFile) return 'Đang có tệp được chọn. Hãy hoàn tất thao tác nhập tệp trước khi cập nhật.';

  const activeCamera = Array.from(document.querySelectorAll('video')).some((video) => {
    const stream = video.srcObject;
    return typeof MediaStream !== 'undefined'
      && stream instanceof MediaStream
      && stream.getVideoTracks().some((track) => track.readyState === 'live');
  });
  if (activeCamera) return 'Camera đang hoạt động. Hãy đóng phiên quét trước khi cập nhật.';

  return null;
}
