let registrationPromise: Promise<ServiceWorkerRegistration> | null = null;

/** One registration owner for the entire PWA; callers must reuse this promise. */
export function registerRetailOsServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    return Promise.reject(new Error('Service Worker không được hỗ trợ trên trình duyệt này.'));
  }
  if (!registrationPromise) {
    registrationPromise = navigator.serviceWorker.register(
      import.meta.env.BASE_URL + 'sw.js',
      { updateViaCache: 'none' },
    ).catch((error: unknown) => {
      registrationPromise = null;
      throw error;
    });
  }
  return registrationPromise;
}
