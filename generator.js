const LevelGenerator = {
    generate: function (size) {
        // Attempt to generate a valid board. If it fails (backtracking locks up), retry.
        let solution = null;
        let attempts = 0;

        while (!solution && attempts < 100) {
            solution = this.placeTrees(size);
            attempts++;
        }

        if (!solution) {
            console.error("Failed to generate valid tree placement after 100 attempts");
            // Fallback to a diagonal placement just to have something (though invalid per adjacency rules usually)
            // But let's hope 100 attempts is enough for small grids.
            return this.generateFallback(size);
        }

        const regions = this.generateRegions(solution, size);

        return {
            id: 'gen_' + Date.now(),
            name: "Livello Generato",
            size: size,
            treesPerLine: 1,
            regions: regions,
            solution: solution // Optional: keep for debugging or hints
        };
    },

    placeTrees: function (size) {
        // Simple backtracking to place 1 tree per row and col, no touching
        const grid = Array(size).fill().map(() => Array(size).fill(0));
        const colsUsed = Array(size).fill(false);

        if (this.backtrack(grid, 0, size, colsUsed)) {
            return grid;
        }
        return null;
    },

    backtrack: function (grid, r, size, colsUsed) {
        if (r === size) return true;

        // Try random column order to ensure variety
        const cols = Array.from({ length: size }, (_, i) => i);
        this.shuffle(cols);

        for (let c of cols) {
            if (!colsUsed[c] && this.isValidPlacement(grid, r, c, size)) {
                grid[r][c] = 1;
                colsUsed[c] = true;

                if (this.backtrack(grid, r + 1, size, colsUsed)) return true;

                grid[r][c] = 0;
                colsUsed[c] = false;
            }
        }
        return false;
    },

    isValidPlacement: function (grid, r, c, size) {
        // Check adjacent cells (including diagonals) for existing trees
        // Since we fill row by row, we only need to check previous rows (r-1)
        // and actually just needs to check immediate neighbors in previous row?
        // Actually, we need to check all 8 neighbors if we were placing randomly, 
        // but since we go row by row, we check r-1.

        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            // We haven't placed anything in current row (except maybe if we did weird recursion, 
            // but here we place 1 per row so no horizontal checks needed inside row)
            // And future rows are empty.
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

    generateRegions: function (treeGrid, size) {
        // Multi-source BFS ( Voronoi growth )
        const regions = Array(size).fill().map(() => Array(size).fill(-1));
        const queue = [];

        // Initialize queue with tree positions
        // Assign each tree a unique region ID (0 to size-1)
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

        // Shuffle queue to make growth less uniform
        this.shuffle(queue);

        while (queue.length > 0) {
            // Randomly pick index to pop to simulate organic growth? 
            // Standard queue is BFS (round robin). 
            // Let's stick to standard BFS but maybe shuffle neighbors.

            const item = queue.shift();

            const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
            this.shuffle(dirs);

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

        // Fill any remaining gaps (if any, though BFS shouldn't leave any if graph is connected)
        // Just in case:
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (regions[r][c] === -1) {
                    // Assign to neighbor
                    regions[r][c] = 0; // Fallback
                }
            }
        }

        return regions;
    },

    shuffle: function (array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    },

    generateFallback: function (size) {
        // Just return a basic diagonal setup if everything fails
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
