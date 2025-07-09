const CACHE_NAME = 'comunicador-cache-v2'; // Nueva versión para forzar la actualización

// Lista de archivos base que componen la aplicación (el "esqueleto").
// Se han eliminado los archivos que no existen.
const APP_SHELL_URLS = [
    '/',
    '/index.html',
    '/escribir.html',
    '/escuchar.html',
    '/script.js',
    '/style.css',
    '/datos.json',
    '/manifest.json',
    '/imagenes/ico192.png',
    '/imagenes/ico512.png',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css'
];

// Evento de Instalación: Se cachea el esqueleto de la aplicación.
self.addEventListener('install', event => {
    console.log('SW: Instalando y cacheando App Shell...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(APP_SHELL_URLS))
            .then(() => self.skipWaiting())
    );
});

// Evento de Activación: Se limpia el caché antiguo.
self.addEventListener('activate', event => {
    console.log('SW: Activando y limpiando cachés antiguas...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('SW: Eliminando caché antigua:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Evento Fetch: Define cómo se manejan las solicitudes de red.
// Estrategia: "Network First" (Intenta ir a la red primero, si falla, usa el caché).
self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request)
            .then(networkResponse => {
                // Si la respuesta de la red es exitosa, la usamos y la guardamos en el caché
                return caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });
            })
            .catch(() => {
                // Si la petición de red falla (sin conexión), se busca en el caché.
                console.log(`SW: Sirviendo ${event.request.url} desde el caché.`);
                return caches.match(event.request);
            })
    );
});