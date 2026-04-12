// ============================================================
// AUTH.JS - Sistema Login / Registrazione
// ============================================================

let currentUser = null;

function initAuth() {
    if (!window.firebaseReady) {
        updateAuthUI(null);
        return;
    }

    firebaseAuth.onAuthStateChanged(async (user) => {
        currentUser = user;
        updateAuthUI(user);

        if (user) {
            // Sincronizza localStorage -> Firestore al primo login
            await syncLocalToFirestore(user.uid);
            // Ricarica il livello corrente per mostrare dati aggiornati
            if (typeof loadDailyLevel === 'function') {
                loadDailyLevel(currentSize);
            }
        }
    });
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
        if (window.firebaseReady) {
            authContainer.innerHTML = `
                <button class="btn primary btn-small" id="btn-show-login">Accedi</button>
            `;
            document.getElementById('btn-show-login').addEventListener('click', showAuthModal);
        } else {
            authContainer.innerHTML = `<span class="auth-local-mode">Modalita' locale</span>`;
        }
    }
}

function showAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.add('show');
    switchAuthTab('login');
}

function hideAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.remove('show');
    clearAuthErrors();
}

function switchAuthTab(tab) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');

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
        hideAuthModal();
    } catch (err) {
        errorEl.textContent = getAuthErrorMessage(err.code);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const errorEl = document.getElementById('register-error');

    if (!name || !email || !password) {
        errorEl.textContent = 'Compila tutti i campi.';
        return;
    }
    if (password.length < 6) {
        errorEl.textContent = 'La password deve avere almeno 6 caratteri.';
        return;
    }

    try {
        const cred = await firebaseAuth.createUserWithEmailAndPassword(email, password);
        await cred.user.updateProfile({ displayName: name });

        // Salva profilo su Firestore
        if (firebaseDb) {
            await firebaseDb.collection('users').doc(cred.user.uid).set({
                username: name,
                email: email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        hideAuthModal();
    } catch (err) {
        errorEl.textContent = getAuthErrorMessage(err.code);
    }
}

async function handleLogout() {
    try {
        await firebaseAuth.signOut();
        currentUser = null;
        if (typeof loadDailyLevel === 'function') {
            loadDailyLevel(currentSize);
        }
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
        'auth/invalid-credential': 'Credenziali non valide.'
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

        // Calcola statistiche
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

        // Calcola streak
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

    // Lo streak conta solo se hai giocato oggi o ieri
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
