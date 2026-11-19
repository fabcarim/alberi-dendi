// Precalcola i puzzle 12x12 delle domeniche e scrive levels12.js.
// I puzzle sono generati con lo STESSO generator.js del gioco e lo stesso
// seed (`${data}_12`), quindi sono identici a quelli generati nel browser.
//
// Uso (dalla cartella del repo):
//   node tools/precompute-12x12.js 2026-05-03 2028-12-31
// Ripeti con un intervallo piu' avanti prima che la tabella finisca:
// le date mancanti funzionano lo stesso (calcolo in background nel browser),
// solo piu' lente.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const os = require('os');
const { fork } = require('child_process');

const REPO = path.resolve(__dirname, '..');

function loadGenerator() {
    const ctx = { window: {}, console, Math, JSON, Array, Set, Map, Date };
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(path.join(REPO, 'utils.js'), 'utf8'), ctx);
    vm.runInContext(fs.readFileSync(path.join(REPO, 'generator.js'), 'utf8'), ctx);
    return ctx.window.LevelGenerator;
}

function pad(n) { return String(n).padStart(2, '0'); }
function sundays(from, to) {
    const [fy, fm, fd] = from.split('-').map(Number);
    const [ty, tm, td] = to.split('-').map(Number);
    const d = new Date(fy, fm - 1, fd, 12);
    const end = new Date(ty, tm - 1, td, 12);
    while (d.getDay() !== 0) d.setDate(d.getDate() + 1);
    const out = [];
    while (d <= end) {
        out.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
        d.setDate(d.getDate() + 7);
    }
    return out;
}

if (process.argv[2] === '--child') {
    const gen = loadGenerator();
    process.on('message', (date) => {
        const lvl = gen.generate(12, `${date}_12`);
        process.send({ date, regions: lvl.id === 'fallback' ? null : lvl.regions });
    });
} else {
    // Uso: <da> <a>  oppure  --dates d1,d2,...  (unisce alla tabella esistente)
    let dates;
    if (process.argv[2] === '--dates') {
        dates = (process.argv[3] || '').split(',').filter(Boolean);
    } else {
        const from = process.argv[2], to = process.argv[3];
        if (!from || !to) { console.error('uso: node tools/precompute-12x12.js YYYY-MM-DD YYYY-MM-DD | --dates d1,d2'); process.exit(1); }
        dates = sundays(from, to);
    }
    const queue = dates.slice();
    const result = {};
    const existing = path.join(REPO, 'levels12.js');
    if (fs.existsSync(existing)) {
        const ctx = { window: {} };
        vm.createContext(ctx);
        vm.runInContext(fs.readFileSync(existing, 'utf8'), ctx);
        Object.assign(result, ctx.window.PRECOMPUTED_12 || {});
    }
    const workers = Math.max(1, Math.min(os.cpus().length - 1, dates.length));
    let done = 0, alive = workers;
    const t0 = Date.now();
    for (let i = 0; i < workers; i++) {
        const child = fork(__filename, ['--child']);
        const next = () => {
            const date = queue.shift();
            if (!date) { child.kill(); if (--alive === 0) write(); return; }
            child.send(date);
        };
        child.on('message', ({ date, regions }) => {
            done++;
            if (regions) result[date] = regions;
            else console.warn('fallback per', date, '(non salvato)');
            process.stdout.write(`\r${done}/${dates.length}  ${Math.round((Date.now() - t0) / 1000)} s`);
            next();
        });
        next();
    }
    function write() {
        const keys = Object.keys(result).sort();
        const lines = keys.map(k => `    "${k}": ${JSON.stringify(result[k])}`);
        const out = `// GENERATO da tools/precompute-12x12.js - non modificare a mano.\n` +
            `// Puzzle 12x12 delle domeniche ${keys[0]} .. ${keys[keys.length - 1]} (${keys.length}),\n` +
            `// identici a LevelGenerator.generate(12, data + '_12').\n` +
            `window.PRECOMPUTED_12 = {\n${lines.join(',\n')}\n};\n`;
        fs.writeFileSync(path.join(REPO, 'levels12.js'), out);
        console.log(`\nscritto levels12.js: ${keys.length} domeniche`);
    }
}
