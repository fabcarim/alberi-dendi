// ============================================================
// I18N.JS - Traduzioni IT / EN
// ============================================================
// Lingua: localStorage.alberi_lang se presente, altrimenti navigator.language
// (it* -> it, tutto il resto -> en).
// Uso: t('chiave', { param: valore }) -> stringa con {param} sostituiti.
// In HTML: data-i18n (textContent), data-i18n-html (innerHTML, solo testi
// del dizionario, mai dati utente), data-i18n-placeholder, data-i18n-title,
// data-i18n-aria-label.

const I18N_DICT = {
    it: {
        'app.title': 'Alberi Daily 🌲',
        'app.subtitle': 'Un nuovo puzzle ogni giorno!',
        'app.archiveTitle': 'Alberi Daily - Archivio 📅',
        'app.archiveSubtitle': 'Stai giocando nel passato: <strong>{date}</strong>',
        'app.archiveLabelTitle': 'Archivio: scegli una data',

        'btn.check': 'Controlla',
        'btn.reset': 'Ricomincia',
        'btn.leaderboard': 'Classifica 🏆',
        'btn.share': 'Condividi Risultato 📤',
        'btn.copied': 'Copiato!',
        'btn.close': 'Chiudi',

        'status.initial': 'Posiziona gli alberi: 1 per righe, colonne e aree colorate.',
        'status.placeOne': 'Posiziona {n} albero per riga, colonna e area.',
        'status.placeMany': 'Posiziona {n} alberi per riga, colonna e area.',
        'status.reset': 'Livello ricominciato.',
        'status.generating': 'Preparo la sfida 12x12... qualche secondo di pazienza 🌲',
        'status.errors': 'Ci sono errori. Controlla le caselle rosse.',
        'status.win': 'Fantastico! Hai completato il livello {size}x{size}! 🎉',
        'status.alreadyDone': 'Hai gia\' completato il livello {size}x{size}! Tempo: {time} 🌟',
        'status.weeklyLocked': 'La Sfida Speciale si sblocca Domenica alle 09:00!',

        'rules.html': '<p><strong>Regole:</strong> Clicca per ciclare: Croce <span class="icon">❌</span> -> Albero <span class="icon">🌳</span> -> Vuoto.</p>' +
            '<p>Su PC puoi usare il Tasto Destro per mettere subito l\'Erba.</p>' +
            '<p>Non posizionare alberi adiacenti (neanche in diagonale).</p>',
        'footer.credits': 'Developed with AI. Idea originale &copy; Giorgio Dendi.',
        'footer.privacy': 'Privacy',

        'consent.text': 'Usiamo cookie tecnici e analytics per migliorare l\'app. <a href="privacy.html" style="color: #2ecc71; text-decoration: underline;">Leggi la privacy</a>',
        'consent.accept': 'Accetta',
        'consent.deny': 'Solo essenziali',

        'share.title': 'Alberi {size}×{size} · {date} 🌳',
        'share.titleWeekly': 'Sfida della domenica 12×12 · {date} 🌳',
        'share.time': '⏱ {time} — riesci a battermi?',

        'auth.tagline': 'Un gioco di logica ispirato a Giorgio Dendi',
        'auth.subtitleAnon': 'Salva i tuoi progressi su tutti i dispositivi e compari in classifica.',
        'auth.tabLogin': 'Accedi',
        'auth.tabRegister': 'Registrati',
        'auth.email': 'Email',
        'auth.password': 'Password',
        'auth.passwordNew': 'Password (min 6 caratteri)',
        'auth.nicknamePh': 'Nickname (visibile in classifica)',
        'auth.loginBtn': 'Accedi',
        'auth.registerBtn': 'Registrati',
        'auth.google': 'Accedi con Google',
        'auth.openBtn': 'Accedi / Registrati',
        'auth.logout': 'Esci',
        'auth.logoutTitle': 'Esci',
        'auth.statsTitle': 'Statistiche',
        'auth.localMode': 'Modalita\' locale',
        'auth.close': 'Chiudi',
        'auth.fillAll': 'Compila tutti i campi.',
        'auth.passwordShort': 'La password deve avere almeno 6 caratteri.',
        'auth.emailExistsLogin': 'Email gia\' registrata: password errata. Usa "Accedi" con la tua password.',

        'authErr.auth/email-already-in-use': 'Email gia\' registrata.',
        'authErr.auth/invalid-email': 'Email non valida.',
        'authErr.auth/weak-password': 'Password troppo debole (min 6 caratteri).',
        'authErr.auth/user-not-found': 'Utente non trovato.',
        'authErr.auth/wrong-password': 'Password errata.',
        'authErr.auth/too-many-requests': 'Troppi tentativi. Riprova piu\' tardi.',
        'authErr.auth/invalid-credential': 'Credenziali non valide.',
        'authErr.auth/popup-closed-by-user': 'Popup chiuso. Riprova.',
        'authErr.auth/cancelled-popup-request': 'Richiesta annullata.',
        'authErr.auth/popup-blocked': 'Popup bloccato dal browser. Abilita i popup per questo sito.',
        'authErr.auth/network-request-failed': 'Errore di rete. Controlla la connessione.',
        'authErr.default': 'Errore di autenticazione. Riprova.',

        'nick.title': 'Scegli il tuo Nickname',
        'nick.desc': 'Questo nome sara\' visibile in classifica.',
        'nick.descAnon': 'Scegli un nickname per comparire nella classifica di oggi.',
        'nick.placeholder': 'Il tuo nickname',
        'nick.confirm': 'Conferma',
        'nick.skip': 'Salta (non comparire in classifica)',
        'nick.errLength': 'Il nickname deve avere tra 2 e 20 caratteri.',
        'nick.errChars': 'Il nickname non puo\' contenere i caratteri < e >.',
        'nick.errSave': 'Errore nel salvataggio. Riprova.',

        'stats.title': 'Le tue Statistiche',
        'stats.loading': 'Caricamento...',
        'stats.needLogin': 'Devi essere loggato per vedere le statistiche.',
        'stats.empty': 'Nessun puzzle completato ancora. Gioca per vedere le tue statistiche!',
        'stats.completed': 'Puzzle completati',
        'stats.streak': 'Streak giorni',
        'stats.daysPlayed': 'Giorni giocati',
        'stats.bestTimes': 'Migliori tempi',
        'stats.error': 'Errore nel caricamento delle statistiche.',

        'lb.title': 'Classifica del Giorno 🏆',
        'lb.loading': 'Caricamento classifica...',
        'lb.unavailable': 'Classifica non disponibile.',
        'lb.empty': 'Nessuno ha ancora completato questa sfida oggi. Sii il primo!',
        'lb.error': 'Errore nel caricamento della classifica. Potrebbe servire un indice Firestore.',
        'lb.anonymous': 'Anonimo',

        'lang.switchTitle': 'Lingua'
    },
    en: {
        'app.title': 'Alberi Daily 🌲',
        'app.subtitle': 'A new puzzle every day!',
        'app.archiveTitle': 'Alberi Daily - Archive 📅',
        'app.archiveSubtitle': 'You are playing in the past: <strong>{date}</strong>',
        'app.archiveLabelTitle': 'Archive: pick a date',

        'btn.check': 'Check',
        'btn.reset': 'Restart',
        'btn.leaderboard': 'Leaderboard 🏆',
        'btn.share': 'Share Result 📤',
        'btn.copied': 'Copied!',
        'btn.close': 'Close',

        'status.initial': 'Place the trees: 1 per row, column and colored area.',
        'status.placeOne': 'Place {n} tree per row, column and area.',
        'status.placeMany': 'Place {n} trees per row, column and area.',
        'status.reset': 'Level restarted.',
        'status.generating': 'Preparing the 12x12 challenge... just a few seconds 🌲',
        'status.errors': 'There are mistakes. Check the red cells.',
        'status.win': 'Great! You solved the {size}x{size} puzzle! 🎉',
        'status.alreadyDone': 'You already solved the {size}x{size} puzzle! Time: {time} 🌟',
        'status.weeklyLocked': 'The Special Challenge unlocks on Sunday at 09:00!',

        'rules.html': '<p><strong>Rules:</strong> Click to cycle: Cross <span class="icon">❌</span> -> Tree <span class="icon">🌳</span> -> Empty.</p>' +
            '<p>On desktop, right-click places a cross directly.</p>' +
            '<p>Trees cannot touch each other (not even diagonally).</p>',
        'footer.credits': 'Developed with AI. Original idea &copy; Giorgio Dendi.',
        'footer.privacy': 'Privacy',

        'consent.text': 'We use technical cookies and analytics to improve the app. <a href="privacy.html" style="color: #2ecc71; text-decoration: underline;">Read the privacy policy</a>',
        'consent.accept': 'Accept',
        'consent.deny': 'Essential only',

        'share.title': 'Alberi {size}×{size} · {date} 🌳',
        'share.titleWeekly': 'Sunday Challenge 12×12 · {date} 🌳',
        'share.time': '⏱ {time} — can you beat me?',

        'auth.tagline': 'A logic puzzle inspired by Giorgio Dendi',
        'auth.subtitleAnon': 'Save your progress on every device and join the leaderboard.',
        'auth.tabLogin': 'Log in',
        'auth.tabRegister': 'Sign up',
        'auth.email': 'Email',
        'auth.password': 'Password',
        'auth.passwordNew': 'Password (min 6 characters)',
        'auth.nicknamePh': 'Nickname (shown on the leaderboard)',
        'auth.loginBtn': 'Log in',
        'auth.registerBtn': 'Sign up',
        'auth.google': 'Continue with Google',
        'auth.openBtn': 'Log in / Sign up',
        'auth.logout': 'Log out',
        'auth.logoutTitle': 'Log out',
        'auth.statsTitle': 'Statistics',
        'auth.localMode': 'Local mode',
        'auth.close': 'Close',
        'auth.fillAll': 'Please fill in all fields.',
        'auth.passwordShort': 'Password must be at least 6 characters.',
        'auth.emailExistsLogin': 'Email already registered: wrong password. Use "Log in" with your password.',

        'authErr.auth/email-already-in-use': 'Email already registered.',
        'authErr.auth/invalid-email': 'Invalid email.',
        'authErr.auth/weak-password': 'Password too weak (min 6 characters).',
        'authErr.auth/user-not-found': 'User not found.',
        'authErr.auth/wrong-password': 'Wrong password.',
        'authErr.auth/too-many-requests': 'Too many attempts. Try again later.',
        'authErr.auth/invalid-credential': 'Invalid credentials.',
        'authErr.auth/popup-closed-by-user': 'Popup closed. Please try again.',
        'authErr.auth/cancelled-popup-request': 'Request cancelled.',
        'authErr.auth/popup-blocked': 'Popup blocked by the browser. Allow popups for this site.',
        'authErr.auth/network-request-failed': 'Network error. Check your connection.',
        'authErr.default': 'Authentication error. Please try again.',

        'nick.title': 'Choose your Nickname',
        'nick.desc': 'This name will be shown on the leaderboard.',
        'nick.descAnon': 'Choose a nickname to appear on today\'s leaderboard.',
        'nick.placeholder': 'Your nickname',
        'nick.confirm': 'Confirm',
        'nick.skip': 'Skip (stay off the leaderboard)',
        'nick.errLength': 'Nickname must be 2 to 20 characters long.',
        'nick.errChars': 'Nickname cannot contain the characters < and >.',
        'nick.errSave': 'Could not save. Please try again.',

        'stats.title': 'Your Statistics',
        'stats.loading': 'Loading...',
        'stats.needLogin': 'You need to be logged in to see your statistics.',
        'stats.empty': 'No puzzles solved yet. Play to see your statistics!',
        'stats.completed': 'Puzzles solved',
        'stats.streak': 'Day streak',
        'stats.daysPlayed': 'Days played',
        'stats.bestTimes': 'Best times',
        'stats.error': 'Error loading statistics.',

        'lb.title': 'Today\'s Leaderboard 🏆',
        'lb.loading': 'Loading leaderboard...',
        'lb.unavailable': 'Leaderboard not available.',
        'lb.empty': 'Nobody has solved this challenge yet today. Be the first!',
        'lb.error': 'Error loading the leaderboard. A Firestore index may be required.',
        'lb.anonymous': 'Anonymous',

        'lang.switchTitle': 'Language'
    }
};

