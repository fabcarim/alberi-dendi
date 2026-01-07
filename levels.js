const levels = [
    {
        id: 1,
        name: "Prato Verde (Facile)",
        size: 5,
        treesPerLine: 1,
        // Each number represents a distinct "region" (podere)
        regions: [
            [0, 0, 0, 1, 1],
            [0, 2, 2, 2, 1],
            [3, 3, 2, 4, 1],
            [3, 4, 4, 4, 4],
            [3, 3, 3, 4, 4]
        ]
    },
    {
        id: 2,
        name: "Bosco Fitto (Medio)",
        size: 6,
        treesPerLine: 1, // Classic rules usually 1 for smaller grids
        regions: [
            [0, 0, 0, 1, 1, 1],
            [2, 2, 0, 1, 3, 1],
            [2, 4, 4, 3, 3, 3],
            [2, 4, 2, 2, 5, 5],
            [4, 4, 2, 5, 5, 5],
            [4, 4, 4, 4, 4, 5]
        ]
    },
    {
        id: 3,
        name: "Foresta Antica (Defida)",
        size: 8,
        treesPerLine: 1,
        regions: [
            [0, 0, 0, 1, 1, 1, 2, 2],
            [0, 3, 3, 3, 1, 2, 2, 2],
            [0, 3, 4, 4, 1, 2, 5, 5],
            [0, 4, 4, 4, 6, 6, 6, 5],
            [0, 0, 4, 7, 7, 6, 5, 5],
            [0, 7, 7, 7, 6, 6, 5, 5],
            [0, 7, 7, 7, 7, 7, 7, 5],
            [7, 7, 7, 7, 7, 7, 7, 7] // Note: This region layout is a placeholder example, needs to be solvable.
            // I will replace this with a logically valid simple map for the "demo" purpose to ensure playability.
            // Actually, let's use a simpler valid 5x5 pattern for level 3 validation to ensure it's beatable in demo.
        ]
    }
];

// Let's ensure Level 1 is definitely solvable.
// 5x5, 1 tree per row/col/region.
// Regions:
// 0 0 0 1 1
// 0 2 2 2 1
// 3 3 2 4 1
// 3 4 4 4 4
// 3 3 3 4 4
// Possible solution:
// . T . . . (Row 0, Col 1) -> Region 0 ok
// . . . T . (Row 1, Col 3) -> Region 2 ok? No, adjacent diagonals rule.
// Let's refine the 'data' in script implementation or runtime. 
// For now, I will stick to a very basic valid layout.

const levels_fixed = [
     {
        id: 1,
        name: "Principiante",
        size: 5,
        treesPerLine: 1,
        regions: [
            [0, 0, 1, 1, 1],
            [0, 0, 1, 2, 2],
            [3, 3, 3, 2, 2],
            [3, 4, 4, 4, 2],
            [3, 4, 4, 4, 4]
        ]
    }, 
    {
        id: 2,
        name: "Avanzato",
        size: 6,
        treesPerLine: 1,
        regions: [
            [0, 0, 1, 1, 2, 2],
            [0, 1, 1, 3, 3, 2],
            [0, 0, 3, 3, 4, 4],
            [5, 0, 3, 4, 4, 4],
            [5, 5, 5, 5, 4, 4],
            [5, 5, 5, 5, 5, 5]
        ]
    }
]

window.gameLevels = levels_fixed;
