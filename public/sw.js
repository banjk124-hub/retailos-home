const CACHE_NAME = 'retailos-shell-v7';
const APP_BASE_URL = new URL('./', self.registration.scope).pathname;
const APP_SHELL = [
  APP_BASE_URL,
  `${APP_BASE_URL}index.html`,
  `${APP_BASE_URL}manifest.webmanifest`,
  `${APP_BASE_URL}icon.svg`,
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith('retailos-shell-') && key !== CACHE_NAME).map((key) => caches.delete(key)),
  )));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  const isNavigation = event.request.mode === 'navigate';
  const isStaticAsset = ['script', 'style', 'image', 'font', 'manifest'].includes(event.request.destination);
  if (!isNavigation && !isStaticAsset) return;

  event.respondWith(fetch(event.request).then((response) => {
    if (response && response.ok) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
    }
    return response;
  }).catch(async () => {
    const cachedResponse = await caches.match(event.request);
    if (cachedResponse) return cachedResponse;
    if (isNavigation) {
      const appShell = await caches.match(`${APP_BASE_URL}index.html`);
      if (appShell) return appShell;
    }
    return Response.error();
  }));
});

self.addEventListener('push', (event) => {
  let parsedPayload = {};
  if (event.data) {
    try {
      parsedPayload = event.data.json();
    } catch {
      parsedPayload = { body: event.data.text() };
    }
  }
  const payload = parsedPayload && typeof parsedPayload === 'object' ? parsedPayload : {};

  const title = typeof payload.title === 'string' ? payload.title : 'RetailOS';
  const options = {
    body: typeof payload.body === 'string' ? payload.body : 'Bạn có thông báo mới.',
    icon: `${APP_BASE_URL}icon.svg`,
    badge: `${APP_BASE_URL}icon.svg`,
    data: { url: typeof payload.url === 'string' ? payload.url : APP_BASE_URL },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  let requestedUrl;
  try {
    requestedUrl = new URL(event.notification.data?.url || APP_BASE_URL, self.location.origin);
  } catch {
    requestedUrl = new URL(APP_BASE_URL, self.location.origin);
  }
  const baseUrl = new URL(APP_BASE_URL, self.location.origin);
  const isInsideApp = requestedUrl.origin === baseUrl.origin && requestedUrl.pathname.startsWith(baseUrl.pathname);
  const destination = isInsideApp ? requestedUrl.href : baseUrl.href;

  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    const existingClient = clients.find((client) => new URL(client.url).origin === self.location.origin);
    if (existingClient) {
      if ('navigate' in existingClient) return existingClient.navigate(destination).then(() => existingClient.focus());
      return existingClient.focus();
    }
    return self.clients.openWindow(destination);
  }));
});
