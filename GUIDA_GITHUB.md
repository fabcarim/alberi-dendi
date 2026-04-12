# Guida: Come Caricare il Progetto su GitHub

Poiché `git` non sembra essere installato o configurato nel tuo terminale, il modo più semplice è utilizzare l'interfaccia web di GitHub.

## Metodo 1: Caricamento via Web (Più semplice)

1.  Vai su [GitHub.com](https://github.com/) e accedi al tuo account.
2.  Clicca sul pulsante **New** (o **+**) in alto a destra per creare un nuovo repository.
3.  Dai un nome al repository (es. `alberi-daily`).
4.  Seleziona **Public** (se vuoi che sia visibile a tutti).
5.  Clicca su **Create repository**.
6.  Nella schermata successiva, cerca la sezione **"…or create a new repository on the command line"** ma ignorala. Cerca invece il link: **uploading an existing file**.
7.  Clicca su **uploading an existing file**.
8.  Apri la cartella del tuo progetto sul computer: `c:\Users\Samer\Desktop\alberi`.
9.  Seleziona **TUTTI** i file (`index.html`, `style.css`, `script.js`, `generator.js`, `utils.js`, `levels.js` se presente).
10. Trascinali nell'area di upload su GitHub.
11. Aspetta il caricamento, poi scrivi un messaggio in "Commit changes" (es. "Versione iniziale Alberi Daily").
12. Clicca su **Commit changes**.

## Metodo 2: GitHub Desktop (Consigliato per il futuro)

1.  Scarica e installa [GitHub Desktop](https://desktop.github.com/).
2.  Apri GitHub Desktop e accedi.
3.  Vai su **File** > **Add Local Repository**.
4.  Seleziona la cartella `c:\Users\Samer\Desktop\alberi`.
5.  Potrebbe dirti che non è un repository git. Clicca su **create a repository here**.
6.  Conferma la creazione.
7.  Clicca su **Publish repository** in alto a destra per inviarlo al tuo account GitHub.

## Come Attivare il Sito Web (GitHub Pages)

Una volta caricati i file su GitHub:

1.  Vai nelle **Settings** del tuo repository su GitHub.
2.  Nel menu a sinistra, clicca su **Pages**.
3.  Sotto **Build and deployment**, seleziona **Source** -> **Deploy from a branch**.
4.  Sotto **Branch**, seleziona `main` (o `master`) e la cartella `/(root)`.
5.  Clicca **Save**.
6.  Dopo qualche minuto, GitHub ti darà un link (es. `https://tuo-nome.github.io/alberi-daily/`) dove il gioco sarà giocabile online da chiunque!
