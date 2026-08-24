/* =============================================
   AfroBaza — Service Worker (PWA Cache Offline)
   ============================================= */

const CACHE_NAME = 'afrobaza-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/mes-devis.html',
  '/connexion.html',
  '/inscription.html',
  '/fiche-produit.html',
  '/style.css',
  '/app.js',
  '/supabase-client.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Kaushan+Script&display=swap'
];

// Installation : mise en cache des ressources statiques
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Mise en cache des ressources AfroBaza...');
      return cache.addAll(ASSETS_TO_CACHE.filter(url => !url.startsWith('http')));
    })
  );
  self.skipWaiting();
});

// Activation : nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log('[SW] Suppression ancien cache :', key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim();
});

// Interception des requêtes : Cache First pour les assets, Network First pour les pages
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes Supabase (toujours en réseau)
  if (url.hostname.includes('supabase.co') || url.hostname.includes('supabase.io')) {
    return;
  }

  // Stratégie : Cache First pour CSS/JS/images/fonts
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Stratégie : Network First pour les pages HTML
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }
});
