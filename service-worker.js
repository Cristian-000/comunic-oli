// service-worker.js

// Nombre y versión de la caché. Cámbialo si haces actualizaciones importantes.
const CACHE_NAME = 'comunicador-cache-v4';
console.log(CACHE_NAME);

// Lista de archivos esenciales para que la aplicación funcione offline.
// ¡IMPORTANTE! Asegúrate de que estas rutas coincidan con la estructura de tu proyecto.
const urlsToCache = [
    '/', // La página principal
    'index.html',
    'escribir.html',
    'escuchar.html',
     "usuario.html",
    'style.css',
    'script.js',
    'datos.json', // ¡Muy importante para que las categorías carguen!
    'manifest.json'
   
];

// Evento 'install': Se dispara cuando el Service Worker se instala por primera vez.
// Aquí es donde guardamos nuestros archivos en la caché.
self.addEventListener('install', event => {
    console.log('Service Worker: Instalando...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Abriendo caché y guardando archivos principales.');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                // Forzar al nuevo Service Worker a activarse inmediatamente.
                return self.skipWaiting();
            })
            .catch(err => {
                console.error('Service Worker: Falló el cacheo de archivos en la instalación.', err);
            })
    );
});

// Evento 'activate': Se dispara cuando el Service Worker se activa.
// Aquí limpiamos las cachés antiguas que ya no se usan.
self.addEventListener('activate', event => {
    console.log('Service Worker: Activando...');
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // Si la caché no está en nuestra "lista blanca", la borramos.
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log(`Service Worker: Borrando caché antigua: ${cacheName}`);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
        // Tomar control de la página inmediatamente.
        .then(() => self.clients.claim())
    );
});

// Evento 'fetch': Se dispara cada vez que la aplicación hace una petición de red (imágenes, scripts, etc.).
// Aquí decidimos si servimos el archivo desde la caché o desde la red.
self.addEventListener('fetch', event => {
    // Usamos una estrategia "Cache First" (Primero la Caché).
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Si encontramos una respuesta en la caché, la devolvemos.
                if (response) {
                    // console.log(`Service Worker: Sirviendo desde caché: ${event.request.url}`);
                    return response;
                }

                // Si no, vamos a la red a buscarlo.
                // console.log(`Service Worker: Sirviendo desde red: ${event.request.url}`);
                return fetch(event.request);
            })
            .catch(err => {
                // Si tanto la caché como la red fallan (offline y no está en caché),
                // podrías devolver una página de fallback si quisieras.
                console.error(`Service Worker: Error en fetch para ${event.request.url}`, err);
            })
    );
});