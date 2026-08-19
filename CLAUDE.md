# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static, no-build, no-server web app ("Acquisizione 2 Sarpi") that Gaetano (and Ciro) use on their phone/desktop as an operational tool for a solo/small real-estate acquisition practice in Milan. Everything — leads, mandates, network contacts, condo admins, activity log — lives in the browser's `localStorage` (key `ag2sarpi.acquisizione.v1`). There is no backend, no build step, no npm/package.json. Deployed as static files (GitHub Pages style — see `.nojekyll`).

## Commands

There is no build/lint/test tooling in this repo. Development is: edit the HTML/CSS/JS directly, open the page in a browser, done.

- **Bump the cache-busting version on all pages after editing CSS/JS:** `./versione.sh` — rewrites every `?v=` query string on `js/*.js`, `pagine/*.js`, and `css/stile.css` references across all `*.html` files to the current timestamp, so browsers reload the changed assets instead of serving cached copies. Run this before committing changes to CSS/JS.
- **App icons:** `icone/genera_icone.py` regenerates the PNG icon set from a source image.

## Architecture

### One page = one route, one shared shell

Each top-level feature is a standalone HTML file (`index.html`, `radar.html`, `pipeline.html`, `rete.html`, `condomini.html`, `gestione.html`, `cruscotto.html`, `strumenti.html`, `metodo.html`, `dati.html`, `scaduti.html`, `annuncio.html`). Every page has an identical minimal `<body>`:

```html
<main><section id="vista"></section></main>
<script src="js/contenuti.js"></script>
<script src="js/nucleo.js"></script>
<!-- page-specific extra scripts, e.g. js/annunci.js, js/sorgenti.js -->
<script src="pagine/<nome>.js"></script>
```

`pagine/<nome>.js` calls `avviaPagina(renderFn)` (defined in `js/nucleo.js`), which builds the header/nav ("guscio"), calls `render()` to fill `#vista` with the HTML string `renderFn()` returns, appends the footer, and wires up swipe navigation. There is no framework/router/virtual DOM: page functions return template-literal HTML strings that get assigned via innerHTML-style rendering, and event delegation (`data-az` attributes handled by the global click listener in `js/nucleo.js`) drives all interactivity.

### Shared modules (load order matters)

- **`js/contenuti.js`** — pure data/content: municipi, price-band table (`ZONE`), lead sources (`FONTI`), the 90-day outreach cadence (`SEQUENZA`), the "grappolo" (cluster) playbook, network categories (`RETE_CATEGORIE`), per-plan targets (`TARGET["500"]`/`TARGET["1000"]`), compliance checklist (`CONFORMITA`), sales scripts (`SCRIPT`), the 90-day plan (`PIANO90`), and the long-form playbook text (`PLAYBOOK`). No personal/client data lives here — it's the static "operating manual" content, in Italian, that the app makes browsable/usable.
- **`js/nucleo.js`** — shared runtime: state load/save (`carica`/`salva` against `localStorage`), formatting/DOM helpers (`$`, `$$`, `esc`, `eur`, `dataIt`, ecc.), lead scoring (`punteggio`, `scostamento`, `provvigione`), activity counters (`CONTATORI`, `attivitaDi`, `somma*`), due-date computation for the outreach sequence and cluster protocol, the modal/window system (`apriFinestra`/`chiudiFinestra`/`raccogli`), the page shell (`guscio`, `piedino`, `PAGINE` nav list), the global `data-az` action dispatcher, and touch-swipe back/forward navigation (needed because the installed PWA has no browser chrome).
- **`js/annunci.js`** — listing normalization/deduplication engine: street-name/civic-number parsing, cross-portal duplicate detection (`somiglianza`/`raggruppaAnnunci` — the same property posted on 5 portals must collapse to one row), portal identification from URL (`PORTALI`/`portaleDaUrl`).
- **`js/sorgenti.js`** — external data sourcing: calls Apify actors directly from the browser (token stored only in `localStorage`, never sent to any server of ours) to scrape private listings from Subito/Idealista, and to find condo administrators via Google Places; also does free reverse-geocoding via OpenStreetMap Nominatim.
- **`pagine/*.js`** — one file per page, each exporting a `vista*()` render function and any page-local logic/actions.

### State shape

Single global `S` object (see `VUOTO` in `js/nucleo.js`) persisted whole to `localStorage` on every `salva()` call: `lead`, `mandati`, `rete`, `gestione`, `attivita`, `optout`, `annunci`, `amministratori`, `condomini`, `conformita`, `piano90`, `recensioni`, `spesa`, plus the active `piano` ("500" or "1000") and `operatore`. Two operating plans (500€/mese, 1.000€/mese) drive different targets/budgets throughout — check `S.piano` / `T()` (current plan's `TARGET` entry) when adding anything that depends on plan tier.

### Conventions

- All user-facing text, comments, and identifiers (variables, functions) are in Italian — match this when editing.
- No client-side framework: rendering is template strings + `innerHTML`; use `esc()` for any user-supplied value interpolated into HTML.
- Interactive elements use `data-az="<azione>"` + the delegated listener in `js/nucleo.js` (`AZIONI` map) rather than inline `onclick` or per-element listeners; page files extend behavior by adding to the same pattern.
- Privacy/compliance is a first-class concern baked into the product itself (`CONFORMITA` in `contenuti.js`): opt-out list (`S.optout`) must be checked before contacting anyone, and scraping must stay within portal ToS (saved searches/alerts, not mass scraping).
