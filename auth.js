// ============================================================
// AUTH.JS - Accesso anonimo automatico + login/registrazione opzionali
// ============================================================
// All'avvio, se non c'e' utente, si entra con Firebase Anonymous Auth: si gioca
// subito e progressi/completamenti vanno su Firestore sotto l'uid anonimo.
// "Accedi / Registrati" apre la modale (ex overlay obbligatorio). Se un anonimo
// si registra, l'account viene COLLEGATO (linkWithCredential / linkWithPopup)
// cosi' uid e dati restano. Se le credenziali appartengono gia' a un account,
// si fa il login normale e si sincronizzano i completamenti locali.

let currentUser = null;
let _anonSignInPending = false;
let _redirectSettled = Promise.resolve();

function initAuth() {
    if (!window.firebaseReady) {
        // Firebase non disponibile: si gioca in locale (localStorage), senza blocchi.
        updateAuthUI(null);
        return;
    }

    // Gestisci ritorno da Google redirect (login normale o collegamento di un anonimo)
    _redirectSettled = firebaseAuth.getRedirectResult().then(async (result) => {
        if (result && result.user) {
            if (result.operationType === 'link') {
                await onGoogleLinked(result);
            } else {
                await finishGoogleSignIn(result);
            }
        }
    }).catch(async (err) => {
        if (isAlreadyInUseError(err)) {
            await signInExistingWithCredential(err, 'google');
        } else {
            console.error('Errore redirect Google:', err);
        }
    });

    firebaseAuth.onAuthStateChanged(async (user) => {
        currentUser = user;
        updateAuthUI(user);

        if (user) {
            if (!user.isAnonymous) hideLoginOverlay();
            await syncLocalToFirestore(user.uid);
            if (typeof saveShareReferral === 'function') saveShareReferral(user.uid);
            // Per l'anonimo appena creato non ricarichiamo il livello se si sta gia'
            // giocando (stesso puzzle, niente da recuperare): evita il "salto" del timer.
            const midGame = (typeof isTimerRunning !== 'undefined') && isTimerRunning;
            if (typeof loadDailyLevel === 'function' && !(user.isAnonymous && midGame)) {
                loadDailyLevel(currentSize);
            }
        } else {
            ensureAnonymousUser();
        }
    });
}

// Accesso anonimo (una richiesta alla volta, nessun retry in loop).
// Se il provider Anonimo non e' abilitato in console, il gioco resta in locale.
async function ensureAnonymousUser() {
    if (_anonSignInPending || !firebaseAuth) return;
    _anonSignInPending = true;
    try {
        await _redirectSettled; // non creare un anonimo se un redirect sta facendo login
        if (!firebaseAuth.currentUser) {
            await firebaseAuth.signInAnonymously();
        }
    } catch (err) {
        console.warn('Accesso anonimo non disponibile, si gioca in locale:', err && err.code);
    } finally {
        _anonSignInPending = false;
    }
}

function isAnonymousUser() {
    return !!(currentUser && currentUser.isAnonymous);
}

function isAlreadyInUseError(err) {
    return !!err && (err.code === 'auth/credential-already-in-use' || err.code === 'auth/email-already-in-use');
}

// Evento analytics signup/login con referral (back-compat con la Fase 0)
function logAuthEvent(name, method, extra) {
    try {
        const referral = (typeof getReferralSource === 'function') ? getReferralSource() : null;
        const params = { method: method };
        if (referral) params.referral_source = referral;
        if (extra) Object.keys(extra).forEach(k => { params[k] = extra[k]; });
        if (typeof trackEvent === 'function') trackEvent(name, params);
    } catch (e) { /* silent */ }
}

// Modale login/registrazione (ex overlay obbligatorio, ora chiudibile)
function showLoginOverlay(tab) {
    const overlay = document.getElementById('login-overlay');
    if (overlay) overlay.style.display = 'flex';
    const hint = document.getElementById('auth-anon-hint');
    if (hint) hint.style.display = isAnonymousUser() ? 'block' : 'none';
    switchOverlayTab(tab || (isAnonymousUser() ? 'register' : 'login'));
}

