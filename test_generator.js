const window = {};

// Mock Utils (SeededRNG)
// We need to read utils.js content or mock it.
// Let's just mock it simply since I know what it does (LCG).
window.SeededRNG = class SeededRNG {
    constructor(seed) {
        this.seed = this.hash(seed);
    }
    hash(str) {
        let hash = 0;
        if (typeof str === 'number') str = str.toString();
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        return hash;
    }
    random() {
        const x = Math.sin(this.seed++) * 10000;
        return x - Math.floor(x);
    }
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

console.log("Testing Generator Uniqueness...");

let passed = 0;
let total = 20;

for (let i = 0; i < total; i++) {
    const size = 5 + (i % 5); // 5 to 9
    const seed = "test_" + i;

    // Generate
    // console.log(`Generating size ${size} seed ${seed}...`);
    const level = LevelGenerator.generate(size, seed);

    // Solve
    const solutions = LevelGenerator.countSolutions(level.regions, level.size, 10);

    if (solutions === 1) {
        passed++;
    } else {
        console.error(`FAILED: Size ${size} Seed ${seed} has ${solutions} solutions!`);
        // console.log(JSON.stringify(level.regions));
    }
}

console.log(`Passed ${passed}/${total} tests.`);

if (passed === total) {
    console.log("SUCCESS: All generated levels have exactly 1 solution.");
} else {
    console.log("FAILURE: Some levels have non-unique solutions.");
    process.exit(1);
}
