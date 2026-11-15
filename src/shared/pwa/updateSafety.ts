export type PwaUpdateBlocker = () => string | null;

const blockers = new Map<string, PwaUpdateBlocker>();
const fieldBaselines = new WeakMap<Element, string>();
const dirtyFormFields = new Map<Element, HTMLFormElement>();

type EditableControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function signalSafetyChange() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('retailos:update-safety-changed'));
}

function isEditableControl(target: EventTarget | null): target is EditableControl {
  if (!(target instanceof HTMLElement)) return false;
  return target instanceof HTMLInputElement
    || target instanceof HTMLTextAreaElement
    || target instanceof HTMLSelectElement;
}

function isUpdateSafeField(control: EditableControl): boolean {
  return control.hasAttribute('data-retailos-update-safe')
    || Boolean(control.form?.hasAttribute('data-retailos-update-safe'));
}

function initialFieldValue(control: EditableControl): string {
  if (control instanceof HTMLInputElement) {
    if (control.type === 'checkbox' || control.type === 'radio') return 'checked:' + String(control.defaultChecked);
    if (control.type === 'file') return 'files:0';
    return control.defaultValue;
  }
  if (control instanceof HTMLTextAreaElement) return control.defaultValue;
  return Array.from(control.options)
    .filter((option) => option.defaultSelected)
    .map((option) => option.value)
    .join('\u0000');
}

function currentFieldValue(control: EditableControl): string {
  if (control instanceof HTMLInputElement) {
    if (control.type === 'checkbox' || control.type === 'radio') return 'checked:' + String(control.checked);
    if (control.type === 'file') return 'files:' + String(control.files?.length ?? 0);
    return control.value;
  }
  if (control instanceof HTMLTextAreaElement) return control.value;
  return Array.from(control.selectedOptions).map((option) => option.value).join('\u0000');
}

function updateDirtyField(control: EditableControl) {
  const form = control.form;
  if (!form || isUpdateSafeField(control)) {
    dirtyFormFields.delete(control);
    return;
  }
  const baseline = fieldBaselines.get(control) ?? initialFieldValue(control);
  fieldBaselines.set(control, baseline);
  if (currentFieldValue(control) !== baseline) dirtyFormFields.set(control, form);
  else dirtyFormFields.delete(control);
  signalSafetyChange();
}

function clearFormFields(form: HTMLFormElement) {
  for (const [control, owner] of dirtyFormFields) {
    if (owner === form) {
      dirtyFormFields.delete(control);
      fieldBaselines.delete(control);
    }
  }
  signalSafetyChange();
}

if (typeof document !== 'undefined') {
  document.addEventListener('focusin', (event) => {
    if (!isEditableControl(event.target) || !event.target.form || isUpdateSafeField(event.target)) return;
    if (!fieldBaselines.has(event.target)) fieldBaselines.set(event.target, initialFieldValue(event.target));
  }, true);
  for (const eventName of ['input', 'change', 'focusout']) {
    document.addEventListener(eventName, (event) => {
      if (isEditableControl(event.target)) updateDirtyField(event.target);
    }, true);
  }
  document.addEventListener('reset', (event) => {
    if (event.target instanceof HTMLFormElement) queueMicrotask(() => clearFormFields(event.target as HTMLFormElement));
  }, true);
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

/** Call after a form's asynchronous save has completed successfully. */
export function markPwaUpdateFormSaved(form: HTMLFormElement) {
  clearFormFields(form);
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

  for (const [control, form] of dirtyFormFields) {
    if (!control.isConnected || !form.isConnected) {
      dirtyFormFields.delete(control);
      continue;
    }
    if (isEditableControl(control) && currentFieldValue(control) === fieldBaselines.get(control)) {
      dirtyFormFields.delete(control);
      continue;
    }
    return 'Biểu mẫu đang có thay đổi chưa được gửi hoặc lưu. Hãy hoàn tất thao tác trước khi cập nhật.';
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
