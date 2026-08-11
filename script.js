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

// Initialize
function init() {
    const now = new Date();
    const realtimeTodayStr = now.toISOString().split('T')[0];
    todayStr = realtimeTodayStr;

    if (archiveDateEl) {
        archiveDateEl.max = realtimeTodayStr;
        const minDate = new Date();
        minDate.setMonth(minDate.getMonth() - 6);
        archiveDateEl.min = minDate.toISOString().split('T')[0];
        archiveDateEl.value = realtimeTodayStr;

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

    renderSizeSelector();
    loadDailyLevel(5);

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

    // Sfida Settimanale (12x12)
    const dateObj = new Date(todayStr);
    const isSunday = dateObj.getDay() === 0;

    const realtimeNow = new Date();
    const realtimeTodayStr = realtimeNow.toISOString().split('T')[0];
    const isToday = todayStr === realtimeTodayStr;
    let isUnlocked = false;

    if (isSunday) {
        if (isToday) {
            if (realtimeNow.getHours() >= 9) isUnlocked = true;
        } else {
            isUnlocked = true;
        }
    }

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
            statusEl.textContent = "La Sfida Speciale si sblocca Domenica alle 09:00!";
            statusEl.className = "game-status error";
            return;
        }
        loadDailyLevel(12);
    };

    sizeSelectorEl.appendChild(weeklyBtn);
}

async function loadDailyLevel(size) {
    currentSize = size;

    const realtimeNow = new Date();
    const realtimeTodayStr = realtimeNow.toISOString().split('T')[0];

    if (todayStr === realtimeTodayStr) {
        if (mainTitleEl) mainTitleEl.textContent = "Alberi Daily 🌲";
        if (mainSubtitleEl) mainSubtitleEl.textContent = "Un nuovo puzzle ogni giorno!";
    } else {
        if (mainTitleEl) mainTitleEl.textContent = "Alberi Daily - Archivio 📅";
        const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateFormatted = new Date(todayStr).toLocaleDateString('it-IT', opts);
        if (mainSubtitleEl) mainSubtitleEl.innerHTML = `Stai giocando nel passato: <strong>${dateFormatted}</strong>`;
    }

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

    if (completedData) {
        showCompletedState(completedData, size);
        return;
    }

    const seed = `${todayStr}_${size}`;
    const level = window.LevelGenerator.generate(size, seed);
    loadLevel(level);

    // Analytics: puzzle_start
    try {
        const realtimeStr = new Date().toISOString().split('T')[0];
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
    statusEl.textContent = `Posiziona ${level.treesPerLine} alber${level.treesPerLine > 1 ? 'i' : 'o'} per riga, colonna e area.`;
    statusEl.className = 'game-status';

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

    if (currentUser && window.firebaseReady) {
        clearTimeout(window._firestoreProgressTimer);
        window._firestoreProgressTimer = setTimeout(() => {
            saveProgressToFirestore(currentUser.uid, todayStr, currentSize, gridState, elapsedTime);
        }, 3000);
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
    statusEl.textContent = "Livello ricominciato.";
    statusEl.className = 'game-status';
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
        statusEl.textContent = "Ci sono errori. Controlla le caselle rosse.";
        statusEl.className = "game-status error";
    }
}

function handleWin() {
    stopTimer();
    isGameActive = false;
    triggerConfetti();
    statusEl.textContent = `Fantastico! Hai completato il livello ${currentSize}x${currentSize}! 🎉`;
    statusEl.className = "game-status success";

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

    // Analytics: puzzle_complete
    try {
        const realtimeStr = new Date().toISOString().split('T')[0];
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

function showCompletedState(data, size) {
    const seed = `${todayStr}_${size}`;
    const level = window.LevelGenerator.generate(size, seed);

    loadLevel(level);

    isGameActive = false;
    boardEl.classList.add('disabled');
    boardEl.style.opacity = '0.6';

    statusEl.textContent = `Hai gia' completato il livello ${size}x${size}! Tempo: ${formatTime(data.timeSeconds)} 🌟`;
    statusEl.className = "game-status success";

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

function shareResult() {
    const name = (currentUser && currentUser.displayName) || 'Un giocatore';
    const timeStr = formatTime(elapsedTime);
    const playDate = new Date(todayStr).toLocaleDateString('it-IT');

    let levelTitle = `l'Alberi Daily (${currentSize}x${currentSize})`;
    if (currentSize === 12) {
        levelTitle = `la Sfida Domenicale (12x12)`;
    }

    // Costruisci URL con parametri UTM per attribuzione K-factor
    const ref = (currentUser && currentUser.uid) ? currentUser.uid : 'anon';
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = baseUrl + '?utm_source=share&utm_medium=user&utm_campaign=alberi_daily&ref=' + encodeURIComponent(ref);

    const text = `Ho risolto ${levelTitle} del ${playDate} in ${timeStr}! 🌲\nGiocatore: ${name}\n#AlberiDaily`;

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
        navigator.share({
            title: 'Alberi Daily',
            text: text,
            url: shareUrl
        }).then(() => {
            logShare('native');
        }).catch(() => {
            copyToClipboard(text + '\n' + shareUrl);
            logShare('clipboard');
        });
    } else {
        copyToClipboard(text + '\n' + shareUrl);
        logShare('clipboard');
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        btnShare.textContent = "Copiato!";
        btnShare.style.backgroundColor = "#27ae60";
        setTimeout(() => {
            btnShare.textContent = "Condividi Risultato 📤";
            btnShare.style.backgroundColor = "#3498db";
        }, 2000);
    });
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
