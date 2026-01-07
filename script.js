// Game State
// Game State
let currentLevel = null;
let currentLevelIndex = 0; // Using index for progression tracking
let gridState = []; // 0: Empty, 1: Tree, 2: Cross
let isGameActive = false;

// DOM Elements
const boardEl = document.getElementById('board');
const levelSelectEl = document.getElementById('level-select');
const statusEl = document.getElementById('status-msg');
const btnCheck = document.getElementById('btn-check');
const btnReset = document.getElementById('btn-reset');

// Initialize
function init() {
    // Populate level select
    window.gameLevels.forEach((level, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `Livello ${level.id}: ${level.name}`;
        levelSelectEl.appendChild(option);
    });

    levelSelectEl.addEventListener('change', (e) => loadLevel(window.gameLevels[e.target.value]));
    btnCheck.addEventListener('click', checkSolution);
    btnReset.addEventListener('click', () => loadLevel(currentLevel));

    // Load first level default
    // Load first level default (tutorial or generated)
    loadNextLevel();
}

function loadNextLevel() {
    currentLevelIndex++;
    let level;

    // Use predefined levels for the first few (tutorial phase)
    if (window.gameLevels && currentLevelIndex <= window.gameLevels.length) {
        level = window.gameLevels[currentLevelIndex - 1];
    } else {
        // Generate procedural levels
        // Increase difficulty based on index?
        // 1-2: Size 5 (Tutorial)
        // 3-5: Size 6
        // 6-10: Size 7
        // 11+: Size 8+
        let size = 5;
        if (currentLevelIndex > 2) size = 6;
        if (currentLevelIndex > 5) size = 7;
        if (currentLevelIndex > 10) size = 8;
        // Cap at 10 to keep it playable on screen
        if (size > 10) size = 10;

        level = window.LevelGenerator.generate(size);
        level.name = `Livello ${currentLevelIndex} (Infinito)`;
    }

    // Update select UI just for show (optional, or remove select if linear)
    let option = levelSelectEl.querySelector(`option[value="${currentLevelIndex}"]`);
    if (!option) {
        option = document.createElement('option');
        option.value = currentLevelIndex;
        option.textContent = level.name;
        levelSelectEl.appendChild(option);
        levelSelectEl.value = currentLevelIndex;
    }

    loadLevel(level);
}

function loadLevel(level) {
    currentLevel = level;
    isGameActive = true;

    // Reset State
    // Create matrix size x size filled with 0
    gridState = Array(level.size).fill().map(() => Array(level.size).fill(0));

    // Clear Board
    boardEl.innerHTML = '';
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
            cell.classList.add(`region-${regionId % 8}`); // Cycle through 8 colors

            cell.dataset.row = r;
            cell.dataset.col = c;

            // Events
            cell.addEventListener('mousedown', (e) => handleCellClick(e, r, c));
            cell.addEventListener('contextmenu', (e) => e.preventDefault()); // Block menu

            boardEl.appendChild(cell);
        }
    }
}

function handleCellClick(e, r, c) {
    if (!isGameActive) return;

    // 0: Empty, 1: Tree, 2: Cross
    let currentVal = gridState[r][c];

    if (e.button === 0) {
        // Left Click: Empty -> Tree -> Empty
        if (currentVal === 1) currentVal = 0;
        else currentVal = 1; // Overwrite cross if present? Or cycle? Let's just toggle Tree
    } else if (e.button === 2) {
        // Right Click: Empty -> Cross -> Empty
        e.preventDefault();
        if (currentVal === 2) currentVal = 0;
        else currentVal = 2;
    }

    gridState[r][c] = currentVal;
    updateCellVisual(r, c, currentVal);

    // Clear status on move
    statusEl.className = 'game-status';
    statusEl.textContent = `Posiziona ${currentLevel.treesPerLine} alber${currentLevel.treesPerLine > 1 ? 'i' : 'o'} per riga, colonna e area.`;
}