function hideLoginOverlay() {
    const overlay = document.getElementById('login-overlay');
    if (overlay) overlay.style.display = 'none';
}

function updateAuthUI(user) {
    const authContainer = document.getElementById('auth-container');
    if (!authContainer) return;

    if (user && !user.isAnonymous) {
        const displayName = user.displayName || (user.email ? user.email.split('@')[0] : '');
        authContainer.innerHTML = `
            <span class="auth-user-name">${escapeHtml(displayName)}</span>
            <button class="btn secondary btn-small" id="btn-stats" title="${escapeHtml(t('auth.statsTitle'))}">📊</button>
            <button class="btn secondary btn-small" id="btn-logout" title="${escapeHtml(t('auth.logoutTitle'))}">${escapeHtml(t('auth.logout'))}</button>
        `;
        document.getElementById('btn-logout').addEventListener('click', handleLogout);
        document.getElementById('btn-stats').addEventListener('click', showStatsModal);
    } else if (window.firebaseReady) {
        // Anonimo (o accesso anonimo non riuscito): invito ad accedere/registrarsi
        let html = '';
        if (user && user.displayName) {
            html += `<span class="auth-user-name">${escapeHtml(user.displayName)}</span>`;
        }
        if (user) {
            html += `<button class="btn secondary btn-small" id="btn-stats" title="${escapeHtml(t('auth.statsTitle'))}">📊</button>`;
        }
        html += `<button class="btn primary btn-small" id="btn-open-auth">${escapeHtml(t('auth.openBtn'))}</button>`;
        authContainer.innerHTML = html;
        const statsBtn = document.getElementById('btn-stats');
        if (statsBtn) statsBtn.addEventListener('click', showStatsModal);
        document.getElementById('btn-open-auth').addEventListener('click', () => showLoginOverlay());
    } else {
        authContainer.innerHTML = `<span class="auth-local-mode">${escapeHtml(t('auth.localMode'))}</span>`;
    }
}

// Tab switching nell'overlay
function switchOverlayTab(tab) {
    const loginForm = document.getElementById('overlay-login-form');
    const registerForm = document.getElementById('overlay-register-form');
    const tabLogin = document.getElementById('overlay-tab-login');
    const tabRegister = document.getElementById('overlay-tab-register');

    if (tab === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        tabLogin.classList.remove('active');
        tabRegister.classList.add('active');
    }
    clearAuthErrors();
}

function clearAuthErrors() {
    document.querySelectorAll('.auth-error').forEach(el => el.textContent = '');
}

// Elemento errore del form attualmente visibile (login o registrazione)
function getVisibleAuthErrorEl() {
    const registerForm = document.getElementById('overlay-register-form');
    if (registerForm && registerForm.style.display !== 'none') {
        return document.getElementById('register-error');
    }
    return document.getElementById('login-error');
}

// Dopo un collegamento anonimo -> account: stesso uid, quindi onAuthStateChanged
// non scatta. Aggiorniamo noi UI e stato.
function onAccountLinked(user) {
    currentUser = user || firebaseAuth.currentUser;
    updateAuthUI(currentUser);
    hideLoginOverlay();
}

