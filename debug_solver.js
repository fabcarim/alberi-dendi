const window = {};

// Mock Utils (SeededRNG)
window.SeededRNG = class SeededRNG {
    constructor(seed) { this.seed = 123; } // Fixed seed for reproducibility? Or just use Math.random
    random() { return Math.random(); } // Use output of Math.random for better distribution in debug
    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(this.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
};

// Load Generator
const fs = require('fs');
const generatorCode = fs.readFileSync('c:/Users/Samer/Desktop/alberi/generator.js', 'utf8');
eval(generatorCode);

const LevelGenerator = window.LevelGenerator;

console.log("Debugging Solver...");

// Generate ONE level
const size = 5;
const rng = new window.SeededRNG("debug");
const trees = LevelGenerator.placeTrees(size, rng);
const regions = LevelGenerator.generateRegions(trees, size, rng);

console.log("Generated Regions:");
regions.forEach(row => console.log(JSON.stringify(row)));

console.log("Original Trees:");
trees.forEach(row => console.log(JSON.stringify(row)));

console.log("Counting Solutions...");

// Modified solver to print solutions
const solutions = [];
const rows = Array(size).fill(0);
const cols = Array(size).fill(0);
const regionHasTree = Array(size).fill(false);
const grid = Array(size).fill().map(() => Array(size).fill(0));

const solve = (r) => {
    if (solutions.length >= 10) return;
    if (r === size) {
        solutions.push(JSON.parse(JSON.stringify(grid)));
        return;
    }

    for (let c = 0; c < size; c++) {
        if (cols[c] > 0) continue;
        const reg = regions[r][c];
        if (regionHasTree[reg]) continue;
        if (LevelGenerator.hasNeighbor(grid, r, c, size)) continue;

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

console.log(`Found ${solutions.length} solutions.`);
solutions.forEach((sol, i) => {
    console.log(`Solution ${i + 1}:`);
    sol.forEach(row => console.log(JSON.stringify(row)));
    console.log("---");
});