function updateCellVisual(r, c, val) {
    // Find index in flat list or query selector. Flat calc is easier.
    const index = r * currentLevel.size + c;
    const cell = boardEl.children[index];

    cell.classList.remove('tree', 'cross', 'error');
    if (val === 1) cell.classList.add('tree');
    if (val === 2) cell.classList.add('cross');
}

function checkSolution() {
    if (!currentLevel) return;

    const size = currentLevel.size;
    const target = currentLevel.treesPerLine;
    let errors = [];

    // Helper to add error
    const addError = (r, c) => {
        const index = r * size + c;
        const cell = boardEl.children[index];
        cell.classList.add('error');
    };

    // 1. Check Rows
    for (let r = 0; r < size; r++) {
        let count = 0;
        for (let c = 0; c < size; c++) {
            if (gridState[r][c] === 1) count++;
        }
        if (count !== target) {
            // Highlight whole row
            for (let c = 0; c < size; c++) addError(r, c);
            errors.push(`Riga ${r + 1}: trovati ${count} alberi invece di ${target}.`);
        }
    }

    // 2. Check Cols
    for (let c = 0; c < size; c++) {
        let count = 0;
        for (let r = 0; r < size; r++) {
            if (gridState[r][c] === 1) count++;
        }
        if (count !== target) {
            // Highlight whole col
            for (let r = 0; r < size; r++) addError(r, c);
            errors.push(`Colonna ${c + 1}: trovati ${count} alberi invece di ${target}.`);
        }
    }

    // 3. Check Regions
    // Collect region counts
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
            // Highlight region cells. Inefficient but fine for small grids.
            for (let r = 0; r < size; r++) {
                for (let c = 0; c < size; c++) {
                    if (currentLevel.regions[r][c] == regId) addError(r, c);
                }
            }
            errors.push(`Area colorata (id ${regId}): trovati ${regionCounts[regId]} alberi invece di ${target}.`);
        }
    }

    // 4. Check Adjacency
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (gridState[r][c] !== 1) continue;

            // Check neighbors 
            // -1, -1 | -1, 0 | -1, 1
            //  0, -1 |       |  0, 1
            //  1, -1 |  1, 0 |  1, 1

            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;

                    const nr = r + dr;
                    const nc = c + dc;

                    if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                        if (gridState[nr][nc] === 1) {
                            addError(r, c);
                            addError(nr, nc);
                            errors.push("Alberi adiacenti trovati!");
                        }
                    }
                }
            }
        }
    }

    // Result
    if (errors.length === 0) {
        statusEl.textContent = "Fantastico! Hai risolto il puzzle!";
        statusEl.className = "game-status success";
        triggerConfetti();

        // Disable board interaction
        isGameActive = false;

        // Show Next Level Button
        setTimeout(() => {
            const btn = document.createElement('button');
            btn.textContent = "Prossimo Livello ➡";
            btn.className = "btn primary";
            btn.style.marginTop = "10px";
            btn.onclick = () => {
                loadNextLevel();
            };
            statusEl.appendChild(document.createElement('br'));
            statusEl.appendChild(btn);
        }, 500);

    } else {
        statusEl.textContent = "Ci sono degli errori. Controlla le caselle rosse.";
        statusEl.className = "game-status error";
        // prevent redundant error console logs or remove if annoying
    }
}

function triggerConfetti() {
    var count = 200;
    var defaults = {
        origin: { y: 0.7 }
    };

    function fire(particleRatio, opts) {
        confetti(Object.assign({}, defaults, opts, {
            particleCount: Math.floor(count * particleRatio)
        }));
    }

    fire(0.25, {
        spread: 26,
        startVelocity: 55,
    });
    fire(0.2, {
        spread: 60,
    });
    fire(0.35, {
        spread: 100,
        decay: 0.91,
        scalar: 0.8
    });
    fire(0.1, {
        spread: 120,
        startVelocity: 25,
        decay: 0.92,
        scalar: 1.2
    });
    fire(0.1, {
        spread: 120,
        startVelocity: 45,
    });
}

// Start
init();