// Credenziali gia' usate da un altro account: login normale in quell'account.
// onAuthStateChanged poi esegue syncLocalToFirestore con i completamenti locali.
async function signInExistingWithCredential(err, method) {
    try {
        let credential = err && err.credential;
        if (!credential && method === 'google' && firebase.auth.GoogleAuthProvider.credentialFromError) {
            credential = firebase.auth.GoogleAuthProvider.credentialFromError(err);
        }
        if (!credential) throw err;
        const result = await firebaseAuth.signInWithCredential(credential);
        if (result && result.user && firebaseDb) {
            const doc = await firebaseDb.collection('users').doc(result.user.uid).get();
            if (!doc.exists || !doc.data().nickname) showNicknameModal();
        }
        logAuthEvent('login', method);
        hideLoginOverlay();
        return true;
    } catch (e) {
        console.error('Errore login account esistente:', e);
        const errorEl = getVisibleAuthErrorEl();
        if (errorEl) errorEl.textContent = getAuthErrorMessage(e && e.code);
        return false;
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');

    if (!email || !password) {
        errorEl.textContent = t('auth.fillAll');
        return;
    }

    try {
        // Anche da anonimo: login normale nell'account esistente; i completamenti
        // locali vengono sincronizzati da onAuthStateChanged (syncLocalToFirestore).
        await firebaseAuth.signInWithEmailAndPassword(email, password);
        logAuthEvent('login', 'email');
    } catch (err) {
        errorEl.textContent = getAuthErrorMessage(err.code);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const nickname = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const errorEl = document.getElementById('register-error');

    if (!nickname || !email || !password) {
        errorEl.textContent = t('auth.fillAll');
        return;
    }
    const nickError = validateNickname(nickname);
    if (nickError) {
        errorEl.textContent = t(nickError);
        return;
    }
    if (password.length < 6) {
        errorEl.textContent = t('auth.passwordShort');
        return;
    }

    // Anonimo: collega email/password all'account anonimo (uid e dati restano)
    if (isAnonymousUser()) {
        let linked = null;
        try {
            const credential = firebase.auth.EmailAuthProvider.credential(email, password);
            linked = await currentUser.linkWithCredential(credential);
        } catch (err) {
            if (isAlreadyInUseError(err)) {
                // Email gia' registrata: proviamo il login con la password inserita
                try {
                    await firebaseAuth.signInWithEmailAndPassword(email, password);
                    logAuthEvent('login', 'email');
                } catch (loginErr) {
                    errorEl.textContent = t('auth.emailExistsLogin');
                }
            } else {
                errorEl.textContent = getAuthErrorMessage(err.code);
            }
            return;
        }

        try {
            const user = linked.user;
            await user.updateProfile({ displayName: nickname });
            if (firebaseDb) {
                await firebaseDb.collection('users').doc(user.uid).set({
                    nickname: nickname,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }
            logAuthEvent('signup', 'email', { from_anonymous: true });
            onAccountLinked(user);
            if (typeof publishRecentToLeaderboard === 'function') {
                publishRecentToLeaderboard(user.uid, nickname);
            }
        } catch (err) {
            // Il collegamento e' riuscito comunque: aggiorna la UI, mostra l'errore
            console.error('Errore completamento registrazione:', err);
            currentUser = linked.user;
            updateAuthUI(currentUser);
            errorEl.textContent = getAuthErrorMessage(err.code);
        }
        return;
    }

    try {
        const cred = await firebaseAuth.createUserWithEmailAndPassword(email, password);
        await cred.user.updateProfile({ displayName: nickname });

        if (firebaseDb) {
            await firebaseDb.collection('users').doc(cred.user.uid).set({
                nickname: nickname,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        logAuthEvent('signup', 'email');
    } catch (err) {
        errorEl.textContent = getAuthErrorMessage(err.code);
    }
}

// Post-login Google (account non anonimo): nickname al primo accesso + analytics
async function finishGoogleSignIn(result) {
    if (!result || !result.user) return;
    const isNew = !!(result.additionalUserInfo && result.additionalUserInfo.isNewUser);
    // Controlla se l'utente ha gia' un profilo con nickname su Firestore
    if (firebaseDb) {
        const doc = await firebaseDb.collection('users').doc(result.user.uid).get();
        if (!doc.exists || !doc.data().nickname) {
            // Nuovo utente Google: mostra modale per scegliere nickname
            showNicknameModal();
        }
    }
    logAuthEvent(isNew ? 'signup' : 'login', 'google');
}

// Post-collegamento Google di un anonimo (popup o redirect)
async function onGoogleLinked(result) {
    const user = result.user;
    onAccountLinked(user);
    logAuthEvent('signup', 'google', { from_anonymous: true });
    if (firebaseDb) {
        const doc = await firebaseDb.collection('users').doc(user.uid).get();
        const nickname = doc.exists ? doc.data().nickname : null;
        if (!nickname) {
            showNicknameModal();
        } else if (typeof publishRecentToLeaderboard === 'function') {
            publishRecentToLeaderboard(user.uid, nickname);
        }
    }
}

async function handleGoogleLogin() {
    if (!window.firebaseReady) return;

    const provider = new firebase.auth.GoogleAuthProvider();
    const errorEl = getVisibleAuthErrorEl();
    const linking = isAnonymousUser();

    try {
        // Prova prima con popup (piu' affidabile su GitHub Pages)
        if (linking) {
            const result = await currentUser.linkWithPopup(provider);
            await onGoogleLinked(result);
        } else {
            const result = await firebaseAuth.signInWithPopup(provider);
            await finishGoogleSignIn(result);
        }
    } catch (err) {
        // Account Google gia' esistente: login normale in quell'account
        if (linking && isAlreadyInUseError(err)) {
            await signInExistingWithCredential(err, 'google');
            return;
        }

        console.error('Errore Google login (popup):', err);

        // Se il popup e' bloccato, fallback a redirect
        if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
            try {
                if (linking) {
                    await currentUser.linkWithRedirect(provider);
                } else {
                    await firebaseAuth.signInWithRedirect(provider);
                }
            } catch (redirectErr) {
                if (errorEl) errorEl.textContent = getAuthErrorMessage(redirectErr.code);
            }
        } else {
            if (errorEl) errorEl.textContent = getAuthErrorMessage(err.code);
        }
    }
}

async function handleLogout() {
    try {
        await firebaseAuth.signOut();
        currentUser = null;
        // onAuthStateChanged(null) -> si rientra come anonimo
    } catch (err) {
        console.error('Errore logout:', err);
    }
}

function getAuthErrorMessage(code) {
    const key = 'authErr.' + code;
    return (code && hasT(key)) ? t(key) : t('authErr.default');
}

// Statistiche
async function showStatsModal() {
    const modal = document.getElementById('stats-modal');
    if (!modal) return;

    const statsContent = document.getElementById('stats-content');
    statsContent.innerHTML = `<p>${escapeHtml(t('stats.loading'))}</p>`;
    modal.classList.add('show');

    if (!currentUser || !firebaseDb) {
        statsContent.innerHTML = `<p>${escapeHtml(t('stats.needLogin'))}</p>`;
        return;
    }

    try {
        const snapshot = await firebaseDb
            .collection('users').doc(currentUser.uid)
            .collection('completions')
            .orderBy('completedAt', 'desc')
            .get();

        const completions = [];
        snapshot.forEach(doc => completions.push(doc.data()));

        if (completions.length === 0) {
            statsContent.innerHTML = `<p>${escapeHtml(t('stats.empty'))}</p>`;
            return;
        }

        const totalCompleted = completions.length;
        const bestTimes = {};
        const dateSet = new Set();

        completions.forEach(c => {
            dateSet.add(c.date);
            const key = `${c.size}x${c.size}`;
            if (!bestTimes[key] || c.timeSeconds < bestTimes[key]) {
                bestTimes[key] = c.timeSeconds;
            }
        });

        const streak = calculateStreak(dateSet);

        let html = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number">${totalCompleted}</div>
                    <div class="stat-label">${escapeHtml(t('stats.completed'))}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${streak}</div>
                    <div class="stat-label">${escapeHtml(t('stats.streak'))}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${dateSet.size}</div>
                    <div class="stat-label">${escapeHtml(t('stats.daysPlayed'))}</div>
                </div>
            </div>
            <h3 style="margin: 1rem 0 0.5rem;">${escapeHtml(t('stats.bestTimes'))}</h3>
            <div class="best-times">
        `;

        const sortedSizes = Object.keys(bestTimes).sort((a, b) => parseInt(a) - parseInt(b));
        sortedSizes.forEach(size => {
            const secs = Math.max(0, Math.floor(Number(bestTimes[size]) || 0));
            const m = Math.floor(secs / 60).toString().padStart(2, '0');
            const s = (secs % 60).toString().padStart(2, '0');
            html += `<div class="best-time-row"><span>${escapeHtml(size)}</span><span>${m}:${s}</span></div>`;
        });

        html += '</div>';
        statsContent.innerHTML = html;
    } catch (err) {
        console.error('Errore caricamento statistiche:', err);
        statsContent.innerHTML = `<p>${escapeHtml(t('stats.error'))}</p>`;
    }
}

function calculateStreak(dateSet) {
    if (dateSet.size === 0) return 0;

    // Date in ora locale (prima era UTC)
    const dates = Array.from(dateSet).sort().reverse();
    const now = new Date();
    const today = localDateStr(now);
    const yesterday = localDateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));

    if (dates[0] !== today && dates[0] !== yesterday) return 0;

    let streak = 1;
    for (let i = 0; i < dates.length - 1; i++) {
        const curr = parseLocalDate(dates[i]);
        const prev = parseLocalDate(dates[i + 1]);
        // Math.round: con l'ora legale un giorno locale puo' durare 23 o 25 ore
        const diff = Math.round((curr - prev) / 86400000);
        if (diff === 1) {
            streak++;
        } else {
            break;
        }
    }
    return streak;
}

function hideStatsModal() {
    const modal = document.getElementById('stats-modal');
    if (modal) modal.classList.remove('show');
}

// Nickname modal: utenti Google al primo accesso (obbligatorio, come prima)
// oppure anonimi al primo completamento ({ allowSkip: true }).
function showNicknameModal(opts) {
    const allowSkip = !!(opts && opts.allowSkip);
    const modal = document.getElementById('nickname-modal');
    const skipBtn = document.getElementById('nickname-skip');
    const desc = document.getElementById('nickname-desc');
    if (skipBtn) skipBtn.style.display = allowSkip ? 'block' : 'none';
    if (desc) {
        const key = allowSkip ? 'nick.descAnon' : 'nick.desc';
        desc.setAttribute('data-i18n', key);
        desc.textContent = t(key);
    }
    if (modal) modal.classList.add('show');
    const input = document.getElementById('nickname-input');
    if (input) input.focus();
}

function hideNicknameModal() {
    const modal = document.getElementById('nickname-modal');
    if (modal) modal.classList.remove('show');
}

// Chiamata da handleWin: anonimo senza nickname -> proponi il nickname una volta sola
function maybePromptNicknameAfterWin() {
    if (!isAnonymousUser() || currentUser.displayName) return;
    let skipped = null;
    try { skipped = localStorage.getItem('alberi_nick_skipped'); } catch (e) { /* ignora */ }
    if (skipped) return;
    showNicknameModal({ allowSkip: true });
}

// "Salta": il risultato resta nei completamenti personali ma non va in classifica
function skipNickname() {
    try { localStorage.setItem('alberi_nick_skipped', '1'); } catch (e) { /* ignora */ }
    hideNicknameModal();
}

async function saveNickname(e) {
    e.preventDefault();
    const nickname = document.getElementById('nickname-input').value.trim();
    const errorEl = document.getElementById('nickname-error');

    const nickError = validateNickname(nickname);
    if (nickError) {
        errorEl.textContent = t(nickError);
        return;
    }
    if (!currentUser) {
        errorEl.textContent = t('nick.errSave');
        return;
    }

    try {
        // Aggiorna displayName su Firebase Auth
        await currentUser.updateProfile({ displayName: nickname });

        // Salva su Firestore
        if (firebaseDb) {
            await firebaseDb.collection('users').doc(currentUser.uid).set({
                nickname: nickname,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        }

        // Pubblica in classifica i completamenti recenti col nuovo nickname
        // (es. anonimo che ha appena completato il primo puzzle)
        if (typeof publishRecentToLeaderboard === 'function') {
            publishRecentToLeaderboard(currentUser.uid, nickname);
        }

        // Chiudi modale e aggiorna UI
        hideNicknameModal();
        updateAuthUI(currentUser);
    } catch (err) {
        console.error('Errore salvataggio nickname:', err);
        errorEl.textContent = t('nick.errSave');
    }
}
