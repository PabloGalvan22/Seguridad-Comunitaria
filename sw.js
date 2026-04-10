// sw.js — Service Worker de Seguridad Comunitaria
// Estrategia: Cache First para assets, Network First para páginas HTML

const CACHE_NAME = 'segcom-v1';
const CACHE_STATIC = 'segcom-static-v1';

// Archivos que se cachean en la instalación (shell de la app)
const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/phishing.html',
    '/ciberseguridad.html',
    '/videojuegos.html',
    '/redes.html',
    '/grooming.html',
    '/post-detalle.html',
    '/privacidad.html',
    '/style.css',
    '/firebase.js',
    '/pwa.js',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/icons/icon-192-maskable.png',
    '/icons/icon-512-maskable.png',
    '/manifest.json'
];

// ── INSTALACIÓN ─────────────────────────────────────────────
self.addEventListener('install', event => {
    // NO hacer self.skipWaiting() — el usuario decide cuándo actualizar
    event.waitUntil(
        caches.open(CACHE_STATIC)
            .then(cache => cache.addAll(PRECACHE_URLS))
            .then(() => console.log('[SW] Instalado y caché listo'))
    );
});

// ── ACTIVACIÓN ──────────────────────────────────────────────
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key !== CACHE_STATIC && key !== CACHE_NAME)
                    .map(key => {
                        console.log('[SW] Eliminando caché viejo:', key);
                        return caches.delete(key);
                    })
            )
        ).then(() => {
            console.log('[SW] Activado');
            // Tomar control de todas las pestañas abiertas
            return self.clients.claim();
        })
    );
});

// ── FETCH ───────────────────────────────────────────────────
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignorar peticiones de Firebase, Google APIs y CDNs externos
    if (
        url.hostname.includes('firebase') ||
        url.hostname.includes('googleapis') ||
        url.hostname.includes('gstatic') ||
        url.hostname.includes('fonts.') ||
        url.hostname.includes('cdnjs') ||
        url.hostname.includes('jsdelivr') ||
        url.hostname.includes('unsplash') ||
        url.hostname.includes('vecteezy') ||
        url.protocol === 'chrome-extension:'
    ) {
        return; // Dejar pasar sin interceptar
    }

    // Estrategia: Network First para HTML, Cache First para assets
    if (request.destination === 'document' || request.mode === 'navigate') {
        // HTML → Network First (contenido siempre fresco si hay conexión)
        event.respondWith(
            fetch(request)
                .then(response => {
                    const clone = response.clone();
                    caches.open(CACHE_STATIC).then(cache => cache.put(request, clone));
                    return response;
                })
                .catch(() => caches.match(request)
                    .then(cached => cached || caches.match('/index.html'))
                )
        );
    } else {
        // CSS, JS, imágenes → Cache First
        event.respondWith(
            caches.match(request).then(cached => {
                if (cached) return cached;
                return fetch(request).then(response => {
                    if (response && response.status === 200 && response.type === 'basic') {
                        const clone = response.clone();
                        caches.open(CACHE_STATIC).then(cache => cache.put(request, clone));
                    }
                    return response;
                }).catch(() => null);
            })
        );
    }
});

// ── MENSAJE DESDE LA PÁGINA ─────────────────────────────────
self.addEventListener('message', event => {
    if (event.data === 'SKIP_WAITING') {
        // El usuario aceptó la actualización
        console.log('[SW] Aplicando actualización por solicitud del usuario');
        self.skipWaiting();
    }
});