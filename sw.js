
const CACHE_NAME = 'fitgenius-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Don't cache API calls
  if (url.hostname.includes('googleapis') || url.hostname.includes('generativelanguage')) {
      return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached response if found
        if (response) {
          return response;
        }

        // Fetch from network
        return fetch(event.request).then(
          (response) => {
            // Check for valid response
            if (!response || response.status !== 200) {
              return response;
            }

            // Cache CDN resources (Tailwind, ESM.sh, Fonts)
            const isCdnResource = 
                url.hostname.includes('cdn.tailwindcss.com') || 
                url.hostname.includes('esm.sh') ||
                url.hostname.includes('fonts.googleapis.com') ||
                url.hostname.includes('fonts.gstatic.com') ||
                url.hostname.includes('unpkg.com');

            // Cache same-origin resources
            const isSameOrigin = response.type === 'basic';

            if (isCdnResource || isSameOrigin) {
                const responseToCache = response.clone();
                caches.open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(event.request, responseToCache);
                  });
            }

            return response;
          }
        );
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
