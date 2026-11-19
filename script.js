// Game State
let currentLevel = null;
let currentSize = 5;
let gridState = [];
let isGameActive = false;
let gameTimer = null;
let startTime = 0;
let elapsedTime = 0;
let todayStr = "";
let isTimerRunning = false;
let lastStatus = null; // ultimo messaggio di stato {key, params, cls} per ritradurlo al cambio lingua

const VALID_SIZES = [5, 6, 7, 8, 9, 10, 12];

// DOM Elements
const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status-msg');
const btnCheck = document.getElementById('btn-check');
const btnReset = document.getElementById('btn-reset');
const dateDisplayEl = document.getElementById('date-display');
const timerDisplayEl = document.getElementById('timer-display');
const shareContainer = document.getElementById('share-container');
const btnShare = document.getElementById('btn-share');
const sizeSelectorEl = document.getElementById('size-selector');

// Archive System
const archiveDateEl = document.getElementById('archive-date');
const archiveLabel = document.getElementById('archive-label');
const mainTitleEl = document.getElementById('main-title');
const mainSubtitleEl = document.getElementById('main-subtitle');

// Messaggio di stato tradotto (memorizzato per il cambio lingua)
function setStatus(key, params, cls) {
    lastStatus = { key: key, params: params || null, cls: cls || '' };
    statusEl.textContent = t(key, params);
    statusEl.className = 'game-status' + (cls ? ' ' + cls : '');
}

// Primo giorno dell'archivio (6 mesi fa), in ora locale
function getArchiveMinDateStr() {
    const minDate = new Date();
    minDate.setMonth(minDate.getMonth() - 6);
    return localDateStr(minDate);
}

// La sfida 12x12 e' disponibile la domenica (dalle 09:00 se e' oggi)
function isWeeklyUnlocked(dateStr) {
    const isSunday = parseLocalDate(dateStr).getDay() === 0;
    if (!isSunday) return false;
    const realtimeNow = new Date();
    if (dateStr === localDateStr(realtimeNow)) return realtimeNow.getHours() >= 9;
    return true;
}

// Link condiviso: ?d=YYYY-MM-DD&s=N -> apri direttamente quel puzzle se la data
// e' dentro l'archivio. Ritorna { date, size } oppure null.
function readSharedPuzzleParams() {
    try {
        const params = new URLSearchParams(window.location.search);
        const d = params.get('d');
        const sParam = parseInt(params.get('s'), 10);
        if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d) || isNaN(parseLocalDate(d).getTime())) return null;
        if (localDateStr(parseLocalDate(d)) !== d) return null; // es. 2026-02-31
        if (d < getArchiveMinDateStr() || d > localDateStr()) return null;
        let size = VALID_SIZES.indexOf(sParam) !== -1 ? sParam : 5;
        // 12x12: la generazione blocca la pagina per ~1 minuto o piu' (generatore
        // invariato): a chi arriva da un link non la apriamo in automatico, atterra
        // sulla data giusta col 5x5 e il pulsante 12x12 e' a un tap.
        if (size === 12) size = 5;
        return { date: d, size: size };
    } catch (e) {
        return null;
    }
}

// Initialize
function init() {
    const realtimeTodayStr = localDateStr();
    todayStr = realtimeTodayStr;

    const shared = readSharedPuzzleParams();
    if (shared) todayStr = shared.date;

    if (archiveDateEl) {
        archiveDateEl.max = realtimeTodayStr;
        archiveDateEl.min = getArchiveMinDateStr();
        archiveDateEl.value = todayStr;

        archiveDateEl.addEventListener('change', (e) => {
            if (!e.target.value) {
                e.target.value = realtimeTodayStr;
            }
            todayStr = e.target.value;
            const nextSize = currentSize === 12 ? 10 : currentSize;
            loadDailyLevel(nextSize);
        });
    }

    btnCheck.addEventListener('click', checkSolution);
    btnReset.addEventListener('click', resetLevel);
    btnShare.addEventListener('click', shareResult);
    document.getElementById('btn-leaderboard').addEventListener('click', showLeaderboardModal);

    // Cambio lingua: ritraduci le parti generate da JS
    document.addEventListener('alberi:langchange', refreshDynamicTexts);

    const initialSize = shared ? shared.size : 5;
    currentSize = initialSize;
    renderSizeSelector();
    loadDailyLevel(initialSize);

    // Analytics: app_open
    try {
        const referral = (typeof getReferralSource === 'function') ? getReferralSource() : null;
        const params = new URLSearchParams(window.location.search);
        const openParams = {
            referrer: document.referrer || '',
            utm_source: params.get('utm_source') || '',
            utm_medium: params.get('utm_medium') || '',
            utm_campaign: params.get('utm_campaign') || ''
        };
        if (referral) openParams.referral_source = referral;
        if (typeof trackEvent === 'function') trackEvent('app_open', openParams);
    } catch (e) { /* silent */ }
}

