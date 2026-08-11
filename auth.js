// ============================================================
// AUTH.JS - Login Obbligatorio (tutto nell'overlay)
// ============================================================

let currentUser = null;

function initAuth() {
    if (!window.firebaseReady) {
        showLoginOverlay();
        return;
    }

    // Gestisci ritorno da Google redirect
    firebaseAuth.getRedirectResult().then(async (result) => {
        if (result && result.user) {
            const user = result.user;
            const isNew = !!(result.additionalUserInfo && result.additionalUserInfo.isNewUser);
            // Controlla se l'utente ha gia' un profilo con nickname su Firestore
            if (firebaseDb) {
                const doc = await firebaseDb.collection('users').doc(user.uid).get();
                if (!doc.exists || !doc.data().nickname) {
                    // Nuovo utente Google: mostra modale per scegliere nickname
                    showNicknameModal();
                }
            }
            try {
                const referral = (typeof getReferralSource === 'function') ? getReferralSource() : null;
                const params = { method: 'google' };
                if (referral) params.referral_source = referral;
                if (typeof trackEvent === 'function') trackEvent(isNew ? 'signup' : 'login', params);
            } catch (e) { /* silent */ }
        }
    }).catch(err => {
        console.error('Errore redirect Google:', err);
    });

    firebaseAuth.onAuthStateChanged(async (user) => {
        currentUser = user;
        updateAuthUI(user);

        if (user) {
            hideLoginOverlay();
            await syncLocalToFirestore(user.uid);
            if (typeof loadDailyLevel === 'function') {
                loadDailyLevel(currentSize);
            }
        } else {
            showLoginOverlay();
        }
    });
}

function showLoginOverlay() {
    const overlay = document.getElementById('login-overlay');
    if (overlay) overlay.style.display = 'flex';
}

function hideLoginOverlay() {
    const overlay = document.getElementById('login-overlay');
    if (overlay) overlay.style.display = 'none';
}

