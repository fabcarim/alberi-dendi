# Alberi Daily — Stato attuale dell'applicazione

_Aggiornato al 19 novembre 2026_

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
- ~~**Login obbligatorio**~~ — dal 19/11/2026 si gioca subito come utente anonimo (vedi "Blocchi 1 e 2").
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


## Blocchi 1 e 2 (19/11/2026)

Contesto dati: 131 iscritti, 38% del traffico da giorgiodendi.com, 403 tap su "condividi" ma 0 visite registrate da link condivisi (GA4 vede solo chi accetta il banner). Il login obbligatorio bloccava i nuovi utenti.

### Blocco 1 - bug e sicurezza
- **Data del puzzle in ora locale**: nuovi helper in `utils.js` `localDateStr(date)` e `parseLocalDate('YYYY-MM-DD')`. Sostituiti tutti i `toISOString().split('T')[0]` (oggi, min/max archivio, analytics, streak) e i `new Date(todayStr)` (domenica 12x12, date formattate). Il seed resta `${date}_${size}`: generatore invariato, i puzzle passati restano identici (cambia solo l'ora in cui scatta il nuovo giorno: mezzanotte locale invece di 01:00/02:00).
- **XSS**: helper `escapeHtml` (utils.js) applicato a nickname in classifica, displayName in header, statistiche, sottotitolo archivio. Validazione nickname (`validateNickname`: 2-20 caratteri, niente `<>`) in registrazione e modale nickname; `sanitizeNickname` sul nickname scritto in classifica (taglia a 20 i displayName Google lunghi, cosi' passano le regole).
- **Regole Firestore versionate**: `firestore.rules` (vedi sotto come pubblicarle).

### Blocco 2 - far entrare e far condividere
- **Gioco senza login (Anonymous Auth)**: l'overlay non e' piu' bloccante; all'avvio, senza utente, `signInAnonymously()`. Header: "Accedi / Registrati" (+ 📊) per gli anonimi; la modale e' chiudibile (× o clic fuori). Registrazione da anonimo = `linkWithCredential` (email) / `linkWithPopup` o `linkWithRedirect` (Google): uid e dati restano. Se email/account Google esistono gia' (`auth/email-already-in-use`, `auth/credential-already-in-use`) si fa il login normale nell'account esistente e `onAuthStateChanged` esegue `syncLocalToFirestore`. Se l'accesso anonimo fallisce (provider disabilitato, rete), il gioco funziona in locale e il pulsante "Accedi / Registrati" resta disponibile.
- **Classifica e anonimi**: un anonimo senza nickname non scrive in `leaderboard` (solo nei suoi `completions`). Al primo completamento si apre la modale nickname con "Salta" (`localStorage.alberi_nick_skipped` = non chiedere piu'). Se sceglie il nickname (o si registra), `publishRecentToLeaderboard` pubblica i completamenti locali di oggi (e del puzzle d'archivio aperto). Utenti registrati: invariati.
- **Analytics**: eventi invariati; per gli anonimi `signup` parte al momento del collegamento con `{method, from_anonymous: true}`.
- **Condivisione**: testo spoiler-free con link dentro il testo (`navigator.share({text})`, fallback clipboard con lo stesso testo, piu' fallback `execCommand` se manca la Clipboard API). La riga di 🟩 e' fissa e lunga quanto la misura: non rivela posizioni. 12x12 = "Sfida della domenica 12×12". Se l'utente annulla il foglio di condivisione non si copia piu' negli appunti (prima gonfiava `share_tap` con `method: clipboard`). Link: UTM esistenti + `&d={date}&s={size}`; chi apre il link atterra su quel puzzle se la data e' nell'archivio (ultimi 6 mesi, non futura). Eccezione: con `s=12` si atterra sulla data giusta ma col 5x5, perche' la generazione del 12x12 blocca la pagina (vedi rischi).
- **Bug corretto**: condividendo da un puzzle gia' completato si usava il timer della sessione invece del tempo salvato (`showCompletedState` ora imposta `elapsedTime`).
- **Anteprima link**: meta Open Graph + Twitter card in `index.html`; `og-image.png` 1200x630 generata da `tools/make_og_image.py` (Pillow; `python tools/make_og_image.py` per rigenerarla).
- **Arrivi da condivisione su Firestore** (indipendente dal consenso GA): se l'app si apre con `utm_source=share`, dopo l'auth (anche anonima) `saveShareReferral` scrive in `users/{uid}` `referral_ref` (=ref di chi ha condiviso) e `referral_at`, solo se non gia' presenti. Conteggio: in console Firestore filtrare la collection `users` per `referral_ref` (o query `where('referral_ref', '!=', null)`). `privacy.html` aggiornata (accesso anonimo + link di provenienza, frase in inglese in cima, data 19/11/2026).
- **i18n IT/EN**: `i18n.js` (dizionario + `t(key, params)`, `applyI18n()` per `data-i18n`, `data-i18n-html`, `data-i18n-placeholder`, `data-i18n-title`, `data-i18n-aria-label`). Lingua: `localStorage.alberi_lang`, altrimenti `navigator.language` (it* -> it, altro -> en). Selettore 🇮🇹/🇬🇧 in header; al cambio si ritraducono anche testi dinamici (stato, titolo, size selector, header account) senza ricaricare il livello. Date con `it-IT` / `en-US`. `privacy.html` resta in italiano.

### File
- Creati: `i18n.js`, `firestore.rules`, `og-image.png`, `tools/make_og_image.py`.
- Modificati: `index.html`, `style.css`, `utils.js`, `script.js`, `auth.js`, `firestore-sync.js`, `privacy.html`, `PROJECT_STATE.md`.
- Nota git: `style.css` nel repo e' salvato con CRLF mentre `core.autocrlf=true`: `git diff` lo mostra come riscritto per intero; la modifica reale si vede con `git diff --ignore-cr-at-eol style.css` (~70 righe aggiunte).

### Azioni manuali in console Firebase (prima del deploy su `main`)
1. **Authentication -> Metodo di accesso -> Anonimo: abilitare.** Senza questo il gioco funziona lo stesso, ma solo in locale per chi non e' registrato (niente sync, niente classifica, niente referral su Firestore).
2. **Firestore -> Regole: incollare `firestore.rules`.** Prima di pubblicare:
   - copiare le regole attuali in un file di backup (per poter tornare indietro);
   - nel "Rules Playground" della console provare: lettura `leaderboard` senza auth (deve passare); scrittura `leaderboard/2026-11-19_7_<uid>` autenticato come `<uid>` con `{uid, nickname: 'Test', date: '2026-11-19', size: 7, timeSeconds: 120, completedAt: request.time}` (deve passare); stessa scrittura con `timeSeconds: 2`, `size: 11`, nickname di 25 caratteri, oppure uid diverso (devono fallire); lettura/scrittura `users/<uid>/completions/x` come altro utente (deve fallire);
   - verificare che non esistano altre collection usate da altri client/script (le regole negano tutto cio' che non e' `users` o `leaderboard`);
   - l'indice composito `leaderboard` (date ==, size ==, orderBy timeSeconds) esiste gia' se la classifica funziona oggi: le regole non lo toccano.
   In alternativa, da CLI (serve `firebase login` del proprietario): `firebase deploy --only firestore:rules` con un `firebase.json` che punti a `firestore.rules`.
3. **Authentication -> Impostazioni -> Domini autorizzati**: `fabcarim.github.io` deve esserci gia' (serve per popup/redirect Google, anche per `linkWithPopup`).
4. Dopo il deploy, verificare l'anteprima del link con il debugger di Facebook (https://developers.facebook.com/tools/debug/) o incollando il link in una chat WhatsApp (la cache di WhatsApp puo' tenere l'anteprima vecchia per qualche giorno).

### Limiti noti / rischi
- **Generatore 12x12 lentissimo (preesistente, non toccato)**: in Node la generazione 12x12 richiede ~54 s (2026-11-22) e oltre 60 s / 4 min per altre domeniche (2026-11-08, 2026-11-15), sul thread principale: la pagina si blocca quando si apre la sfida della domenica. 7x7 ~4 ms, 10x10 ~80 ms. Da affrontare in un blocco dedicato (es. Web Worker o cache della griglia), senza cambiare il seed per non alterare i puzzle passati.
- `timeSeconds >= 5` nelle regole: un 5x5 risolto in meno di 5 s non entra in classifica (il completamento personale si salva comunque).
- Utenti anonimi accumulano account in Firebase Auth (uno per browser/dispositivo). Valutare in futuro la pulizia automatica degli anonimi inattivi (impostazione disponibile con Identity Platform).
- Se un anonimo che ha saltato il nickname poi si registra lo stesso giorno, i completamenti di oggi vengono pubblicati in classifica con il nickname scelto in registrazione.
- Al logout di un utente registrato si rientra come nuovo anonimo e i completamenti in `localStorage` vengono sincronizzati anche su quell'anonimo (comportamento analogo a prima, quando venivano sincronizzati sul successivo account che faceva login).
