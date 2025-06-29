const CACHE_NAME = 'mi-pwa-cache-v2'; // Incrementamos la versión para forzar la actualización

// Archivos base del "esqueleto" de la aplicación
const APP_SHELL_URLS = [
  '/',
  '/index.html',
  '/ajustes.html',
  '/ajustes.js',
  '/escribir.html',
  '/escuchar.html',
  '/script.js',
  '/style.css',
  '/datos.json',
  '/imagenes/ico192.png',
  '/imagenes/ico512.png'
  // Nota: hemos quitado los archivos de usuario que no estaban en uso
];

// Instalación del Service Worker
self.addEventListener('install', event => {
  console.log('Instalando Service Worker y cacheando recursos...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Primero, cacheamos el esqueleto de la aplicación
        console.log('Cacheando el App Shell');
        return cache.addAll(APP_SHELL_URLS)
          .then(() => {
            // Una vez cacheado el esqueleto, vamos por las imágenes de los pictogramas
            console.log('Cacheando imágenes de pictogramas...');
            return fetch('datos.json')
              .then(response => response.json())
              .then(data => {
                const imageUrls = new Set(); // Usamos un Set para evitar duplicados
                
                // Recorremos todas las categorías y todas las imágenes para obtener sus URLs
                if (data.categorias) { // Asumiendo la estructura original
                    data.categorias.forEach(categoria => {
                        // Cachear la imagen principal de la categoría
                        if (categoria.src) {
                            imageUrls.add(categoria.src);
                        }
                        // Cachear las imágenes internas de la categoría
                        if (categoria.imagenes) {
                            categoria.imagenes.forEach(imagen => {
                                if (imagen.src) {
                                    imageUrls.add(`imagenes/${imagen.src}`);
                                }
                            });
                        }
                    });
                }
                
                console.log('URLs de imágenes a cachear:', Array.from(imageUrls));
                return cache.addAll(Array.from(imageUrls));
              });
          });
      })
      .then(() => self.skipWaiting()) // Forzar la activación del nuevo Service Worker
  );
});

// Activación del Service Worker
self.addEventListener('activate', event => {
  console.log('Activando Service Worker y limpiando cachés antiguas...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Eliminando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Tomar control de las páginas abiertas
  );
});

// Intercepta las solicitudes de red (estrategia "Cache First")
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si la respuesta está en el caché, la devolvemos.
        // Si no, la buscamos en la red (esto solo pasaría si algo no se cacheó bien).
        return response || fetch(event.request);
      })
  );
});