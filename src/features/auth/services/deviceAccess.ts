export type DeviceAccessId = 'camera' | 'notifications';
export type DeviceAccessStatus = 'checking' | 'prompt' | 'granted' | 'denied' | 'unsupported' | 'needs-install' | 'error';

export type DeviceAccessDefinition = {
  id: DeviceAccessId;
  label: string;
  description: string;
  iosNote?: string;
};

export const DEVICE_ACCESS: DeviceAccessDefinition[] = [
  {
    id: 'camera',
    label: 'Camera',
    description: 'Dùng để quét barcode trong ứng dụng.',
  },
  {
    id: 'notifications',
    label: 'Thông báo',
    description: 'Cấp quyền trình duyệt; gửi thông báo đẩy cần tích hợp thêm dịch vụ thông báo.',
    iosNote: 'Trên iPhone/iPad, cần thêm ứng dụng vào Màn hình chính (iOS/iPadOS 16.4 trở lên).',
  },
];

const DEVICE_ACCESS_STORAGE_KEY = 'retailos.deviceAccess.v1';
type StoredDeviceAccess = Partial<Record<DeviceAccessId, { status: DeviceAccessStatus; checkedAt: string }>>;

function isDeviceAccessStatus(value: unknown): value is DeviceAccessStatus {
  return value === 'checking' || value === 'prompt' || value === 'granted' || value === 'denied' ||
    value === 'unsupported' || value === 'needs-install' || value === 'error';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readStoredAccess(): StoredDeviceAccess {
  try {
    const raw = localStorage.getItem(DEVICE_ACCESS_STORAGE_KEY);
    if (!raw) return {};
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value)) return {};
    const stored: StoredDeviceAccess = {};
    for (const id of ['camera', 'notifications'] as const) {
      const entry = value[id];
      if (!isRecord(entry) || !isDeviceAccessStatus(entry.status) || typeof entry.checkedAt !== 'string') continue;
      stored[id] = { status: entry.status, checkedAt: entry.checkedAt };
    }
    return stored;
  } catch {
    return {};
  }
}

function storeAccess(id: DeviceAccessId, status: DeviceAccessStatus): void {
  try {
    const stored = readStoredAccess();
    stored[id] = { status, checkedAt: new Date().toISOString() };
    localStorage.setItem(DEVICE_ACCESS_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Browser permissions remain authoritative when local storage is unavailable.
  }
}

function isIosDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isInstalledWebApp(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
}

function notificationStatus(): DeviceAccessStatus {
  if (isIosDevice() && !isInstalledWebApp()) return 'needs-install';
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return 'prompt';
}

async function cameraStatus(): Promise<DeviceAccessStatus> {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) return 'unsupported';
  if (!navigator.permissions?.query) return readStoredAccess().camera?.status ?? 'prompt';

  try {
    const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
    if (result.state === 'granted') return 'granted';
    if (result.state === 'denied') return 'denied';
    return 'prompt';
  } catch {
    return readStoredAccess().camera?.status ?? 'prompt';
  }
}

export async function readDeviceAccessStatuses(): Promise<Record<DeviceAccessId, DeviceAccessStatus>> {
  const [camera, notifications] = await Promise.all([cameraStatus(), Promise.resolve(notificationStatus())]);
  storeAccess('camera', camera);
  storeAccess('notifications', notifications);
  return { camera, notifications };
}

export async function requestDeviceAccess(id: DeviceAccessId): Promise<DeviceAccessStatus> {
  let status: DeviceAccessStatus;
  if (id === 'notifications') {
    status = notificationStatus();
    if (status === 'prompt') {
      try {
        const permission = await Notification.requestPermission();
        status = permission === 'granted' ? 'granted' : permission === 'denied' ? 'denied' : 'prompt';
      } catch {
        status = 'error';
      }
    }
  } else if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    status = 'unsupported';
  } else {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' } },
      });
      stream.getTracks().forEach((track) => track.stop());
      status = 'granted';
    } catch (error) {
      status = error instanceof DOMException && ['NotAllowedError', 'PermissionDeniedError'].includes(error.name)
        ? 'denied'
        : 'error';
    }
  }

  storeAccess(id, status);
  return status;
}