const I18N_SUPPORTED = ['it', 'en'];

function detectLang() {
    try {
        const saved = localStorage.getItem('alberi_lang');
        if (saved && I18N_SUPPORTED.indexOf(saved) !== -1) return saved;
    } catch (e) { /* localStorage non disponibile */ }
    const nav = ((navigator.languages && navigator.languages[0]) || navigator.language || '').toLowerCase();
    return nav.indexOf('it') === 0 ? 'it' : 'en';
}

let currentLang = detectLang();

function getLang() {
    return currentLang;
}

// Locale per toLocaleDateString / Intl
function getLocale() {
    return currentLang === 'it' ? 'it-IT' : 'en-US';
}

function hasT(key) {
    return !!((I18N_DICT[currentLang] && I18N_DICT[currentLang][key] !== undefined) ||
        (I18N_DICT.it[key] !== undefined));
}

// t('chiave', {param}) -> testo tradotto; fallback italiano, poi la chiave stessa.
function t(key, params) {
    const dict = I18N_DICT[currentLang] || I18N_DICT.it;
    let str = dict[key];
    if (str === undefined) str = I18N_DICT.it[key];
    if (str === undefined) return key;
    if (params) {
        Object.keys(params).forEach(p => {
            str = str.split('{' + p + '}').join(String(params[p]));
        });
    }
    return str;
}

// Applica le traduzioni agli elementi statici con attributi data-i18n*.
function applyI18n(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = t(el.getAttribute('data-i18n'));
    });
    scope.querySelectorAll('[data-i18n-html]').forEach(el => {
        el.innerHTML = t(el.getAttribute('data-i18n-html'));
    });
    scope.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
    scope.querySelectorAll('[data-i18n-title]').forEach(el => {
        el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
    });
    scope.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
        el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria-label')));
    });
    document.documentElement.lang = currentLang;
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === currentLang);
    });
}

// Cambio lingua dal selettore in header: salva, riapplica e notifica
// gli altri moduli (script.js ascolta 'alberi:langchange' per le parti dinamiche).
function setLang(lang) {
    if (I18N_SUPPORTED.indexOf(lang) === -1 || lang === currentLang) return;
    currentLang = lang;
    try { localStorage.setItem('alberi_lang', lang); } catch (e) { /* ignora */ }
    applyI18n();
    try {
        document.dispatchEvent(new CustomEvent('alberi:langchange', { detail: { lang: lang } }));
    } catch (e) { /* ignora */ }
}

// Gli script sono in fondo al body: il DOM statico e' gia' presente.
applyI18n();