function renderSizeSelector() {
    sizeSelectorEl.innerHTML = '';
    const sizes = [5, 6, 7, 8, 9, 10];

    sizes.forEach(size => {
        const btn = document.createElement('button');
        btn.className = 'btn secondary size-btn';
        btn.textContent = `${size}x${size}`;
        btn.dataset.size = size;

        const savedData = localStorage.getItem(`alberi_daily_${todayStr}_${size}`);
        if (savedData) {
            btn.classList.add('completed');
            btn.textContent += ' ✅';
        }

        if (size === currentSize) {
            btn.classList.add('active');
        }

        btn.onclick = () => {
            loadDailyLevel(size);
        };

        sizeSelectorEl.appendChild(btn);
    });

    // Sfida Settimanale (12x12) - data in ora locale
    const isUnlocked = isWeeklyUnlocked(todayStr);

    const weeklyBtn = document.createElement('button');
    weeklyBtn.className = 'btn secondary size-btn special-btn';
    weeklyBtn.dataset.size = 12;
    weeklyBtn.style.fontWeight = 'bold';

    const savedDataWeekly = localStorage.getItem(`alberi_daily_${todayStr}_12`);
    if (savedDataWeekly) {
        weeklyBtn.classList.add('completed');
        weeklyBtn.innerHTML = '12x12 ✅';
    } else {
        if (isUnlocked) {
            weeklyBtn.innerHTML = '12x12 🌟';
            weeklyBtn.style.color = '#e67e22';
            weeklyBtn.style.borderColor = '#e67e22';
        } else {
            weeklyBtn.innerHTML = '12x12 🔒';
            weeklyBtn.style.opacity = '0.7';
        }
    }

    if (currentSize === 12) {
        weeklyBtn.classList.add('active');
        weeklyBtn.style.backgroundColor = '#e67e22';
        weeklyBtn.style.color = 'white';
    }

    weeklyBtn.onclick = () => {
        if (!isUnlocked && !savedDataWeekly) {
            setStatus('status.weeklyLocked', null, 'error');
            return;
        }
        loadDailyLevel(12);
    };

    sizeSelectorEl.appendChild(weeklyBtn);
}

// Titolo/sottotitolo: oggi oppure archivio (data formattata nella lingua scelta)
function updateHeaderTitle() {
    const realtimeTodayStr = localDateStr();

    if (todayStr === realtimeTodayStr) {
        if (mainTitleEl) mainTitleEl.textContent = t('app.title');
        if (mainSubtitleEl) mainSubtitleEl.textContent = t('app.subtitle');
    } else {
        if (mainTitleEl) mainTitleEl.textContent = t('app.archiveTitle');
        const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateFormatted = parseLocalDate(todayStr).toLocaleDateString(getLocale(), opts);
        if (mainSubtitleEl) mainSubtitleEl.innerHTML = t('app.archiveSubtitle', { date: escapeHtml(dateFormatted) });
    }
}

// Dopo il cambio lingua: rigenera i testi dinamici senza ricaricare il livello
function refreshDynamicTexts() {
    updateHeaderTitle();
    renderSizeSelector();
    if (lastStatus) setStatus(lastStatus.key, lastStatus.params, lastStatus.cls);
    if (typeof updateAuthUI === 'function') updateAuthUI(currentUser);
}

