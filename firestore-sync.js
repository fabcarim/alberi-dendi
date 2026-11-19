// ============================================================
// FIRESTORE-SYNC.JS - Sincronizzazione progressi + Classifica
// ============================================================

// Nickname da usare in classifica, o null se l'utente non deve comparire
// (utente anonimo senza nickname). Utenti registrati: come prima ('Anonimo' di fallback).
function getLeaderboardNickname() {
    if (!currentUser) return null;
    if (currentUser.isAnonymous && !currentUser.displayName) return null;
    return sanitizeNickname(currentUser.displayName || 'Anonimo');
}

// Salva un completamento su Firestore (profilo utente + classifica pubblica).
// completedOn (opzionale): data locale 'YYYY-MM-DD' del completamento, serve alla
// serie di giorni (streak.js). Solo nel profilo utente, MAI in classifica
// (le regole di `leaderboard` rifiutano campi extra).
async function saveCompletionToFirestore(uid, date, size, timeSeconds, completedOn) {
    if (!window.firebaseReady || !firebaseDb || !uid) return;

    const docId = `${date}_${size}`;
    const nickname = getLeaderboardNickname();

    try {
        const completion = {
            date: date,
            size: size,
            timeSeconds: timeSeconds,
            completedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (typeof completedOn === 'string' && completedOn) completion.completedOn = completedOn;

        // Salva nel profilo utente
        await firebaseDb
            .collection('users').doc(uid)
            .collection('completions').doc(docId)
            .set(completion, { merge: true });

        // Salva nella classifica pubblica (solo se l'utente ha un nickname)
        if (nickname) {
            await saveLeaderboardEntry(uid, date, size, timeSeconds, nickname);
        }
    } catch (err) {
        console.error('Errore salvataggio Firestore:', err);
    }
}

// Scrive (o aggiorna) il record pubblico in classifica.
// Usato anche quando un anonimo sceglie il nickname dopo aver completato.
async function saveLeaderboardEntry(uid, date, size, timeSeconds, nickname) {
    if (!window.firebaseReady || !firebaseDb || !uid) return;
    try {
        await firebaseDb
            .collection('leaderboard').doc(`${date}_${size}_${uid}`)
            .set({
                uid: uid,
                nickname: sanitizeNickname(nickname),
                date: date,
                size: size,
                timeSeconds: timeSeconds,
                completedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
    } catch (err) {
        console.error('Errore salvataggio classifica:', err);
    }
}

// Pubblica in classifica i completamenti locali di oggi (e del puzzle aperto,
// se d'archivio) col nickname appena scelto. Al massimo 2 date x 7 misure.
async function publishRecentToLeaderboard(uid, nickname) {
    if (!window.firebaseReady || !firebaseDb || !uid || !nickname) return;
    const dates = [localDateStr()];
    if (typeof todayStr === 'string' && todayStr && dates.indexOf(todayStr) === -1) dates.push(todayStr);
    const sizes = [5, 6, 7, 8, 9, 10, 12];
    for (const date of dates) {
        for (const size of sizes) {
            try {
                const raw = localStorage.getItem(`alberi_daily_${date}_${size}`);
                if (!raw) continue;
                const data = JSON.parse(raw);
                if (data && data.timeSeconds !== undefined) {
                    await saveLeaderboardEntry(uid, date, size, data.timeSeconds, nickname);
                }
            } catch (e) { /* ignora */ }
        }
    }
}

// Arrivo da link condiviso: salva in users/{uid} da quale link e' arrivato
// l'utente (solo se non gia' presente). Indipendente dal consenso GA: serve a
// contare gli arrivi da share direttamente su Firestore. Una volta per sessione.
let _shareReferralSaved = false;
async function saveShareReferral(uid) {
    if (_shareReferralSaved || !window.firebaseReady || !firebaseDb || !uid) return;
    let ref = null;
    try {
        const params = new URLSearchParams(window.location.search);
        if (params.get('utm_source') !== 'share') return;
        ref = (params.get('ref') || 'unknown').slice(0, 128);
    } catch (e) { return; }

    _shareReferralSaved = true;
    try {
        const userRef = firebaseDb.collection('users').doc(uid);
        const doc = await userRef.get();
        if (doc.exists && doc.data().referral_ref) return;
        await userRef.set({
            referral_ref: ref,
            referral_at: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    } catch (err) {
        _shareReferralSaved = false;
        console.error('Errore salvataggio referral:', err);
    }
}

// Leggi un completamento da Firestore
async function getCompletionFromFirestore(uid, date, size) {
    if (!window.firebaseReady || !firebaseDb || !uid) return null;

    const docId = `${date}_${size}`;
    try {
        const doc = await firebaseDb
            .collection('users').doc(uid)
            .collection('completions').doc(docId)
            .get();

        if (doc.exists) return doc.data();
        return null;
    } catch (err) {
        console.error('Errore lettura Firestore:', err);
        return null;
    }
}

// Salva progresso in-corso su Firestore
async function saveProgressToFirestore(uid, date, size, gridState, elapsedTime) {
    if (!window.firebaseReady || !firebaseDb || !uid) return;

    const docId = `progress_${date}_${size}`;
    try {
        await firebaseDb
            .collection('users').doc(uid)
            .collection('progress').doc(docId)
            .set({
                date: date,
                size: size,
                gridState: JSON.stringify(gridState),
                elapsedTime: elapsedTime,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
    } catch (err) {
        console.error('Errore salvataggio progresso Firestore:', err);
    }
}

// Leggi progresso in-corso da Firestore
async function getProgressFromFirestore(uid, date, size) {
    if (!window.firebaseReady || !firebaseDb || !uid) return null;

    const docId = `progress_${date}_${size}`;
    try {
        const doc = await firebaseDb
            .collection('users').doc(uid)
            .collection('progress').doc(docId)
            .get();

        if (doc.exists) {
            const data = doc.data();
            data.gridState = JSON.parse(data.gridState);
            return data;
        }
        return null;
    } catch (err) {
        console.error('Errore lettura progresso Firestore:', err);
        return null;
    }
}

// Rimuovi progresso in-corso da Firestore (dopo completamento)
async function removeProgressFromFirestore(uid, date, size) {
    if (!window.firebaseReady || !firebaseDb || !uid) return;

    const docId = `progress_${date}_${size}`;
    try {
        await firebaseDb
            .collection('users').doc(uid)
            .collection('progress').doc(docId)
            .delete();
    } catch (err) {
        console.error('Errore rimozione progresso Firestore:', err);
    }
}

// Sincronizza dati da localStorage a Firestore (al primo login)
async function syncLocalToFirestore(uid) {
    if (!window.firebaseReady || !firebaseDb || !uid) return;

    let synced = 0;

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key.startsWith('alberi_daily_')) continue;

        const match = key.match(/^alberi_daily_(\d{4}-\d{2}-\d{2})_(\d+)$/);
        if (!match) continue;

        const date = match[1];
        const size = parseInt(match[2]);

        try {
            const data = JSON.parse(localStorage.getItem(key));
            if (data && data.timeSeconds !== undefined) {
                const existing = await getCompletionFromFirestore(uid, date, size);
                if (!existing) {
                    await saveCompletionToFirestore(uid, date, size, data.timeSeconds, data.completedOn);
                    synced++;
                }
            }
        } catch (e) { /* ignora */ }
    }

    if (synced > 0) {
        console.log(`Sincronizzati ${synced} completamenti da localStorage a Firestore.`);
    }
}

// Controlla se un livello e' completato (Firestore o localStorage)
async function isLevelCompleted(date, size) {
    const localData = localStorage.getItem(`alberi_daily_${date}_${size}`);
    if (localData) return JSON.parse(localData);

    if (currentUser && window.firebaseReady) {
        const firestoreData = await getCompletionFromFirestore(currentUser.uid, date, size);
        if (firestoreData) {
            const local = {
                date: firestoreData.date,
                timeSeconds: firestoreData.timeSeconds,
                size: firestoreData.size
            };
            if (firestoreData.completedOn) local.completedOn = firestoreData.completedOn;
            localStorage.setItem(`alberi_daily_${date}_${size}`, JSON.stringify(local));
            return firestoreData;
        }
    }

    return null;
}

// ============================================================
// CLASSIFICA
// ============================================================

const LEADERBOARD_TOP = 20;
const LEADERBOARD_RANK_SCAN_CAP = 200; // senza count(): conta al massimo 200 tempi migliori
let _leaderboardRequestId = 0; // ignora risposte di tab non piu' selezionate

function formatLeaderboardTime(value) {
    const secs = Math.max(0, Math.floor(Number(value) || 0));
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

async function loadLeaderboard(date, size) {
    const content = document.getElementById('leaderboard-content');
    if (!content) return;
    const requestId = ++_leaderboardRequestId;

    content.innerHTML = `<p>${escapeHtml(t('lb.loading'))}</p>`;

    if (!window.firebaseReady || !firebaseDb) {
        content.innerHTML = `<p>${escapeHtml(t('lb.unavailable'))}</p>`;
        return;
    }

    let entries = [];
    try {
        const snapshot = await firebaseDb
            .collection('leaderboard')
            .where('date', '==', date)
            .where('size', '==', size)
            .orderBy('timeSeconds', 'asc')
            .limit(LEADERBOARD_TOP)
            .get();
        if (requestId !== _leaderboardRequestId) return;

        snapshot.forEach(doc => entries.push(doc.data()));

        if (entries.length === 0) {
            content.innerHTML = `<p style="color: #999; padding: 1rem;">${escapeHtml(t('lb.empty'))}</p>`;
            return;
        }

        let html = '<div class="leaderboard-list">';
        entries.forEach((entry, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
            const isMe = currentUser && entry.uid === currentUser.uid;
            // Nickname e' un dato utente: SEMPRE escapato (XSS)
            html += `
                <div class="leaderboard-row ${isMe ? 'leaderboard-me' : ''}">
                    <span class="leaderboard-rank">${medal}</span>
                    <span class="leaderboard-name">${escapeHtml(entry.nickname || t('lb.anonymous'))}</span>
                    <span class="leaderboard-time">${formatLeaderboardTime(entry.timeSeconds)}</span>
                </div>
            `;
        });
        html += '</div>';
        content.innerHTML = html;
    } catch (err) {
        console.error('Errore caricamento classifica:', err);
        if (requestId === _leaderboardRequestId) {
            content.innerHTML = `<p>${escapeHtml(t('lb.error'))}</p>`;
        }
        return;
    }

    // Fuori dalla top 20: riga separata con la mia posizione. Se fallisce
    // (es. indice mancante) resta visibile solo la top 20.
    const inTop = currentUser && entries.some(e => e.uid === currentUser.uid);
    if (currentUser && !inTop && entries.length >= LEADERBOARD_TOP) {
        try {
            const mine = await getMyLeaderboardRank(date, size, currentUser.uid);
            if (!mine || requestId !== _leaderboardRequestId) return;
            const rankText = mine.capped ? `>${LEADERBOARD_RANK_SCAN_CAP}` : `${mine.rank}.`;
            content.insertAdjacentHTML('beforeend', `
                <div class="leaderboard-separator">⋯</div>
                <div class="leaderboard-row leaderboard-me leaderboard-mine">
                    <span class="leaderboard-rank">${escapeHtml(rankText)}</span>
                    <span class="leaderboard-name">${escapeHtml(mine.nickname || t('lb.anonymous'))} <small>(${escapeHtml(t('lb.you'))})</small></span>
                    <span class="leaderboard-time">${formatLeaderboardTime(mine.timeSeconds)}</span>
                </div>
            `);
        } catch (err) {
            console.warn('Posizione in classifica non disponibile:', err && (err.code || err.message));
        }
    }
}

// Posizione dell'utente = 1 + quanti hanno un tempo strettamente minore.
// Usa count() se l'SDK lo offre (il compat 10.12 non lo espone), altrimenti
// legge al massimo LEADERBOARD_RANK_SCAN_CAP documenti.
// Indice: lo stesso della top 20 (date ==, size ==, timeSeconds), vedi firestore.indexes.json.
async function getMyLeaderboardRank(date, size, uid) {
    const myDoc = await firebaseDb.collection('leaderboard').doc(`${date}_${size}_${uid}`).get();
    if (!myDoc.exists) return null;
    const me = myDoc.data();
    const mySeconds = Number(me.timeSeconds);
    if (!isFinite(mySeconds)) return null;

    const faster = firebaseDb
        .collection('leaderboard')
        .where('date', '==', date)
        .where('size', '==', size)
        .where('timeSeconds', '<', mySeconds);

    let ahead;
    let capped = false;
    if (typeof faster.count === 'function') {
        const agg = await faster.count().get();
        ahead = agg.data().count;
    } else {
        const snap = await faster.limit(LEADERBOARD_RANK_SCAN_CAP).get();
        ahead = snap.size;
        capped = ahead >= LEADERBOARD_RANK_SCAN_CAP;
    }
    return { rank: ahead + 1, capped: capped, timeSeconds: mySeconds, nickname: me.nickname };
}

function showLeaderboardModal() {
    const modal = document.getElementById('leaderboard-modal');
    if (!modal) return;
    modal.classList.add('show');

    // Render tab per ogni taglia (12x12 solo se la data e' una domenica)
    const tabsEl = document.getElementById('leaderboard-size-tabs');
    tabsEl.innerHTML = '';
    const sizes = [5, 6, 7, 8, 9, 10];
    if (parseLocalDate(todayStr).getDay() === 0) sizes.push(12);
    const initialSize = sizes.indexOf(currentSize) !== -1 ? currentSize : 5;

    sizes.forEach(size => {
        const btn = document.createElement('button');
        btn.className = 'btn secondary btn-small leaderboard-tab';
        btn.textContent = `${size}x${size}`;
        if (size === initialSize) btn.classList.add('active');
        btn.onclick = () => {
            tabsEl.querySelectorAll('.leaderboard-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadLeaderboard(todayStr, size);
        };
        tabsEl.appendChild(btn);
    });

    loadLeaderboard(todayStr, initialSize);
}

function hideLeaderboardModal() {
    const modal = document.getElementById('leaderboard-modal');
    if (modal) modal.classList.remove('show');
}
