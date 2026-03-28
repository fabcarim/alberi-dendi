const LevelGenerator = {
    generate: function (size, seed) {
        // Use seeded RNG if provided, otherwise random
        const rng = new window.SeededRNG(seed);

        let maxGlobalAttempts = 2500;

        for (let attempt = 0; attempt < maxGlobalAttempts; attempt++) {
            // 1. Generate a valid tree placement
            let treeGrid = this.placeTrees(size, rng);
            if (!treeGrid) continue;

            // 2. Generate regions based on that placement
            let regions = this.generateRegions(treeGrid, size, rng);

            // 3. Refine regions to enforce uniqueness
            let uniqueRegions = this.enforceUniqueness(regions, treeGrid, size, rng);

            if (uniqueRegions) {
                return {
                    id: 'daily_' + (seed || Date.now()),
                    name: "Livello del Giorno",
                    size: size,
                    treesPerLine: 1,
                    regions: uniqueRegions,
                    solution: treeGrid
                };
            }
        }

        console.warn(`Could not generate unique puzzle in ${maxGlobalAttempts} attempts`);
        return this.generateFallback(size);
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
                    // Start a BFS from here to find nearest region
                    regions[r][c] = this.findNearestRegion(regions, r, c, size) || 0;
                }
            }
        }

        return regions;
    },

    findNearestRegion: function (regions, r, c, size) {
        // Simple scan if gaps remain (rare with BFS but possible if disconnected)
        // Just take neighbor
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (let [dr, dc] of dirs) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < size && nc >= 0 && nc < size && regions[nr][nc] !== -1) {
                return regions[nr][nc];
            }
        }
        return 0;
    },

    // Constructive Unique Solver
    enforceUniqueness: function (regions, treeGrid, size, rng) {
        // Try to refine regions up to N times
        let attempts = 0;
        let maxRefinements = 50;

        while (attempts < maxRefinements) {
            // Find solutions
            const solutions = this.findAllSolutions(regions, size, 2); // Stop if 2

            if (solutions.length === 1) {
                return regions; // Success!
            }
            if (solutions.length === 0) {
                // Should not happen as treeGrid is a solution
                return null;
            }

            // We have > 1 solution. solutions[0] and solutions[1].
            let intended = treeGrid;
            let unintended = null;

            // Find which solution is NOT treeGrid
            for (let sol of solutions) {
                if (!this.areGridsEqual(sol, intended)) {
                    unintended = sol;
                    break;
                }
            }

            if (!unintended) {
                // All solutions found match intended (duplicates)?
                return regions;
            }

            // Kill unintended
            if (!this.refineRegionsOnce(regions, intended, unintended, size, rng)) {
                // Could not refine
                return null;
            }

            attempts++;
        }
        return null;
    },

    refineRegionsOnce: function (regions, intended, unintended, size, rng) {
        // Find a cell where unintended has a tree
        let candidates = [];
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (unintended[r][c] === 1 && intended[r][c] === 0) {
                    candidates.push({ r, c });
                }
            }
        }

        rng.shuffle(candidates);

        for (let cand of candidates) {
            const { r, c } = cand;
            const currentReg = regions[r][c];

            // Try to assign this cell to a neighbor region
            const neighbors = [[0, 1], [0, -1], [1, 0], [-1, 0]];
            rng.shuffle(neighbors);

            for (let [dr, dc] of neighbors) {
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                    const neighborReg = regions[nr][nc];
                    if (neighborReg !== currentReg) {
                        // Candidate swap: set regions[r][c] = neighborReg

                        // Check 1: Does this invalidate intended solution?
                        // Intended has 0 at [r][c], so swapping region of [r][c] 
                        // doesn't remove a tree from currentReg or add a tree to neighborReg 
                        // (from intended's perspective, [r][c] is empty). 
                        // So intended solution remains valid count-wise.

                        // Check 2: Connectivity
                        // We are removing [r][c] from currentReg. Is currentReg still connected?
                        // We are adding [r][c] to neighborReg. Is neighborReg still connected? (Always yes if attached to neighbor)

                        // Temporarily swap
                        regions[r][c] = neighborReg;

                        let connected = this.checkConnectivity(regions, size, currentReg);

                        if (connected) {
                            // Good swap.
                            return true;
                        } else {
                            // Revert
                            regions[r][c] = currentReg;
                        }
                    }
                }
            }
        }
        return false;
    },

    checkConnectivity: function (regions, size, regionId) {
        // Find first cell of regionId
        let start = null;
        let count = 0;
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (regions[r][c] === regionId) {
                    if (!start) start = { r, c };
                    count++;
                }
            }
        }
        if (count === 0) return true;

        // BFS to count reachable
        let reached = 0;
        let q = [start];
        let visited = new Set();
        visited.add(`${start.r},${start.c}`);

        while (q.length > 0) {
            let { r, c } = q.shift();
            reached++;
            const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
            for (let [dr, dc] of dirs) {
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                    if (regions[nr][nc] === regionId && !visited.has(`${nr},${nc}`)) {
                        visited.add(`${nr},${nc}`);
                        q.push({ r: nr, c: nc });
                    }
                }
            }
        }
        return reached === count;
    },

    findAllSolutions: function (regions, size, limit) {
        let solutions = [];
        const cols = Array(size).fill(0);
        const regionHasTree = Array(size).fill(false); // Map regionId -> boolean. careful with IDs. 
        // IDs are 0..size-1? Yes, generated by counter.
        const grid = Array(size).fill().map(() => Array(size).fill(0));

        // Just in case IDs are not 0..size-1, let's use a Map or larger array?
        // Generator guarantees 0..regionIdCounter-1. And regionIdCounter == trees count == size.

        const solve = (r) => {
            if (solutions.length >= limit) return;
            if (r === size) {
                solutions.push(JSON.parse(JSON.stringify(grid)));
                return;
            }

            for (let c = 0; c < size; c++) {
                if (cols[c] > 0) continue;
                const reg = regions[r][c];
                if (regionHasTree[reg]) continue;
                if (this.hasNeighbor(grid, r, c, size)) continue;

                grid[r][c] = 1;
                cols[c] = 1;
                regionHasTree[reg] = true;

                solve(r + 1);

                grid[r][c] = 0;
                cols[c] = 0;
                regionHasTree[reg] = false;
            }
        };

        solve(0);
        return solutions;
    },

    areGridsEqual: function (g1, g2) {
        for (let r = 0; r < g1.length; r++) {
            for (let c = 0; c < g1.length; c++) {
                if (g1[r][c] !== g2[r][c]) return false;
            }
        }
        return true;
    },

    countSolutions: function (regions, size, maxSolutions) {
        // Kept for compatibility if needed, but generate uses enforceUniqueness
        // which uses findAllSolutions.
        return this.findAllSolutions(regions, size, maxSolutions).length;
    },

    hasNeighbor: function (grid, r, c, size) {
        const dirs = [
            [-1, -1], [-1, 0], [-1, 1],
        ];

        for (let [dr, dc] of dirs) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                if (grid[nr][nc] === 1) return true;
            }
        }

        return false;
    },

    generateFallback: function (size) {
        // Fallback valid levels if generation ever fails drastically
        const fallbacks = require('fs').existsSync('c:/Users/Samer/Desktop/alberi/fallback_data.json') ? require('c:/Users/Samer/Desktop/alberi/fallback_data.json') : {
            5: { "regions": [[0, 0, 0, 1, 1], [2, 0, 1, 1, 3], [2, 0, 1, 1, 3], [4, 4, 1, 3, 3], [4, 4, 4, 4, 4]] },
            6: { "regions": [[2, 2, 1, 1, 0, 0], [2, 2, 3, 1, 1, 1], [2, 2, 3, 4, 4, 4], [2, 2, 3, 3, 4, 4], [5, 5, 4, 4, 4, 4], [5, 5, 5, 5, 5, 4]] },
            7: { "regions": [[3, 0, 0, 0, 1, 1, 2], [3, 0, 1, 1, 1, 1, 2], [3, 3, 5, 5, 1, 1, 2], [3, 3, 5, 5, 5, 4, 2], [3, 5, 5, 5, 5, 4, 4], [5, 5, 5, 5, 6, 4, 6], [5, 5, 5, 5, 6, 6, 6]] },
            8: { "regions": [[2, 2, 2, 0, 0, 0, 0, 0], [2, 2, 2, 2, 2, 0, 0, 1], [2, 2, 2, 2, 3, 3, 3, 3], [5, 5, 2, 3, 3, 3, 3, 3], [5, 5, 4, 4, 6, 6, 6, 3], [5, 5, 5, 5, 6, 6, 3, 3], [5, 5, 6, 6, 6, 3, 3, 6], [7, 6, 6, 6, 6, 6, 6, 6]] },
            9: { "regions": [[1, 1, 1, 0, 0, 0, 0, 0, 0], [1, 1, 1, 1, 3, 0, 2, 2, 2], [1, 1, 1, 1, 3, 2, 2, 2, 2], [1, 1, 1, 1, 3, 3, 2, 2, 2], [1, 1, 1, 4, 4, 3, 3, 2, 2], [4, 4, 4, 4, 6, 3, 2, 2, 5], [8, 8, 8, 4, 6, 3, 5, 5, 5], [7, 7, 8, 8, 6, 3, 5, 5, 5], [8, 8, 8, 8, 8, 8, 5, 5, 5]] },
            10: { "regions": [[2, 2, 2, 2, 2, 1, 1, 1, 0, 4], [2, 2, 2, 2, 2, 1, 1, 1, 1, 4], [2, 2, 2, 2, 2, 3, 1, 5, 4, 4], [2, 2, 2, 2, 3, 3, 5, 5, 4, 4], [6, 2, 2, 3, 3, 5, 5, 4, 4, 4], [6, 2, 2, 2, 2, 5, 5, 5, 5, 4], [6, 6, 7, 7, 7, 5, 5, 5, 5, 4], [6, 6, 7, 7, 7, 5, 5, 5, 5, 4], [8, 9, 9, 7, 7, 7, 5, 5, 5, 4], [9, 9, 9, 7, 7, 7, 7, 5, 5, 4]] }
        };

        let fallbackRegions = Array(size).fill().map((_, r) => Array(size).fill(r)); // Invalid standard fallback
        if (fallbacks[size]) {
            fallbackRegions = fallbacks[size].regions;
        }

        return {
            id: 'fallback',
            name: "Livello Standard",
            size: size,
            treesPerLine: 1,
            regions: fallbackRegions
        };
    }
};

window.LevelGenerator = LevelGenerator;