// ============================================================
// Generazione del puzzle
// ============================================================
// Il 12x12 e' lento da generare (secondi, a volte decine di secondi):
//  1. se la domenica e' nella tabella precalcolata (levels12.js) e' istantaneo;
//  2. altrimenti lo genera un Web Worker, senza bloccare la pagina;
//  3. se i Worker non sono disponibili, si genera nella pagina come prima.
// In tutti i casi il puzzle e' identico (stesso generatore, stesso seed).
let _genWorker = null;
let _genRequestId = 0;
const _genPending = {};

function getGenWorker() {
    if (_genWorker === null) {
        try {
            _genWorker = new Worker('gen-worker.js');
            _genWorker.onmessage = (e) => {
                const p = _genPending[e.data.id];
                if (!p) return;
                delete _genPending[e.data.id];
                if (e.data.error) p.reject(new Error(e.data.error));
                else p.resolve(e.data.level);
            };
            _genWorker.onerror = () => {
                Object.keys(_genPending).forEach(id => {
                    _genPending[id].reject(new Error('worker'));
                    delete _genPending[id];
                });
                _genWorker = false;
            };
        } catch (e) {
            _genWorker = false;
        }
    }
    return _genWorker || null;
}

function getLevel(size, date) {
    const seed = `${date}_${size}`;
    if (size === 12 && window.PRECOMPUTED_12 && window.PRECOMPUTED_12[date]) {
        return Promise.resolve({
            id: 'daily_' + seed,
            name: 'Livello del Giorno',
            size: 12,
            treesPerLine: 1,
            regions: window.PRECOMPUTED_12[date]
        });
    }
    if (size >= 12) {
        const worker = getGenWorker();
        if (worker) {
            const id = ++_genRequestId;
            return new Promise((resolve, reject) => {
                _genPending[id] = { resolve, reject };
                worker.postMessage({ id, size, seed });
            }).catch(() => window.LevelGenerator.generate(size, seed));
        }
    }
    return Promise.resolve(window.LevelGenerator.generate(size, seed));
}

async function loadDailyLevel(size) {
    currentSize = size;
    const requestedDate = todayStr;

    updateHeaderTitle();

    if (archiveDateEl) archiveDateEl.style.display = 'inline-block';
    if (archiveLabel) archiveLabel.style.display = 'inline';
    if (dateDisplayEl) dateDisplayEl.style.display = 'none';

    if (shareContainer) shareContainer.style.display = 'none';
    btnCheck.style.display = 'inline-block';
    btnReset.style.display = 'inline-block';

    document.querySelectorAll('.size-btn').forEach(b => {
        b.classList.remove('active');
        if (parseInt(b.dataset.size) === size) b.classList.add('active');
    });

    // Check if already completed
    const completedData = await isLevelCompleted(todayStr, size);

    // Il 12x12 fuori tabella puo' richiedere tempo: mostra un messaggio e
    // blocca la griglia vecchia finche' il nuovo puzzle non e' pronto.
    const slow = size >= 12 && !(window.PRECOMPUTED_12 && window.PRECOMPUTED_12[todayStr]);
    if (slow) {
        stopTimer();
        isGameActive = false;
        boardEl.classList.add('disabled');
        boardEl.style.opacity = '0.4';
        setStatus('status.generating', null, '');
    }

    const level = await getLevel(size, requestedDate);

    // Nel frattempo l'utente ha cambiato misura o data: ignora questo risultato
    if (currentSize !== size || todayStr !== requestedDate) return;

    if (completedData) {
        showCompletedState(completedData, size, level);
        return;
    }

    loadLevel(level);

    // Analytics: puzzle_start
    try {
        const realtimeStr = localDateStr();
        if (typeof trackEvent === 'function') {
            trackEvent('puzzle_start', {
                size: size,
                date: todayStr,
                is_archive: todayStr !== realtimeStr
            });
        }
    } catch (e) { /* silent */ }

    // Load progress
    let progressLoaded = false;
    const progressData = localStorage.getItem(`alberi_progress_${todayStr}_${size}`);
    if (progressData) {
        try {
            const p = JSON.parse(progressData);
            gridState = p.gridState;
            elapsedTime = p.elapsedTime;
            for (let r = 0; r < size; r++) {
                for (let c = 0; c < size; c++) {
                    updateCellVisual(r, c, gridState[r][c]);
                }
            }
            startTimer(true);
            progressLoaded = true;
        } catch (e) { /* ignore */ }
    }

    if (!progressLoaded && currentUser && window.firebaseReady) {
        try {
            const firestoreProgress = await getProgressFromFirestore(currentUser.uid, todayStr, size);
            if (firestoreProgress) {
                gridState = firestoreProgress.gridState;
                elapsedTime = firestoreProgress.elapsedTime;
                for (let r = 0; r < size; r++) {
                    for (let c = 0; c < size; c++) {
                        updateCellVisual(r, c, gridState[r][c]);
                    }
                }
                startTimer(true);
                progressLoaded = true;
            }
        } catch (e) { /* ignore */ }
    }

    if (!progressLoaded) {
        startTimer(false);
    }
}

