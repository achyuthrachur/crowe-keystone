const CACHE_NAME = 'keystone-v1';
const SHELL_ASSETS = ['/', '/projects', '/inbox', '/daily', '/graph', '/memory'];

// INSTALL: cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ACTIVATE: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// FETCH: network-first for API, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API calls: network only, never cache
  if (url.pathname.startsWith('/api/') || url.hostname !== self.location.hostname) {
    return;
  }

  // Navigation requests: let the browser handle redirects (auth, NextAuth, etc.)
  // SW redirect mode is 'manual' for navigate requests, so intercepting causes
  // "redirected response used for request whose redirect mode is not follow" errors.
  if (request.mode === 'navigate') {
    return;
  }

  // Static assets: cache-first with network fallback + cache update
  event.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(request).then(cached => {
        const networkFetch = fetch(request).then(response => {
          // Only cache successful, non-redirected responses
          if (response.ok && !response.redirected) {
            cache.put(request, response.clone());
          }
          return response;
        });
        return cached || networkFetch;
      })
    )
  );
});

// PUSH: receive notification from server
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  const options = {
    body: data.body || '',
    icon: data.icon || '/keystone-192.png',
    badge: data.badge || '/keystone-96.png',
    tag: data.tag || 'keystone',
    data: { url: data.url || '/' },
    requireInteraction: !!(data.tag?.startsWith('approval-')),
    actions: data.tag?.startsWith('approval-') ? [
      { action: 'approve', title: '✓ Approve' },
      { action: 'view', title: 'View →' },
    ] : undefined,
  };
  event.waitUntil(self.registration.showNotification(data.title || 'Keystone', options));
});

// NOTIFICATION CLICK: navigate to URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notifData = event.notification.data || {};
  const action = event.action;
  let url = notifData.url || '/';
  if (action === 'approve') {
    const approvalId = event.notification.tag.replace('approval-', '');
    url = '/inbox?approve=' + approvalId;
  }
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.postMessage({ type: 'navigate', url });
            return;
          }
        }
        return clients.openWindow(self.location.origin + url);
      })
  );
});
