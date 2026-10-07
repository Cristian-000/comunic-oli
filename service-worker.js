// Aumenta la versión cada vez que hagas cambios en CSS, JS o HTML
const CACHE_NAME = 'comunicador-cache-v12'; 

const urlsToCache = [
    './', 
    './index.html',
    './escribir.html',
    './escuchar.html',
    './matematicas.html',
    './descripcion.html',
    './palabras.html',
    './pronunciacion.html',
    './usuario.html',
    './matematicas.css',
    './descripcion.css',
    './palabras.css',
    './pronunciacion.css',
    './style.css',
    './styleUsuario.css',
    './matematicas.js',
    './descripcion.js',
    './palabras.js',
    './pronunciacion.js',
    './usuario.js',
    './script.js',
    './datos.json', 
    './manifest.json',
    './imagenes/placeholder.png' // Importante cachear el placeholder
];

self.addEventListener('install', event => {
    self.skipWaiting(); // Obliga al SW a activarse inmediatamente
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache);
            })
            .catch(err => console.error('Error cacheando archivos en instalación:', err))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // Borra cualquier caché que no sea la versión actual
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    // Ignorar peticiones a APIs externas (como ARASAAC) para no ensuciar la caché estática
    if (event.request.url.includes('api.arasaac.org') || event.request.url.includes('corsproxy.io')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Devuelve de caché si existe, si no, busca en la red
                return response || fetch(event.request);
            })
    );
});