function loadLevel(level) {
    currentLevel = level;
    isGameActive = true;

    gridState = Array(level.size).fill().map(() => Array(level.size).fill(0));

    boardEl.innerHTML = '';
    boardEl.classList.remove('disabled');
    boardEl.style.opacity = '1';
    setStatus(level.treesPerLine > 1 ? 'status.placeMany' : 'status.placeOne', { n: level.treesPerLine });

    boardEl.style.gridTemplateColumns = `repeat(${level.size}, 1fr)`;

    for (let r = 0; r < level.size; r++) {
        for (let c = 0; c < level.size; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');

            const regionId = level.regions[r][c];
            cell.classList.add(`region-${regionId % 8}`);

            if (c < level.size - 1 && level.regions[r][c + 1] !== regionId) {
                cell.classList.add('border-right-thick');
            }
            if (r < level.size - 1 && level.regions[r + 1][c] !== regionId) {
                cell.classList.add('border-bottom-thick');
            }

            cell.dataset.row = r;
            cell.dataset.col = c;

            cell.addEventListener('mousedown', (e) => handleCellClick(e, r, c));
            cell.addEventListener('contextmenu', (e) => e.preventDefault());

            boardEl.appendChild(cell);
        }
    }
}

function saveProgress() {
    if (!isGameActive) return;
    const progress = {
        gridState: gridState,
        elapsedTime: elapsedTime
    };
    localStorage.setItem(`alberi_progress_${todayStr}_${currentSize}`, JSON.stringify(progress));

    // Throttle (non debounce): il timer chiama saveProgress ogni secondo,
    // quindi un debounce veniva azzerato di continuo e il salvataggio
    // su Firestore non partiva mai durante la partita.
    if (currentUser && window.firebaseReady && !window._firestoreProgressTimer) {
        const date = todayStr, size = currentSize;
        window._firestoreProgressTimer = setTimeout(() => {
            window._firestoreProgressTimer = null;
            if (!isGameActive || !currentUser || todayStr !== date || currentSize !== size) return;
            saveProgressToFirestore(currentUser.uid, date, size, gridState, elapsedTime);
        }, 15000);
    }
}

function startTimer(resume = false) {
    if (gameTimer) clearInterval(gameTimer);
    gameTimer = null;
    isTimerRunning = false;

    if (!resume) elapsedTime = 0;
    updateTimerDisplay(elapsedTime);
}

function resumeTimer() {
    if (isTimerRunning) return;
    isTimerRunning = true;

    startTime = Date.now() - (elapsedTime * 1000);

    gameTimer = setInterval(() => {
        if (!isGameActive) return;
        const now = Date.now();
        elapsedTime = Math.floor((now - startTime) / 1000);
        updateTimerDisplay(elapsedTime);
        saveProgress();
    }, 1000);
}

function updateTimerDisplay(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    timerDisplayEl.textContent = `${m}:${s}`;
}