function updateAuthUI(user) {
    const authContainer = document.getElementById('auth-container');
    if (!authContainer) return;

    if (user) {
        const displayName = user.displayName || user.email.split('@')[0];
        authContainer.innerHTML = `
            <span class="auth-user-name">${displayName}</span>
            <button class="btn secondary btn-small" id="btn-stats" title="Statistiche">📊</button>
            <button class="btn secondary btn-small" id="btn-logout" title="Esci">Esci</button>
        `;
        document.getElementById('btn-logout').addEventListener('click', handleLogout);
        document.getElementById('btn-stats').addEventListener('click', showStatsModal);
    } else {
        authContainer.innerHTML = '';
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

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');

    if (!email || !password) {
        errorEl.textContent = 'Compila tutti i campi.';
        return;
    }

    try {
        await firebaseAuth.signInWithEmailAndPassword(email, password);
        try {
            const referral = (typeof getReferralSource === 'function') ? getReferralSource() : null;
            const params = { method: 'email' };
            if (referral) params.referral_source = referral;
            if (typeof trackEvent === 'function') trackEvent('login', params);
        } catch (e) { /* silent */ }
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
        errorEl.textContent = 'Compila tutti i campi.';
        return;
    }
    if (nickname.length < 2) {
        errorEl.textContent = 'Il nickname deve avere almeno 2 caratteri.';
        return;
    }
    if (password.length < 6) {
        errorEl.textContent = 'La password deve avere almeno 6 caratteri.';
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

        try {
            const referral = (typeof getReferralSource === 'function') ? getReferralSource() : null;
            const params = { method: 'email' };
            if (referral) params.referral_source = referral;
            if (typeof trackEvent === 'function') trackEvent('signup', params);
        } catch (e) { /* silent */ }
    } catch (err) {
        errorEl.textContent = getAuthErrorMessage(err.code);
    }
}

async function handleGoogleLogin() {
    if (!window.firebaseReady) return;

    const provider = new firebase.auth.GoogleAuthProvider();
    const errorEl = document.getElementById('login-error');

    try {
        // Prova prima con popup (piu' affidabile su GitHub Pages)
        const result = await firebaseAuth.signInWithPopup(provider);

        // Se nuovo utente, mostra modale per scegliere nickname
        let isNew = false;
        if (result && result.additionalUserInfo) {
            isNew = !!result.additionalUserInfo.isNewUser;
        }
        if (result && result.user && firebaseDb) {
            const doc = await firebaseDb.collection('users').doc(result.user.uid).get();
            if (!doc.exists || !doc.data().nickname) {
                showNicknameModal();
            }
        }
        try {
            const referral = (typeof getReferralSource === 'function') ? getReferralSource() : null;
            const params = { method: 'google' };
            if (referral) params.referral_source = referral;
            if (typeof trackEvent === 'function') trackEvent(isNew ? 'signup' : 'login', params);
        } catch (e) { /* silent */ }
    } catch (err) {
        console.error('Errore Google login (popup):', err);

        // Se il popup e' bloccato, fallback a redirect
        if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
            try {
                await firebaseAuth.signInWithRedirect(provider);
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
    } catch (err) {
        console.error('Errore logout:', err);
    }
}

function getAuthErrorMessage(code) {
    const messages = {
        'auth/email-already-in-use': 'Email gia\' registrata.',
        'auth/invalid-email': 'Email non valida.',
        'auth/weak-password': 'Password troppo debole (min 6 caratteri).',
        'auth/user-not-found': 'Utente non trovato.',
        'auth/wrong-password': 'Password errata.',
        'auth/too-many-requests': 'Troppi tentativi. Riprova piu\' tardi.',
        'auth/invalid-credential': 'Credenziali non valide.',
        'auth/popup-closed-by-user': 'Popup chiuso. Riprova.',
        'auth/cancelled-popup-request': 'Richiesta annullata.',
        'auth/popup-blocked': 'Popup bloccato dal browser. Abilita i popup per questo sito.'
    };
    return messages[code] || 'Errore di autenticazione. Riprova.';
}

// Statistiche
async function showStatsModal() {
    const modal = document.getElementById('stats-modal');
    if (!modal) return;

    const statsContent = document.getElementById('stats-content');
    statsContent.innerHTML = '<p>Caricamento...</p>';
    modal.classList.add('show');

    if (!currentUser || !firebaseDb) {
        statsContent.innerHTML = '<p>Devi essere loggato per vedere le statistiche.</p>';
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
            statsContent.innerHTML = '<p>Nessun puzzle completato ancora. Gioca per vedere le tue statistiche!</p>';
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
                    <div class="stat-label">Puzzle completati</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${streak}</div>
                    <div class="stat-label">Streak giorni</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${dateSet.size}</div>
                    <div class="stat-label">Giorni giocati</div>
                </div>
            </div>
            <h3 style="margin: 1rem 0 0.5rem;">Migliori tempi</h3>
            <div class="best-times">
        `;

        const sortedSizes = Object.keys(bestTimes).sort((a, b) => parseInt(a) - parseInt(b));
        sortedSizes.forEach(size => {
            const m = Math.floor(bestTimes[size] / 60).toString().padStart(2, '0');
            const s = (bestTimes[size] % 60).toString().padStart(2, '0');
            html += `<div class="best-time-row"><span>${size}</span><span>${m}:${s}</span></div>`;
        });

        html += '</div>';
        statsContent.innerHTML = html;
    } catch (err) {
        console.error('Errore caricamento statistiche:', err);
        statsContent.innerHTML = '<p>Errore nel caricamento delle statistiche.</p>';
    }
}

function calculateStreak(dateSet) {
    if (dateSet.size === 0) return 0;

    const dates = Array.from(dateSet).sort().reverse();
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (dates[0] !== today && dates[0] !== yesterday) return 0;

    let streak = 1;
    for (let i = 0; i < dates.length - 1; i++) {
        const curr = new Date(dates[i]);
        const prev = new Date(dates[i + 1]);
        const diff = (curr - prev) / 86400000;
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

// Nickname modal (per utenti Google al primo accesso)
function showNicknameModal() {
    const modal = document.getElementById('nickname-modal');
    if (modal) modal.classList.add('show');
    const input = document.getElementById('nickname-input');
    if (input) input.focus();
}

async function saveNickname(e) {
    e.preventDefault();
    const nickname = document.getElementById('nickname-input').value.trim();
    const errorEl = document.getElementById('nickname-error');

    if (!nickname || nickname.length < 2) {
        errorEl.textContent = 'Il nickname deve avere almeno 2 caratteri.';
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

        // Chiudi modale e aggiorna UI
        const modal = document.getElementById('nickname-modal');
        if (modal) modal.classList.remove('show');
        updateAuthUI(currentUser);
    } catch (err) {
        console.error('Errore salvataggio nickname:', err);
        errorEl.textContent = 'Errore nel salvataggio. Riprova.';
    }
}
