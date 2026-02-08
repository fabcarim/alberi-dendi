const LevelGenerator = {
    generate: function (size, seed) {
        // Use seeded RNG if provided, otherwise random
        const rng = new window.SeededRNG(seed);

        // Attempt to generate a valid board.
        let solution = null;
        let attempts = 0;

        while (!solution && attempts < 100) {
            solution = this.placeTrees(size, rng);
            attempts++;
        }

        if (!solution) {
            console.error("Failed to generate valid tree placement after 100 attempts");
            return this.generateFallback(size);
        }

        const regions = this.generateRegions(solution, size, rng);

        return {
            id: 'daily_' + (seed || Date.now()),
            name: "Livello del Giorno",
            size: size,
            treesPerLine: 1,
            regions: regions,
            solution: solution
        };
    },

    placeTrees: function (size, rng) {
        // Simple backtracking to place 1 tree per row and col, no touching
        const grid = Array(size).fill().map(() => Array(size).fill(0));
        const colsUsed = Array(size).fill(false);

        if (this.backtrack(grid, 0, size, colsUsed, rng)) {
            return grid;
        }
        return null;
    },

    backtrack: function (grid, r, size, colsUsed, rng) {
        if (r === size) return true;

        // Try random column order to ensure variety
        const cols = Array.from({ length: size }, (_, i) => i);
        rng.shuffle(cols);

        for (let c of cols) {
            if (!colsUsed[c] && this.isValidPlacement(grid, r, c, size)) {
                grid[r][c] = 1;
                colsUsed[c] = true;

                if (this.backtrack(grid, r + 1, size, colsUsed, rng)) return true;

                grid[r][c] = 0;
                colsUsed[c] = false;
            }
        }
        return false;
    },

    isValidPlacement: function (grid, r, c, size) {
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
        ];

        for (let [dr, dc] of directions) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                if (grid[nr][nc] === 1) return false;
            }
        }

        return true;
    },

    generateRegions: function (treeGrid, size, rng) {
        // Multi-source BFS ( Voronoi growth )
        const regions = Array(size).fill().map(() => Array(size).fill(-1));
        const queue = [];

        // Initialize queue with tree positions
        let regionIdCounter = 0;
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (treeGrid[r][c] === 1) {
                    regions[r][c] = regionIdCounter;
                    queue.push({ r, c, id: regionIdCounter });
                    regionIdCounter++;
                }
            }
        }

        rng.shuffle(queue);

        while (queue.length > 0) {
            const item = queue.shift();

            const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
            rng.shuffle(dirs);

            for (let [dr, dc] of dirs) {
                const nr = item.r + dr;
                const nc = item.c + dc;

                if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                    if (regions[nr][nc] === -1) {
                        regions[nr][nc] = item.id;
                        queue.push({ r: nr, c: nc, id: item.id });
                    }
                }
            }
        }

        // Fill gaps
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (regions[r][c] === -1) {
                    regions[r][c] = 0; // Fallback
                }
            }
        }

        return regions;
    },

    generateFallback: function (size) {
        const regions = Array(size).fill().map((_, r) => Array(size).fill(r));
        return {
            id: 'fallback',
            name: "Livello Fallback",
            size: size,
            treesPerLine: 1,
            regions: regions
        };
    }
};

window.LevelGenerator = LevelGenerator;