function stopTimer() {
    if (gameTimer) clearInterval(gameTimer);
    gameTimer = null;
    isTimerRunning = false;
}

function resetLevel() {
    if (!currentLevel) return;
    if (localStorage.getItem(`alberi_daily_${todayStr}_${currentSize}`)) return;

    gridState = Array(currentLevel.size).fill().map(() => Array(currentLevel.size).fill(0));
    Array.from(boardEl.children).forEach(cell => {
        cell.classList.remove('tree', 'cross', 'error');
    });
    setStatus('status.reset');
    saveProgress();
}

function handleCellClick(e, r, c) {
    if (!isGameActive) return;

    if (!isTimerRunning) {
        resumeTimer();
    }

    let currentVal = gridState[r][c];

    if (e.type === 'contextmenu') e.preventDefault();

    if (e.button === 0) {
        if (currentVal === 0) currentVal = 2;
        else if (currentVal === 2) currentVal = 1;
        else currentVal = 0;
    } else if (e.button === 2) {
        e.preventDefault();
        if (currentVal === 2) currentVal = 0;
        else currentVal = 2;
    }

    gridState[r][c] = currentVal;
    updateCellVisual(r, c, currentVal);
    saveProgress();
}

function updateCellVisual(r, c, val) {
    const index = r * currentLevel.size + c;
    const cell = boardEl.children[index];

    cell.classList.remove('tree', 'cross', 'error');
    if (val === 1) cell.classList.add('tree');
    if (val === 2) cell.classList.add('cross');
}

function checkSolution() {
    if (!currentLevel || !isGameActive) return;

    const size = currentLevel.size;
    const target = currentLevel.treesPerLine;
    let errors = [];

    const addError = (r, c) => {
        const index = r * size + c;
        boardEl.children[index].classList.add('error');
    };

    for (let r = 0; r < size; r++) {
        let count = 0;
        for (let c = 0; c < size; c++) if (gridState[r][c] === 1) count++;
        if (count !== target) {
            for (let c = 0; c < size; c++) addError(r, c);
            errors.push(`Riga ${r + 1}`);
        }
    }
    for (let c = 0; c < size; c++) {
        let count = 0;
        for (let r = 0; r < size; r++) if (gridState[r][c] === 1) count++;
        if (count !== target) {
            for (let r = 0; r < size; r++) addError(r, c);
            errors.push(`Colonna ${c + 1}`);
        }
    }
    let regionCounts = {};
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            const regId = currentLevel.regions[r][c];
            if (!regionCounts[regId]) regionCounts[regId] = 0;
            if (gridState[r][c] === 1) regionCounts[regId]++;
        }
    }
    for (let regId in regionCounts) {
        if (regionCounts[regId] !== target) {
            for (let r = 0; r < size; r++) {
                for (let c = 0; c < size; c++) {
                    if (currentLevel.regions[r][c] == regId) addError(r, c);
                }
            }
            errors.push(`Area ${regId}`);
        }
    }
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (gridState[r][c] !== 1) continue;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                        if (gridState[nr][nc] === 1) {
                            addError(r, c);
                            addError(nr, nc);
                            errors.push("Adiacenza");
                        }
                    }
                }
            }
        }
    }

    if (errors.length === 0) {
        handleWin();
    } else {
        setStatus('status.errors', null, 'error');
    }
}

function handleWin() {
    stopTimer();
    isGameActive = false;
    triggerConfetti();
    setStatus('status.win', { size: currentSize }, 'success');

    const result = {
        date: todayStr,
        timeSeconds: elapsedTime,
        size: currentSize
    };
    localStorage.setItem(`alberi_daily_${todayStr}_${currentSize}`, JSON.stringify(result));
    localStorage.removeItem(`alberi_progress_${todayStr}_${currentSize}`);

    if (currentUser && window.firebaseReady) {
        saveCompletionToFirestore(currentUser.uid, todayStr, currentSize, elapsedTime);
        removeProgressFromFirestore(currentUser.uid, todayStr, currentSize);
    }

    renderSizeSelector();
    showShareUI();

    boardEl.classList.add('disabled');

    // Anonimo senza nickname: proponi il nickname per la classifica (con "salta")
    if (typeof maybePromptNicknameAfterWin === 'function') maybePromptNicknameAfterWin();

    // Analytics: puzzle_complete
    try {
        const realtimeStr = localDateStr();
        if (typeof trackEvent === 'function') {
            trackEvent('puzzle_complete', {
                size: currentSize,
                date: todayStr,
                time_seconds: elapsedTime,
                is_archive: todayStr !== realtimeStr
            });
        }
    } catch (e) { /* silent */ }
}

