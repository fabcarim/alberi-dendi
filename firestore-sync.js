// ============================================================
// FIRESTORE-SYNC.JS - Sincronizzazione progressi con Firestore
// ============================================================

// Salva un completamento su Firestore
async function saveCompletionToFirestore(uid, date, size, timeSeconds) {
    if (!window.firebaseReady || !firebaseDb || !uid) return;

    const docId = `${date}_${size}`;
    try {
        await firebaseDb
            .collection('users').doc(uid)
            .collection('completions').doc(docId)
            .set({
                date: date,
                size: size,
                timeSeconds: timeSeconds,
                completedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
    } catch (err) {
        console.error('Errore salvataggio Firestore:', err);
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

        if (doc.exists) {
            return doc.data();
        }
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

    const sizes = [5, 6, 7, 8, 9, 10, 12];
    let synced = 0;

    // Scansiona localStorage per completamenti
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key.startsWith('alberi_daily_')) continue;

        // formato: alberi_daily_YYYY-MM-DD_SIZE
        const match = key.match(/^alberi_daily_(\d{4}-\d{2}-\d{2})_(\d+)$/);
        if (!match) continue;

        const date = match[1];
        const size = parseInt(match[2]);

        try {
            const data = JSON.parse(localStorage.getItem(key));
            if (data && data.timeSeconds !== undefined) {
                // Controlla se esiste gia' su Firestore
                const existing = await getCompletionFromFirestore(uid, date, size);
                if (!existing) {
                    await saveCompletionToFirestore(uid, date, size, data.timeSeconds);
                    synced++;
                }
            }
        } catch (e) {
            // Ignora dati corrotti
        }
    }

    // Sincronizza username
    const savedName = localStorage.getItem('alberi_username');
    if (savedName) {
        try {
            await firebaseDb.collection('users').doc(uid).set({
                username: savedName
            }, { merge: true });
        } catch (e) {
            // Ignora
        }
    }

    if (synced > 0) {
        console.log(`Sincronizzati ${synced} completamenti da localStorage a Firestore.`);
    }
}

// Controlla se un livello e' completato (Firestore o localStorage)
async function isLevelCompleted(date, size) {
    // Prima controlla localStorage (veloce)
    const localData = localStorage.getItem(`alberi_daily_${date}_${size}`);
    if (localData) return JSON.parse(localData);

    // Se loggato, controlla Firestore
    if (currentUser && window.firebaseReady) {
        const firestoreData = await getCompletionFromFirestore(currentUser.uid, date, size);
        if (firestoreData) {
            // Cache in localStorage per accesso rapido
            localStorage.setItem(`alberi_daily_${date}_${size}`, JSON.stringify({
                date: firestoreData.date,
                timeSeconds: firestoreData.timeSeconds,
                size: firestoreData.size
            }));
            return firestoreData;
        }
    }

    return null;
}
