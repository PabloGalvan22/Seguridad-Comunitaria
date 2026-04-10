// sw.js — Service Worker de Seguridad Comunitaria
// Estrategia: Cache First para assets, Network First para páginas HTML
// ✅ CORREGIDO: rutas ajustadas para GitHub Pages (/Seguridad-Comunitaria/)

// ── Detectar el base path automáticamente desde la URL del SW ──
const BASE = self.location.pathname.replace('/sw.js', '');
// En GitHub Pages quedará: '/Seguridad-Comunitaria'
// En localhost quedará:    ''

const CACHE_STATIC = 'segcom-static-v2'; // ← versión incrementada para limpiar caché viejo

// Archivos que se cachean en la instalación (shell de la app)
const PRECACHE_URLS = [
    BASE + '/',
    BASE + '/index.html',
    BASE + '/phishing.html',
    BASE + '/ciberseguridad.html',
    BASE + '/videojuegos.html',
    BASE + '/redes.html',
    BASE + '/grooming.html',
    BASE + '/post-detalle.html',
    BASE + '/privacidad.html',
    BASE + '/style.css',
    BASE + '/firebase.js',
    BASE + '/pwa.js',
    BASE + '/icons/icon-192.png',
    BASE + '/icons/icon-512.png',
    BASE + '/icons/icon-192-maskable.png',
    BASE + '/icons/icon-512-maskable.png',
    BASE + '/manifest.json'
];

// ── INSTALACIÓN ─────────────────────────────────────────────
self.addEventListener('install', event => {
    // NO hacer self.skipWaiting() aquí — el usuario decide cuándo actualizar
    event.waitUntil(
        caches.open(CACHE_STATIC)
            .then(cache => {
                // addAll falla si un solo recurso no existe; usamos add individual
                // para que errores en un archivo no rompan toda la instalación
                return Promise.allSettled(
                    PRECACHE_URLS.map(url => cache.add(url).catch(err => {
                        console.warn('[SW] No se pudo cachear:', url, err.message);
                    }))
                );
            })
            .then(() => console.log('[SW] Instalado y caché listo. BASE:', BASE))
    );
});

// ── ACTIVACIÓN ──────────────────────────────────────────────
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key !== CACHE_STATIC)
                    .map(key => {
                        console.log('[SW] Eliminando caché viejo:', key);
                        return caches.delete(key);
                    })
            )
        ).then(() => {
            console.log('[SW] Activado');
            return self.clients.claim();
        })
    );
});

// ── FETCH ───────────────────────────────────────────────────
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignorar peticiones externas: Firebase, Google APIs, CDNs
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
        // HTML → Network First (siempre fresco si hay conexión)
        event.respondWith(
            fetch(request)
                .then(response => {
                    const clone = response.clone();
                    caches.open(CACHE_STATIC).then(cache => cache.put(request, clone));
                    return response;
                })
                .catch(() =>
                    caches.match(request).then(cached =>
                        cached || caches.match(BASE + '/index.html')
                    )
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
        console.log('[SW] Aplicando actualización por solicitud del usuario');
        self.skipWaiting();
    }
});