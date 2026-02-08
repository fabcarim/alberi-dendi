// Game State
let currentLevel = null;
let currentSize = 5; // Default start size
let gridState = []; // 0: Empty, 1: Tree, 2: Cross
let isGameActive = false;
let gameTimer = null;
let startTime = 0;
let elapsedTime = 0;
let todayStr = "";

// DOM Elements
const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status-msg');
const btnCheck = document.getElementById('btn-check');
const btnReset = document.getElementById('btn-reset');
const dateDisplayEl = document.getElementById('date-display');
const timerDisplayEl = document.getElementById('timer-display');
const shareContainer = document.getElementById('share-container');
const usernameInput = document.getElementById('username-input');
const btnShare = document.getElementById('btn-share');
const sizeSelectorEl = document.getElementById('size-selector');

// Initialize
function init() {
    // Set Date Display
    const now = new Date();
    todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateDisplayEl.textContent = now.toLocaleDateString('it-IT', options);

    // Setup Events
    btnCheck.addEventListener('click', checkSolution);
    btnReset.addEventListener('click', resetLevel);
    btnShare.addEventListener('click', shareResult);

    // Initialize Size Selector
    renderSizeSelector();

    // Load Default Level (Start with 5x5 or first incomplete)
    loadDailyLevel(5);
}

