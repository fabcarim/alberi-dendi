// Web Worker: genera un puzzle fuori dal thread della pagina, cosi' il
// 12x12 (che puo' richiedere decine di secondi) non blocca l'interfaccia.
// Usa gli stessi utils.js e generator.js della pagina: stesso puzzle.
self.window = self;
importScripts('utils.js', 'generator.js');

self.onmessage = function (e) {
    const { id, size, seed } = e.data;
    try {
        const level = self.LevelGenerator.generate(size, seed);
        self.postMessage({ id, level });
    } catch (err) {
        self.postMessage({ id, error: String(err && err.message || err) });
    }
};
