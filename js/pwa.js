// pwa.js — Registro del Service Worker compartido para todas las páginas
// ✅ CORREGIDO: registro con ruta relativa para funcionar en GitHub Pages subdirectorios

(function () {
    if (!('serviceWorker' in navigator)) return;

    let swRegistration = null;
    let swActualizacion = null;

    // ── Registro del Service Worker ─────────────────────────
    window.addEventListener('load', async () => {
        try {
            // ✅ CLAVE: usar './sw.js' (ruta relativa) en lugar de '/sw.js' (absoluta)
            // Esto funciona tanto en localhost como en GitHub Pages /Seguridad-Comunitaria/
            swRegistration = await navigator.serviceWorker.register('./sw.js');
            console.log('[PWA] Service Worker registrado correctamente');

            // Detectar nueva versión disponible
            swRegistration.addEventListener('updatefound', () => {
                const nuevoSW = swRegistration.installing;
                nuevoSW.addEventListener('statechange', () => {
                    if (nuevoSW.state === 'installed' && navigator.serviceWorker.controller) {
                        swActualizacion = nuevoSW;
                        localStorage.setItem('sw_update_pending', '1');
                        mostrarBannerActualizacion();
                    }
                });
            });

            // Actualización pendiente de sesión anterior
            if (localStorage.getItem('sw_update_pending') === '1') {
                mostrarBannerActualizacion();
            }

        } catch (err) {
            console.warn('[PWA] Error registrando SW:', err);
        }
    });

    // Recargar cuando el nuevo SW tome control
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
    });

    // ── Banner de actualización ─────────────────────────────
    function mostrarBannerActualizacion() {
        let banner = document.getElementById('update-banner');

        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'update-banner';
            banner.style.cssText = [
                'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:10000',
                'background:#1e293b', 'border-bottom:2px solid #38bdf8',
                'padding:12px 20px', 'display:flex', 'align-items:center',
                'justify-content:space-between', 'flex-wrap:wrap', 'gap:10px',
                'box-shadow:0 4px 20px rgba(0,0,0,0.5)', 'font-family:Poppins,sans-serif'
            ].join(';');

            banner.innerHTML = `
                <span style="font-size:0.9rem; color:#f1f5f9;">
                    🔄 <strong>Nueva versión disponible.</strong> ¿Actualizar ahora?
                </span>
                <div style="display:flex; gap:8px;">
                    <button id="btn-actualizar-pwa"
                            style="background:#38bdf8; color:#0f172a; border:none;
                                   padding:7px 16px; border-radius:16px; font-size:0.85rem;
                                   font-weight:700; cursor:pointer;">
                        Actualizar
                    </button>
                    <button id="btn-posponer-pwa"
                            style="background:transparent; color:#94a3b8;
                                   border:1px solid rgba(255,255,255,0.2);
                                   padding:7px 14px; border-radius:16px; font-size:0.85rem;
                                   cursor:pointer;">
                        Ahora no
                    </button>
                </div>`;

            document.body.prepend(banner);

            document.getElementById('btn-actualizar-pwa').addEventListener('click', aplicarActualizacion);
            document.getElementById('btn-posponer-pwa').addEventListener('click', posponerActualizacion);
        }

        banner.style.display = 'flex';
    }

    function aplicarActualizacion() {
        localStorage.removeItem('sw_update_pending');
        if (swActualizacion) {
            swActualizacion.postMessage('SKIP_WAITING');
        } else if (swRegistration && swRegistration.waiting) {
            swRegistration.waiting.postMessage('SKIP_WAITING');
        } else {
            window.location.reload();
        }
    }

    function posponerActualizacion() {
        const banner = document.getElementById('update-banner');
        if (banner) banner.style.display = 'none';
    }

    // Exponer funciones por si index.html las llama directamente
    window.aplicarActualizacion = aplicarActualizacion;
    window.posponerActualizacion = posponerActualizacion;

    // ── Botón de instalación (si existe en la página) ───────
    window.addEventListener('beforeinstallprompt', e => {
        e.preventDefault();
        const btn = document.getElementById('btn-instalar');
        if (!btn) return;
        if (window.matchMedia('(display-mode: standalone)').matches) return;
        window.__pwaInstallPrompt = e;
        btn.style.display = 'inline-block';
    });

    window.addEventListener('appinstalled', () => {
        const btn = document.getElementById('btn-instalar');
        if (btn) btn.style.display = 'none';
        window.__pwaInstallPrompt = null;
    });

})();