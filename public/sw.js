const CACHE_NAME = 'vendoros-cache-v4';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  
  const acceptHeader = event.request.headers.get('accept') || '';
  
  // Network-First strategy for HTML/navigation requests so changes reflect instantly online
  if (event.request.mode === 'navigate' || acceptHeader.includes('text/html')) {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        // Fallback to cache if offline
        return caches.match(event.request).then(cached => {
          return cached || caches.match('/');
        });
      })
    );
    return;
  }

  // Cache-First strategy for static assets (images, fonts, static script files)
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return response;
      }).catch(err => {
        throw err;
      });
    })
  );
});

// Background Sync Event Listener
self.addEventListener('sync', event => {
  console.log('Background sync event triggered:', event.tag);
  if (event.tag === 'sync-orders') {
    // Perform order synchronization in the background
  }
});

// Periodic Background Sync Event Listener
self.addEventListener('periodicsync', event => {
  console.log('Periodic background sync event triggered:', event.tag);
  if (event.tag === 'sync-inventory') {
    // Perform periodic inventory synchronization
  }
});

// Push Notification Event Listener
self.addEventListener('push', event => {
  console.log('Push notification event received:', event);
  let data = { title: 'VendorOS Alert', body: 'New notification from VendorOS.' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'VendorOS Alert', body: event.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification Click Event Listener
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(windowClients => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
