// Service worker di Alberi Daily: app installabile e gioco anche offline.
//
// Strategia (pensata per non lasciare MAI i giocatori su una versione vecchia):
//  - file del sito (stessa origine): PRIMA LA RETE, la copia salvata serve solo
//    se la rete manca o non risponde entro qualche secondo;
//  - librerie esterne con versione nell'indirizzo (Firebase SDK, confetti) e
//    font: prima la copia salvata (non cambiano mai a parita' di indirizzo);
//  - tutto il resto (Firestore, login, Analytics): non viene toccato.
// Cambiare CACHE solo se si vuole buttare via le copie salvate.
const CACHE = 'alberi-v1';

const CORE = [
    './',
    'index.html',
    'privacy.html',
    'style.css',
    'i18n.js',
    'pwa.js',
    'firebase-config.js',
    'utils.js',
    'generator.js',
    'levels12.js',
    'gen-worker.js',
    'firestore-sync.js',
    'streak.js',
    'auth.js',
    'script.js',
    'manifest.json',
    'icons/icon-192.png',
    'icons/icon-512.png',
    'icons/apple-touch-icon.png'
];

const CDN_PREFIXES = [
    'https://www.gstatic.com/firebasejs/',
    'https://cdn.jsdelivr.net/npm/canvas-confetti@',
    'https://fonts.googleapis.com/',
    'https://fonts.gstatic.com/'
];

const NETWORK_TIMEOUT_MS = 5000;

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE)
            .then(cache => cache.addAll(CORE.map(u => new Request(u, { cache: 'reload' }))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

function fetchWithTimeout(request) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('timeout')), NETWORK_TIMEOUT_MS);
        fetch(request).then(
            res => { clearTimeout(timer); resolve(res); },
            err => { clearTimeout(timer); reject(err); }
        );
    });
}

async function networkFirst(request) {
    const cache = await caches.open(CACHE);
    try {
        const res = await fetchWithTimeout(request);
        if (res && res.ok && res.type === 'basic') {
            // Salva senza la query (?d=&s=, utm, source=pwa): una copia per file
            cache.put(request.url.split('?')[0].split('#')[0], res.clone());
        }
        return res;
    } catch (err) {
        // Offline o rete troppo lenta: copia salvata (ignorando ?d=&s=&utm...)
        const cached = await cache.match(request, { ignoreSearch: true });
        if (cached) return cached;
        if (request.mode === 'navigate') {
            const home = await cache.match('./') || await cache.match('index.html');
            if (home) return home;
        }
        throw err;
    }
}

async function cacheFirst(request) {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    const res = await fetch(request);
    // Le librerie caricate con <script> arrivano "opache" (status 0): vanno
    // salvate lo stesso, altrimenti offline il gioco non parte.
    if (res && (res.ok || res.type === 'opaque')) {
        cache.put(request, res.clone());
    }
    return res;
}

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;
    const url = request.url;

    if (new URL(url).origin === self.location.origin) {
        event.respondWith(networkFirst(request));
        return;
    }
    if (CDN_PREFIXES.some(p => url.startsWith(p))) {
        event.respondWith(cacheFirst(request));
    }
    // altrimenti: nessun intervento (Firestore, Auth, Analytics...)
});