function renderSizeSelector() {
    sizeSelectorEl.innerHTML = '';
    const sizes = [5, 6, 7, 8, 9, 10];

    sizes.forEach(size => {
        const btn = document.createElement('button');
        btn.className = 'btn secondary size-btn';
        btn.textContent = `${size}x${size}`;
        btn.dataset.size = size;

        // Check completion status
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
}

function loadDailyLevel(size) {
    currentSize = size;
    shareContainer.style.display = 'none';
    btnCheck.style.display = 'inline-block';
    btnReset.style.display = 'inline-block';

    // Update Active Button
    document.querySelectorAll('.size-btn').forEach(b => {
        b.classList.remove('active');
        if (parseInt(b.dataset.size) === size) b.classList.add('active');
    });

    // Check if already completed
    const savedData = localStorage.getItem(`alberi_daily_${todayStr}_${size}`);

    if (savedData) {
        showCompletedState(JSON.parse(savedData), size);
        return;
    }

    // Seeded RNG for this specific size and date
    // Seed = "YYYY-MM-DD_SIZE"
    const seed = `${todayStr}_${size}`;

    // Generate Level
    const level = window.LevelGenerator.generate(size, seed);
    loadLevel(level);

    // Start Timer
    startTimer();
}

function loadLevel(level) {
    currentLevel = level;
    isGameActive = true;

    // Reset State
    gridState = Array(level.size).fill().map(() => Array(level.size).fill(0));

    // Clear Board
    boardEl.innerHTML = '';
    boardEl.classList.remove('disabled');
    boardEl.style.opacity = '1';
    statusEl.textContent = `Posiziona ${level.treesPerLine} alber${level.treesPerLine > 1 ? 'i' : 'o'} per riga, colonna e area.`;
    statusEl.className = 'game-status';

    // Set Grid CSS
    boardEl.style.gridTemplateColumns = `repeat(${level.size}, 1fr)`;

    // Render Cells
    for (let r = 0; r < level.size; r++) {
        for (let c = 0; c < level.size; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');

            // Region styling
            const regionId = level.regions[r][c];
            cell.classList.add(`region-${regionId % 8}`);

            cell.dataset.row = r;
            cell.dataset.col = c;

            // Events
            cell.addEventListener('mousedown', (e) => handleCellClick(e, r, c));
            cell.addEventListener('contextmenu', (e) => e.preventDefault());

            boardEl.appendChild(cell);
        }
    }
}

function startTimer() {
    if (gameTimer) clearInterval(gameTimer);
    startTime = Date.now();
    elapsedTime = 0;
    updateTimerDisplay(0);

    gameTimer = setInterval(() => {
        if (!isGameActive) return;
        const now = Date.now();
        elapsedTime = Math.floor((now - startTime) / 1000);
        updateTimerDisplay(elapsedTime);
    }, 1000);
}

function updateTimerDisplay(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    timerDisplayEl.textContent = `${m}:${s}`;
}

function stopTimer() {
    clearInterval(gameTimer);
}

function resetLevel() {
    if (!currentLevel) return;
    if (localStorage.getItem(`alberi_daily_${todayStr}_${currentSize}`)) return; // Can't reset if already won

    gridState = Array(currentLevel.size).fill().map(() => Array(currentLevel.size).fill(0));
    Array.from(boardEl.children).forEach(cell => {
        cell.classList.remove('tree', 'cross', 'error');
    });
    statusEl.textContent = "Livello ricominciato.";
    statusEl.className = 'game-status';

    // Constructive ambiguity: do we reset timer? 
    // Usually "Reset" in puzzle games keeps the timer running because it's the same attempt session.
    // If we want "pure" speedrun, maybe, but to prevent abuse (click reset to find solution then fast solve),
    // let's keep the timer running.
}

function handleCellClick(e, r, c) {
    if (!isGameActive) return;

    let currentVal = gridState[r][c];

    // Prevent default context menu
    if (e.type === 'contextmenu') e.preventDefault();

    if (e.button === 0) {
        // Left Click: Empty -> Tree -> Empty
        if (currentVal === 1) currentVal = 0;
        else currentVal = 1;
    } else if (e.button === 2) {
        // Right Click: Empty -> Cross -> Empty
        e.preventDefault();
        if (currentVal === 2) currentVal = 0;
        else currentVal = 2;
    }

    gridState[r][c] = currentVal;
    updateCellVisual(r, c, currentVal);
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

    // Validation Logic
    // 1. Rows
    for (let r = 0; r < size; r++) {
        let count = 0;
        for (let c = 0; c < size; c++) if (gridState[r][c] === 1) count++;
        if (count !== target) {
            for (let c = 0; c < size; c++) addError(r, c);
            errors.push(`Riga ${r + 1}`);
        }
    }
    // 2. Cols
    for (let c = 0; c < size; c++) {
        let count = 0;
        for (let r = 0; r < size; r++) if (gridState[r][c] === 1) count++;
        if (count !== target) {
            for (let r = 0; r < size; r++) addError(r, c);
            errors.push(`Colonna ${c + 1}`);
        }
    }
    // 3. Regions
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
    // 4. Adjacency
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

    // Save Result
    const result = {
        date: todayStr,
        timeSeconds: elapsedTime,
        size: currentSize
    };
    localStorage.setItem(`alberi_daily_${todayStr}_${currentSize}`, JSON.stringify(result));

    // Update Selector Status
    renderSizeSelector();

    // Show Share UI
    showShareUI();

    // Disable board interactions (visual only)
    boardEl.classList.add('disabled');
}

function showCompletedState(data, size) {
    // Generate view-only board
    const seed = `${todayStr}_${size}`;
    const level = window.LevelGenerator.generate(size, seed);

    loadLevel(level);

    // Fill with empty/decorative state or just show it empty?
    // Let's just show it empty but "locked".
    // Alternatively, we could save the "moves" to show the completed state, but we didn't save that.
    // So just show the empty board and the time.

    isGameActive = false;
    boardEl.classList.add('disabled');
    boardEl.style.opacity = '0.6';

    statusEl.textContent = `Hai già completato il livello ${size}x${size}! Tempo: ${formatTime(data.timeSeconds)} 🌟`;
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

    // Pre-fill username
    const savedName = localStorage.getItem('alberi_username');
    if (savedName) usernameInput.value = savedName;
}

function shareResult() {
    const name = usernameInput.value.trim() || "Un giocatore";
    localStorage.setItem('alberi_username', name);

    const timeStr = formatTime(elapsedTime);

    const text = `Ho risolto l'Alberi Daily (${currentSize}x${currentSize}) del ${new Date().toLocaleDateString('it-IT')} in ${timeStr}! 🌲\nGiocatore: ${name}\n#AlberiDaily`;

    if (navigator.share) {
        navigator.share({
            title: 'Alberi Daily',
            text: text,
            url: window.location.href
        }).catch(err => {
            copyToClipboard(text);
        });
    } else {
        copyToClipboard(text);
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = btnShare.textContent;
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
