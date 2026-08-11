# Alberi Daily — Stato attuale dell'applicazione

_Aggiornato al 11 agosto 2026_

## Cos'è
Web app di puzzle logico ispirata al gioco "Alberi" di Giorgio Dendi (variante del Trees & Tents / Star Battle). L'utente deve piazzare alberi su una griglia colorata rispettando 3 vincoli:
1. Un numero fisso di alberi per riga
2. Stesso numero per colonna
3. Stesso numero per ogni area colorata
4. Nessun albero adiacente (nemmeno in diagonale)

Interazione: click sinistro cicla `Vuoto → ❌ → 🌳 → Vuoto`; click destro (desktop) mette direttamente la croce.

## Stack tecnico
- **Frontend**: HTML + CSS + JavaScript vanilla (no framework, no build step). ~2.500 righe totali.
- **Backend**: Firebase (Auth + Firestore) — progetto `alberi-daily`.
- **Librerie CDN**: `firebase-compat 10.12`, `canvas-confetti`, Google Fonts (Outfit).
- **Deploy**: statico (attualmente su hosting web semplice, non specificato nel repo).

File sorgente:
- `index.html` — unica pagina
- `script.js` (540 righe) — logica di gioco e UI
- `generator.js` (387 righe) — generatore procedurale dei livelli con seed deterministico
- `auth.js` (353 righe) — login email/password + Google, gestione nickname
- `firestore-sync.js` (254 righe) — sync progressi + classifica
- `utils.js`, `levels.js`, `firebase-config.js`, `style.css` (632 righe)

## Funzionalità implementate
- **Puzzle giornaliero** generato deterministicamente da seed `YYYY-MM-DD_size` → tutti i giocatori risolvono lo stesso puzzle nello stesso giorno.
- **6 dimensioni**: 5×5, 6×6, 7×7, 8×8, 9×9, 10×10.
- **Sfida settimanale** 12×12 sbloccata la domenica alle 09:00.
- **Archivio** — accesso a puzzle degli ultimi 6 mesi tramite date picker.
- **Autenticazione**: email/password + Google Sign-In (popup con fallback a redirect). Modale nickname obbligatorio al primo accesso Google.
- **Login obbligatorio** — overlay bloccante all'apertura.
- **Persistenza doppia**: `localStorage` (offline-first) + Firestore (sync progressi in-corso ogni 3s con debounce, completamenti definitivi).
- **Classifica pubblica giornaliera** per ogni size — top 20 con nickname, tempo, medaglie 🥇🥈🥉, evidenziazione dell'utente corrente.
- **Timer** per completamento, con pausa/resume, e ripresa da progresso salvato.
- **Condivisione risultato** via `navigator.share` (mobile) o clipboard.
- **Confetti** all'aver risolto.
- **Statistiche personali** (modale).

## Modello dati Firestore
- `users/{uid}/completions/{date_size}` — completamenti storici
- `users/{uid}/progress/{progress_date_size}` — stato di gioco in-corso (con gridState serializzato)
- `leaderboard/{date_size_uid}` — record pubblici per classifica

## Metriche attuali
- **61 utenti registrati** (11 agosto 2026 — early traction organica, senza marketing).
- Lingua unica: **italiano**.
- Nicchia: appassionati di logic puzzle stile NYT/Puzzmo.

## Punti di forza per una possibile app store
1. Core loop ben validato — "one puzzle a day" ha traction storica (Wordle-like).
2. Codebase piccolo, coeso, senza debiti tecnici pesanti.
3. Backend serverless già in produzione — scala senza modifiche.
4. Generatore procedurale → contenuti infiniti senza content ops.
5. Social loop già presente (classifica + share).

## Gap / criticità per il porting su store
1. **Nessun asset di app**: manca icona, splash, screenshot store, privacy policy pubblica, ToS.
2. **Nessuna PWA setup**: manca `manifest.json`, service worker, offline shell — sarebbe il primo passo naturale.
3. **Auth**: Google Sign-In via popup web richiede rework per iOS/Android in-app (Firebase Auth native SDK o Capacitor plugin).
4. **Nessun sistema di monetizzazione** (né ads, né IAP, né abbonamento).
5. **Nessuna gestione push notification** ("nuovo puzzle disponibile").
6. **Nessun sistema di achievements/streak** — leva di retention debole rispetto ai competitor.
7. **UI mobile**: da verificare touch UX (il click destro=erba non esiste su mobile — serve alternativa tipo long-press).
8. **Localizzazione**: solo italiano, blocca espansione internazionale.
9. **Firestore security rules** non versionate nel repo — da audit.
10. **Nessun test automatico**.
11. **Nessuna analytics** — impossibile misurare funnel/retention.
12. **Rispetto IP**: il gioco è "ispirato a Giorgio Dendi" — per pubblicazione commerciale serve chiarire posizione legale sul concept.

