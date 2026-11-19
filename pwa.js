// ============================================================
// PWA.JS - App installabile: service worker, pulsante "Installa",
// suggerimento per iPhone, misura in Analytics.
// Caricato dopo i18n.js e prima di script.js.
// ============================================================

// L'app e' aperta come app installata (non nel browser)?
function isStandalonePwa() {
    try {
        return window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone === true;
    } catch (e) {
        return false;
    }
}

function isIOSDevice() {
    const ua = navigator.userAgent || '';
    return /iphone|ipad|ipod/i.test(ua) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPad recenti
}

function pwaStorageGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
}
function pwaStorageSet(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* ignore */ }
}

// --- Service worker ---------------------------------------------------------
(function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    const secure = location.protocol === 'https:' ||
        location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (!secure) return;
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(err => {
            console.warn('Service worker non registrato:', err);
        });
    });
})();

// --- Pulsante "Installa l'app" (Android, Chrome/Edge desktop) ---------------
let _deferredInstallPrompt = null;

function getInstallButton() {
    let btn = document.getElementById('btn-install');
    if (btn) return btn;
    const headerTop = document.querySelector('.header-top');
    if (!headerTop) return null;
    btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'btn-install';
    btn.className = 'install-btn';
    btn.hidden = true;
    btn.setAttribute('data-i18n', 'pwa.install');
    btn.textContent = (typeof t === 'function') ? t('pwa.install') : 'Installa app';
    btn.addEventListener('click', onInstallClick);
    const auth = document.getElementById('auth-container');
    headerTop.insertBefore(btn, auth || null);
    return btn;
}

async function onInstallClick() {
    const prompt = _deferredInstallPrompt;
    if (!prompt) return;
    _deferredInstallPrompt = null;
    const btn = getInstallButton();
    if (btn) btn.hidden = true;
    try {
        prompt.prompt();
        const choice = await prompt.userChoice;
        if (typeof trackEvent === 'function') {
            trackEvent('pwa_install_prompt', { outcome: choice && choice.outcome || 'unknown' });
        }
    } catch (e) { /* silent */ }
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // niente mini-barra del browser: usiamo il nostro pulsante
    _deferredInstallPrompt = e;
    const btn = getInstallButton();
    if (btn) btn.hidden = false;
});

window.addEventListener('appinstalled', () => {
    _deferredInstallPrompt = null;
    const btn = document.getElementById('btn-install');
    if (btn) btn.hidden = true;
    if (typeof trackEvent === 'function') trackEvent('pwa_installed', {});
});

// --- Suggerimento per iPhone/iPad --------------------------------------------
// Apple non permette il pulsante: mostriamo una volta sola come fare, solo a
// chi torna (almeno alla seconda visita) e non mentre c'e' il banner consenso.
function maybeShowIOSHint() {
    if (!isIOSDevice() || isStandalonePwa()) return;
    if (pwaStorageGet('alberi_ios_hint_seen')) return;
    const visits = parseInt(pwaStorageGet('alberi_visits') || '0', 10);
    if (visits < 2) return;
    const consent = document.getElementById('consent-banner');
    if (consent && consent.style.display !== 'none') return;

    const box = document.createElement('div');
    box.id = 'ios-install-hint';
    box.className = 'ios-install-hint';
    box.setAttribute('role', 'dialog');
    const text = document.createElement('span');
    text.setAttribute('data-i18n', 'pwa.iosHint');
    text.textContent = (typeof t === 'function') ? t('pwa.iosHint') : '';
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'ios-install-hint-close';
    close.setAttribute('data-i18n-aria-label', 'pwa.close');
    close.setAttribute('aria-label', (typeof t === 'function') ? t('pwa.close') : 'Chiudi');
    close.textContent = '×';
    close.addEventListener('click', () => box.remove());
    box.appendChild(text);
    box.appendChild(close);
    document.body.appendChild(box);
    pwaStorageSet('alberi_ios_hint_seen', '1');
    if (typeof trackEvent === 'function') trackEvent('pwa_ios_hint_shown', {});
}

window.addEventListener('load', () => {
    const visits = parseInt(pwaStorageGet('alberi_visits') || '0', 10) + 1;
    pwaStorageSet('alberi_visits', String(visits));
    if (isStandalonePwa()) {
        document.documentElement.classList.add('pwa-standalone');
    }
    setTimeout(maybeShowIOSHint, 4000);
});
