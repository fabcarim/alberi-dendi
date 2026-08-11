---
date: 2026-08-11
data_evento: 2026-08-11
source: claude-code-manuale
type: progetto
tema: tecnologia
status: da-usare
contesto: "Piano operativo per l'agente che implementa Alberi Daily. Obiettivo: rendere l'app TESTABILE per una decisione go/kill economica (retention + viralità), NON un build commerciale completo. Spesa minima, misura prima di investire."
tags: [alberi-daily, app, implementazione, go-kill, analytics, pwa, i18n, retention, brief-agente]
---

# Alberi Daily — piano per l'agente implementatore (test go/kill)

> Da leggere insieme a `PROJECT_STATE.md` (stato repo) e alla nota [[Alberi Daily - valutazione economica pubblicazione store (subscription vs ads) - 10-08-2026|valutazione economica]].
> **Principio guida (vincolante):** NON costruire il prodotto commerciale completo. Costruire il **minimo per MISURARE** se il motore organico esiste (retention + viralità). Si scala solo se le metriche passano la soglia. Ogni ora spesa oltre la misura, prima del go, è sprecata.

## Obiettivo unico
Portare l'app da "prototipo su GitHub" a "**strumento di misura live**" che in 4-6 settimane risponda a 2 domande:
1. **Gli utenti tornano?** (retention D1/D7/D30)
2. **Gli utenti ne portano altri?** (K-factor via share) e a che costo (CPI se si prova UA)

## FASE 0 — Prerequisiti di misura (BLOCCANTE: senza questi il test non esiste)
1. **Analytics eventi** (oggi: nessuna). Integrare uno strumento leggero (es. GA4/Firebase Analytics o PostHog). Tracciare almeno:
   - `app_open`, `puzzle_start`, `puzzle_complete` (con size, tempo), `share_tap`, `signup`, `return_day` (per coorti).
   - **Coorti di retention D1/D7/D30** per data di primo accesso.
2. **Attribuzione dello share** — ogni link condiviso porta un parametro (referral/UTM) → misurare quanti install/signup arrivano da uno share = **K-factor**.
3. **Privacy policy + consenso** (serve per analytics/GDPR e per gli store). Pagina pubblica + banner minimo.

## FASE 1 — Leve a basso costo che alzano il tetto (fare solo queste ora)
4. **Multilingua (i18n)** — la leva più grande a costo minimo. Estrarre le stringhe, `lang switch` + auto-detect. Almeno **EN + IT** (poi ES/FR). I logic puzzle sono language-agnostic → sblocca il mercato globale.
5. **Share hook "brag-worthy"** — risultato **spoiler-free** (griglia/emoji o card visiva) + link con referral. Deve essere condivisibile come Wordle. È il motore virale: curarlo è priorità.
6. **Retention: streak + achievements** (oggi assenti = retention debole). Contatore streak giornaliero, badge base, messaggio "torna domani". È la leva #1 di ritorno per un daily game, costo basso.
7. **PWA installabile** — `manifest.json`, service worker, offline shell. Distribuzione a costo zero (installabile da browser, TWA su Google Play). Prima dello store nativo.
8. **UX mobile touch** — sostituire il click-destro=croce (inesistente su mobile) con **long-press**; verificare tap targets.

## FASE 2 — SOLO se le metriche di Fase 1 passano la soglia (altrimenti STOP)
9. **Capacitor wrapper** → App Store + Google Play, con **push notification** ("nuovo puzzle") e base per IAP. *(Opzione B del PROJECT_STATE: riuso ~100% codice. Rewrite native = NO.)*
10. **Monetizzazione** — introdurre solo ORA e nella forma minima: **freemium/IAP one-shot** (no-ads / archivio / taglie extra). **NIENTE ads** (serve scala che non c'è a inizio). Subscription solo se si evolve a **suite** multi-gioco.

## Cosa NON fare adesso (anti-spreco)
- ❌ Ads, IAP, subscription (finché retention/viralità non sono provate).
- ❌ Rewrite React Native/Flutter.
- ❌ Nuovi contenuti/feature di gioco oltre il necessario.
- ❌ Build/publish nativo prima che la PWA mostri le metriche.

## KPI e soglie GO / KILL (fine test, 4-6 settimane)
| Metrica | Come | Soglia indicativa GO |
|---|---|---|
| Retention D1 | coorti | > 40% |
| Retention D7 | coorti | > 20% |
| Retention D30 | coorti | > 10% (sticky per un daily) |
| K-factor (organico) | install da share / utenti | ≥ 0.5 (→1 = virale) |
| CPI (se test UA) | spesa / install | tale che LTV plausibile > CPI |

*(Soglie da calibrare; il segnale forte è **D30 alto + K-factor che sale**.)*
- **GO** → investire su canale di distribuzione + eventuale budget UA + Fase 2.
- **KILL / tieni-hobby** → nessun budget salva un imbuto bucato; resta progetto-vetrina a costo zero.

## Gate fuori-scope-agente (ma da risolvere prima del commerciale)
- ⚠️ **IP "ispirato a Giorgio Dendi"** — chiarire posizione legale su nome/concept prima di qualsiasi pubblicazione commerciale (mechanic generico, ma nome/associazione no).
- **Firestore security rules** — versionare nel repo + audit (oggi non versionate).

## Consegna
Mettere questo file nel repo (es. `GO_KILL_TEST_PLAN.md`) accanto a `PROJECT_STATE.md`. L'agente esegue Fase 0 → 1, poi si ferma e riporta le metriche per la decisione go/kill.

## Collegamenti
- [[Alberi Daily - valutazione economica pubblicazione store (subscription vs ads) - 10-08-2026]]
