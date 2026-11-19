// ============================================================
// STREAK.JS - Serie di giorni consecutivi e traguardi
// ============================================================
// Tutto e' calcolato dai completamenti, senza server:
//  - localStorage `alberi_daily_{date}_{size}` = {date, timeSeconds, size, completedOn?}
//  - Firestore `users/{uid}/completions` (letti una volta all'accesso e
//    all'apertura delle statistiche, tenuti in memoria).
// `completedOn` = data LOCALE in cui e' stato completato (dal Blocco 3).
// Un giorno conta per la serie se c'e' un puzzle DI QUEL GIORNO completato quel
// giorno stesso. I completamenti vecchi non hanno `completedOn`: per quelli si
// accetta la data del puzzle (non si puo' distinguere l'archivio).

const ACHIEVEMENTS_SEEN_KEY = 'alberi_achievements_seen';
const DAILY_SIZES = [5, 6, 7, 8, 9, 10];
const ALL_SIZES = [5, 6, 7, 8, 9, 10, 12];

// Traguardi: id (anche per analytics), icona, condizione sul riepilogo.
// Testi in i18n.js: 'ach.{id}.name' / 'ach.{id}.desc'.
const ACHIEVEMENTS = [
    { id: 'first_win', icon: '🌱', test: s => s.total >= 1 },
    { id: 'streak_3', icon: '🔥', test: s => s.streak.best >= 3 },
    { id: 'streak_7', icon: '🔥', test: s => s.streak.best >= 7 },
    { id: 'streak_30', icon: '🏆', test: s => s.streak.best >= 30 },
    { id: 'all_sizes_day', icon: '🌈', test: s => s.allSizesDay },
    { id: 'sunday_12', icon: '🌟', test: s => s.hasWeekly },
    { id: 'solved_50', icon: '🌳', test: s => s.total >= 50 },
    { id: 'solved_100', icon: '🌲', test: s => s.total >= 100 }
];

// Completamenti Firestore dell'utente corrente: { 'date_size': {...} }
let _remoteCompletions = {};
let _remoteCompletionsUid = null;

function isValidCompletion(c) {
    return !!c && typeof c.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c.date) &&
        ALL_SIZES.indexOf(Number(c.size)) !== -1;
}

function normalizeCompletion(c) {
    const out = {
        date: c.date,
        size: Number(c.size),
        timeSeconds: Math.max(0, Math.floor(Number(c.timeSeconds) || 0))
    };
    if (typeof c.completedOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c.completedOn)) {
        out.completedOn = c.completedOn;
    }
    return out;
}

function getLocalCompletions() {
    const out = {};
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const match = key && key.match(/^alberi_daily_(\d{4}-\d{2}-\d{2})_(\d+)$/);
            if (!match) continue;
            try {
                const data = JSON.parse(localStorage.getItem(key)) || {};
                const c = { date: match[1], size: parseInt(match[2], 10), timeSeconds: data.timeSeconds, completedOn: data.completedOn };
                if (isValidCompletion(c)) out[`${c.date}_${c.size}`] = normalizeCompletion(c);
            } catch (e) { /* voce corrotta: ignora */ }
        }
    } catch (e) { /* localStorage non disponibile */ }
    return out;
}

// Unione locale + Firestore (stessa chiave date_size = stesso puzzle)
function getAllCompletions() {
    const merged = {};
    Object.keys(_remoteCompletions).forEach(k => { merged[k] = Object.assign({}, _remoteCompletions[k]); });
    const local = getLocalCompletions();
    Object.keys(local).forEach(k => {
        const remote = merged[k];
        merged[k] = Object.assign({}, local[k]);
        if (!merged[k].completedOn && remote && remote.completedOn) merged[k].completedOn = remote.completedOn;
    });
    return Object.keys(merged).map(k => merged[k]);
}

// Legge una volta tutti i completamenti Firestore dell'utente (in memoria).
async function loadRemoteCompletions(uid) {
    if (!uid || !window.firebaseReady || !firebaseDb) return;
    if (_remoteCompletionsUid !== uid) {
        _remoteCompletions = {};
        _remoteCompletionsUid = uid;
    }
    try {
        const snapshot = await firebaseDb.collection('users').doc(uid).collection('completions').get();
        if (_remoteCompletionsUid !== uid) return; // nel frattempo e' cambiato utente
        const fresh = {};
        snapshot.forEach(doc => {
            const c = doc.data();
            if (isValidCompletion(c)) fresh[`${c.date}_${Number(c.size)}`] = normalizeCompletion(c);
        });
        _remoteCompletions = fresh;
    } catch (err) {
        console.warn('Completamenti Firestore non disponibili:', err && err.code);
    }
    updateStreakBadge();
}

// Il completamento conta per la serie? (puzzle del giorno, giocato quel giorno)
function isDailyCompletion(c) {
    return !c.completedOn || c.completedOn === c.date;
}