## Opzioni di porting da valutare
- **A. PWA "installabile"** — minor sforzo, publish come TWA su Google Play. Distribuzione iOS solo via browser.
- **B. Capacitor / Cordova wrapper** — riuso ~100% del codice, deploy su App Store + Play Store, accesso a push/IAP native.
- **C. Rewrite React Native / Flutter** — massimo controllo UX mobile, costo alto, riscrivere generator/auth/sync.
- **D. Solo mobile web ottimizzato + campagne** — no store, ma migliore UX mobile.

## Domande chiave per l'agente valutatore
- Il target è **retention** (streak, notifiche, achievements) o **acquisizione** (viralità share, ASO)?
- Monetizzazione: gratuito con ads, freemium (archivio a pagamento), o abbonamento?
- Investimento previsto in ore/settimane di sviluppo?
- Ambito geografico: solo IT o multi-lingua da subito?
- Rischio IP sul concept: c'è accordo con Dendi o è un progetto amatoriale?

## Fase 0 implementata (11/08/2026)

Prerequisiti di misura del `GO_KILL_TEST_PLAN.md` — completati.

### Analytics
- Aggiunto SDK `firebase-analytics-compat` 10.12.0 in `index.html`.
- `firebase-config.js` espone `window.firebaseAnalytics` solo se l'utente ha dato consenso (`localStorage.alberi_consent === 'granted'`). Auth + Firestore restano sempre attivi.
- Helper globale `window.trackEvent(name, params)` — no-op se analytics non pronto (safe per Firebase down o consenso negato).
- Helper globale `window.getReferralSource()` — legge `utm_source=share` da URL, persiste in `localStorage.alberi_referral`, ritorna referral corrente.

### Eventi tracciati
- `app_open` — al load (script.js `init`), con `referrer`, `utm_source/medium/campaign`, `referral_source`.
- `puzzle_start` — in `loadDailyLevel` quando si carica un puzzle nuovo (non gia' completato), con `{size, date, is_archive}`.
- `puzzle_complete` — in `handleWin`, con `{size, date, time_seconds, is_archive}`.
- `share_tap` — in `shareResult`, con `{size, date, method: 'native'|'clipboard'}`.
- `signup` — in `auth.js` dopo `createUserWithEmailAndPassword` (email) e dopo Google login se `additionalUserInfo.isNewUser`.
- `login` — in `auth.js` dopo `signInWithEmailAndPassword` (email) e dopo Google login esistente (popup + redirect fallback).
- `signup`/`login` includono `referral_source` se presente.

### Attribuzione share (K-factor)
- `shareResult` genera URL con `?utm_source=share&utm_medium=user&utm_campaign=alberi_daily&ref={uid|anon}`.
- L'URL viene passato a `navigator.share` (mobile) e appeso al testo copiato negli scenari clipboard.

### Privacy & consenso
- Nuova pagina `privacy.html` (stessa estetica, italiano, data 11 agosto 2026): dati raccolti, finalita', base giuridica (art. 6 GDPR), Firebase come processor, diritti utente, contatti.
- Banner di consenso fixed in `index.html` (visibile solo se `alberi_consent` non settato): bottoni "Accetta" / "Solo essenziali". Se `denied`, analytics NON viene inizializzato.
- Link "Privacy" in footer nell'app-container.

### File modificati / creati
- Modificati: `firebase-config.js`, `index.html`, `script.js`, `auth.js`, `PROJECT_STATE.md`.
- Creato: `privacy.html`.

### TODO manuali (fuori codice)
- In console Firebase: abilitare Google Analytics per il progetto `alberi-daily` e collegare la property GA4 (Project settings > Integrations > Google Analytics). Recuperare il `measurementId` reale e sostituirlo in `firebase-config.js` (attualmente placeholder `G-PLACEHOLDER`).
- Definire nella property GA4 le coorti retention D1/D7/D30 e i funnel su `puzzle_start` -> `puzzle_complete` -> `share_tap`.
