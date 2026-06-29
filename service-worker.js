const CACHE_NAME = 'calculadora-piques-v5';

const ARCHIVOS = [
  './',
  './index.html',
  './manifest.json',
  './icon.png'
];

// Instalación: cachea todos los archivos con Promise.allSettled
// para que falle graciosamente si alguno no existe
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        ARCHIVOS.map(url => cache.add(url).catch(e => console.warn('No se pudo cachear:', url, e)))
      );
    }).then(() => self.skipWaiting())
  );
});

// Activación: elimina cachés viejos y toma control inmediato
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: caché primero siempre — funciona 100% offline
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      // Hay caché: devuelve inmediatamente sin tocar la red
      if (cached) {
        // En paralelo actualiza el caché si hay red (stale-while-revalidate)
        fetch(event.request).then(response => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, response));
          }
        }).catch(() => {});
        return cached;
      }

      // Sin caché: intenta la red
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200) return response;
        const copia = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copia));
        return response;
      }).catch(() => {
        // Sin red y sin caché: devuelve index.html
        return caches.match('./index.html');
      });
    })
  );
});
