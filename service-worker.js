const CACHE_NAME = 'mi-pwa-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/ajustes.html',
  '/ajustes.js',
  '/escribir.html',
  '/escuchar.html',
  '/script.js',
  '/style.css',
  '/styleUsuario.css',
  '/usuario.html',
  '/usuario.js',
  '/datos.json',
  '/imagenes/ico192.png',
  '/imagenes/ico512.png'

  // Agrega aquí más recursos estáticos que quieras cachear
];

// Instalación del Service Worker
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Caché abierta');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activación del Service Worker
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Eliminando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Intercepta las solicitudes de red
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Devuelve la respuesta del caché o realiza una solicitud de red
        return response || fetch(event.request);
      })
  );
});