// 'YYYY-MM-DD' + n giorni, in ora locale (sicuro col cambio dell'ora legale:
// si lavora sui componenti della data, non su multipli di 24 ore).
function addDaysStr(dateStr, n) {
    const d = parseLocalDate(dateStr);
    return localDateStr(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
}

// Serie dai giorni validi. Oggi non ancora giocato non interrompe la serie:
// si conta fino a ieri (playedToday = false -> "da continuare").
function computeStreakInfo(daySet, todayDateStr) {
    const days = daySet instanceof Set ? daySet : new Set(daySet || []);
    const today = todayDateStr || localDateStr();
    const playedToday = days.has(today);

    let current = 0;
    let cursor = playedToday ? today : addDaysStr(today, -1);
    while (days.has(cursor)) {
        current++;
        cursor = addDaysStr(cursor, -1);
    }

    let best = 0;
    let run = 0;
    let prev = null;
    Array.from(days).sort().forEach(d => {
        run = (prev && addDaysStr(prev, 1) === d) ? run + 1 : 1;
        if (run > best) best = run;
        prev = d;
    });

    return { current: current, best: Math.max(best, current), playedToday: playedToday };
}

// Back-compat: vecchia firma usata dalle statistiche (Set di date -> numero)
function calculateStreak(dateSet) {
    return computeStreakInfo(dateSet, localDateStr()).current;
}

// Riepilogo per statistiche, serie e traguardi
function getProgressSummary(completions, todayDateStr) {
    const list = completions || getAllCompletions();
    const bestTimes = {};
    const allDates = new Set();
    const dailyDays = new Set();
    const sizesByDate = {};
    let hasWeekly = false;

    list.forEach(c => {
        allDates.add(c.date);
        if (isDailyCompletion(c)) dailyDays.add(c.date);
        if (!bestTimes[c.size] || c.timeSeconds < bestTimes[c.size]) bestTimes[c.size] = c.timeSeconds;
        if (!sizesByDate[c.date]) sizesByDate[c.date] = new Set();
        sizesByDate[c.date].add(c.size);
        if (c.size === 12) hasWeekly = true;
    });

    const allSizesDay = Object.keys(sizesByDate).some(d =>
        DAILY_SIZES.every(s => sizesByDate[d].has(s)));

    return {
        total: list.length,
        bestTimes: bestTimes,
        daysPlayed: allDates.size,
        streak: computeStreakInfo(dailyDays, todayDateStr || localDateStr()),
        allSizesDay: allSizesDay,
        hasWeekly: hasWeekly
    };
}

function getUnlockedAchievementIds(summary) {
    return ACHIEVEMENTS.filter(a => a.test(summary)).map(a => a.id);
}

function getSeenAchievements() {
    try {
        const raw = localStorage.getItem(ACHIEVEMENTS_SEEN_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
    } catch (e) {
        return null; // localStorage non disponibile: niente toast (evita ripetizioni)
    }
}

// Dopo una vittoria: annuncia (toast) i traguardi sbloccati non ancora annunciati
// su questo dispositivo. Ritorna gli id annunciati.
function announceNewAchievements(summary) {
    const seen = getSeenAchievements();
    if (seen === null) return [];
    const unlocked = getUnlockedAchievementIds(summary || getProgressSummary());
    const fresh = unlocked.filter(id => seen.indexOf(id) === -1);
    if (fresh.length === 0) return [];

    try {
        localStorage.setItem(ACHIEVEMENTS_SEEN_KEY, JSON.stringify(seen.concat(fresh)));
    } catch (e) { /* ignora */ }

    const names = fresh.map(id => {
        const a = ACHIEVEMENTS.find(x => x.id === id);
        return (a ? a.icon + ' ' : '') + t('ach.' + id + '.name');
    });
    showToast(fresh.length === 1
        ? t('ach.toastOne', { name: names[0] })
        : t('ach.toastMany', { names: names.join(', ') }));

    fresh.forEach(id => {
        try {
            if (typeof trackEvent === 'function') trackEvent('achievement_unlocked', { id: id });
        } catch (e) { /* silent */ }
    });
    return fresh;
}

// Toast breve in alto (testo, mai HTML)
let _toastTimer = null;
function showToast(text, ms) {
    let el = document.getElementById('toast');
    if (!el) {
        el = document.createElement('div');
        el.id = 'toast';
        el.className = 'toast';
        el.setAttribute('role', 'status');
        el.setAttribute('aria-live', 'polite');
        document.body.appendChild(el);
    }
    el.textContent = text;
    // forza il reflow per ripartire con l'animazione
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    if (_toastTimer) clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.remove('show'), ms || 3500);
}

// Badge "🔥 N" in header. Stile "pending" se oggi non e' ancora stato giocato.
function updateStreakBadge() {
    const el = document.getElementById('streak-badge');
    if (!el) return;
    const info = getProgressSummary().streak;
    if (info.current <= 0) {
        el.hidden = true;
        return;
    }
    el.hidden = false;
    el.textContent = '🔥 ' + info.current;
    el.classList.toggle('pending', !info.playedToday);
    const label = t(info.playedToday ? 'streak.badgeTitle' : 'streak.badgePendingTitle', { n: info.current });
    el.title = label;
    el.setAttribute('aria-label', label);
}

// HTML della sezione traguardi nel modale statistiche (solo testi del dizionario)
function renderAchievementsHtml(summary) {
    const unlocked = getUnlockedAchievementIds(summary);
    let html = `<h3 style="margin: 1rem 0 0.5rem;">${escapeHtml(t('ach.title'))}</h3><div class="badges-grid">`;
    ACHIEVEMENTS.forEach(a => {
        const ok = unlocked.indexOf(a.id) !== -1;
        html += `
            <div class="badge ${ok ? 'unlocked' : 'locked'}" title="${escapeHtml(t('ach.' + a.id + '.desc'))}">
                <div class="badge-icon">${ok ? a.icon : '🔒'}</div>
                <div class="badge-name">${escapeHtml(t('ach.' + a.id + '.name'))}</div>
                <div class="badge-desc">${escapeHtml(t('ach.' + a.id + '.desc'))}</div>
            </div>`;
    });
    html += '</div>';
    return html;
}
