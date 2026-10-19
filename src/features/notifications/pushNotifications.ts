type PushSetupResult = 'ready' | 'not-configured';

function decodeApplicationServerKey(encodedKey: string): Uint8Array<ArrayBuffer> {
  const normalizedKey = encodedKey.replace(/-/g, '+').replace(/_/g, '/');
  const paddedKey = normalizedKey.padEnd(Math.ceil(normalizedKey.length / 4) * 4, '=');
  const decoded = atob(paddedKey);
  const key = new Uint8Array(decoded.length);
  for (let index = 0; index < decoded.length; index += 1) key[index] = decoded.charCodeAt(index);
  return key;
}

export function isPushConfigured(): boolean {
  return Boolean(import.meta.env.VITE_PUSH_SUBSCRIPTION_URL && import.meta.env.VITE_VAPID_PUBLIC_KEY);
}

export async function subscribeForPushNotifications(): Promise<PushSetupResult> {
  const endpoint = import.meta.env.VITE_PUSH_SUBSCRIPTION_URL;
  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!endpoint || !vapidPublicKey) return 'not-configured';
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push notifications are not supported by this browser.');
  }

  const serviceWorkerPath = `${import.meta.env.BASE_URL}sw.js`;
  const registration = await navigator.serviceWorker.register(serviceWorkerPath);
  const readyRegistration = await navigator.serviceWorker.ready;
  const activeRegistration = readyRegistration.scope === registration.scope ? readyRegistration : registration;
  const subscription = await activeRegistration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: decodeApplicationServerKey(vapidPublicKey),
  });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  });
  if (!response.ok) throw new Error(`Push subscription endpoint returned HTTP ${response.status}.`);
  return 'ready';
}