function showCompletedState(data, size, level) {
    loadLevel(level);

    isGameActive = false;
    boardEl.classList.add('disabled');
    boardEl.style.opacity = '0.6';

    setStatus('status.alreadyDone', { size: size, time: formatTime(data.timeSeconds) }, 'success');

    // Il tempo condiviso deve essere quello del completamento salvato
    elapsedTime = data.timeSeconds;
    updateTimerDisplay(data.timeSeconds);
    showShareUI();
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function showShareUI() {
    btnCheck.style.display = 'none';
    btnReset.style.display = 'none';
    shareContainer.style.display = 'block';
}

// URL di condivisione: UTM per attribuzione + d/s per aprire lo stesso puzzle
function buildShareUrl() {
    const ref = (currentUser && currentUser.uid) ? currentUser.uid : 'anon';
    const baseUrl = window.location.origin + window.location.pathname;
    return baseUrl + '?utm_source=share&utm_medium=user&utm_campaign=alberi_daily' +
        '&ref=' + encodeURIComponent(ref) +
        '&d=' + encodeURIComponent(todayStr) +
        '&s=' + encodeURIComponent(currentSize);
}

// Testo di condivisione spoiler-free: la barra di quadratini e' fissa
// (lunga quanto la misura della griglia) e non rivela nessuna posizione.
function buildShareText(shareUrl) {
    const dateObj = parseLocalDate(todayStr);
    const dateShort = getLang() === 'it'
        ? dateObj.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
        : dateObj.toLocaleDateString(getLocale(), { month: 'short', day: 'numeric' });

    const title = currentSize === 12
        ? t('share.titleWeekly', { date: dateShort })
        : t('share.title', { size: currentSize, date: dateShort });
    const bar = '🟩'.repeat(currentSize);

    return `${title}\n${t('share.time', { time: formatTime(elapsedTime) })}\n${bar}\n${shareUrl}`;
}

function shareResult() {
    const shareUrl = buildShareUrl();
    // Link DENTRO il testo: alcune app scartano `url` quando c'e' anche `text`
    const text = buildShareText(shareUrl);

    const logShare = (method) => {
        try {
            if (typeof trackEvent === 'function') {
                trackEvent('share_tap', {
                    size: currentSize,
                    date: todayStr,
                    method: method
                });
            }
        } catch (e) { /* silent */ }
    };

    if (navigator.share) {
        navigator.share({ text: text }).then(() => {
            logShare('native');
        }).catch((err) => {
            // Annullato dall'utente: niente fallback (non e' una condivisione)
            if (err && err.name === 'AbortError') return;
            copyToClipboard(text);
            logShare('clipboard');
        });
    } else {
        copyToClipboard(text);
        logShare('clipboard');
    }
}

function showCopiedFeedback() {
    btnShare.textContent = t('btn.copied');
    btnShare.style.backgroundColor = "#27ae60";
    setTimeout(() => {
        btnShare.textContent = t('btn.share');
        btnShare.style.backgroundColor = "#3498db";
    }, 2000);
}

function copyToClipboard(text) {
    // Fallback per browser senza Clipboard API (o contesto non sicuro)
    const legacyCopy = () => {
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(ta);
            if (ok) showCopiedFeedback();
        } catch (e) { /* ignora */ }
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(showCopiedFeedback).catch(legacyCopy);
    } else {
        legacyCopy();
    }
}

function triggerConfetti() {
    if (typeof confetti === 'function') {
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 }
        });
    }
}

// Start
init();
initAuth();
