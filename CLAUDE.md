# CLAUDE.md

Guidance for Claude Code (claude.ai/code) working in this repository.

## What this project is

**soma_play** — an offline, installable PWA for reading guitar chord charts ("cifras"),
playing along with multitrack audio, and karaoke. Built for a tablet on a music stand:
at home, at rehearsal, and on stage. Android tablet (Chrome) is the primary target,
desktop secondary.

It started as a personal project and is now **open source and in production**:

- Live at **https://somacavalieri.github.io/somaplay/** — every push to `main` deploys
  via `.github/workflows/pages.yml`
- Public repo under **MIT** (`LICENSE`), with `README.md` / `README.pt-BR.md` and
  `CONTRIBUTING.md`
- The app in `app/` is real, working software — roughly 4,000 lines across 27 ES modules

**Disambiguation:** the parent `My Drive/CLAUDE.md` is auto-loaded and describes a
different project (3D boxes). It does not apply here.

## Running and testing

No dependencies, no build step, no package manager. Plain ES modules served as-is.

```bash
cd app && python3 -m http.server 8137   # → http://localhost:8137
cd app && node --test                   # test suite, Node >= 20, installs nothing
cd app && node --check js/main.js       # syntax check one module
```

A static HTTP server is required — `file://` breaks the Service Worker, OPFS and ES
modules.

Verification works in three layers, and the third counts: `node --test` for pure logic,
`node --check` for syntax, and **manual verification in the browser** for anything
touching the UI. There is no DOM test harness, on purpose.

## Language

- **English:** `README.md`, public docs, code comments in new code, commit messages
- **Portuguese:** `docs/superpowers/` specs and plans — the honest design history
- **Both:** the app's interface, via a PT/EN selector

## Architecture

- **No backend.** The whole library lives on the device.
- **Mode is a global lens.** The top of the app selects **T1 Cifra**, **T2
  Acompanhamento** or **T3 Karaokê**, and the entire library filters to what exists in
  that mode. Playing a song is one tap; inside a song the T1/T2/T3 switch doubles as a
  feature indicator.
- **Views:** Artistas, Músicas, Estilos, Listas. Listas are global — they ignore the
  mode lens, and opening a song from a list plays it in its best available mode.
- **Content model:** `Artista → Música`. A song's chart is **image or text**, chosen per
  song. Images are tagged `aberta | fechada` (with/without chord diagrams). A song also
  has audio `stems`, a karaoke `letra`, an `estilo` and a `favorita` flag.
- **Audio:** Web Audio API. One gain node per stem, all sharing a single transport clock
  so global play/pause/seek stay in sync.
- **Storage:** large files (audio, images) in OPFS; metadata in IndexedDB. Backup
  exports and imports the whole library as one `.somaplay` file, with a merge mode that
  upserts by id.
- **i18n:** `js/i18n.js` exports `t(key, params)`, `setLang`, `getLang`, `detectLang`.
  Tables are `js/i18n/pt.js` and `js/i18n/en.js`, flat key→string, namespaced by screen.
- **Chord notation:** `js/chord-notation.js` converts chord names between Brazilian
  (`C7M`) and international (`Cmaj7`) spelling. Pure, no state.

## Things that will bite you

Hard-won. None of these are obvious from reading the code.

**Never rename `DB_NAME` in `app/js/db.js`.** It is the IndexedDB database name. Changing
it makes the app open an empty database — every user's library disappears. The name is
invisible to users; there is no reason to touch it.

**Changing the `SHELL` array in `app/sw.js` requires bumping the version.** The
install step calls `cache.addAll(SHELL)`, which fails entirely if any path is missing,
and without a new cache key installed clients keep the old list. Since 0.9.0 the cache
key *is* the product version (`somaplay-0.9.0`), declared in two places — `app/js/version.js`
and line 2 of `app/sw.js` — and kept in sync by `app/test/version.test.js`. So any
release that touches `SHELL` is at least a PATCH, and the number on the Settings screen
is proof of which cache is being served. **Every new module under `app/js/` must be added
to `SHELL`**, or the app breaks offline; `app/test/shell.test.js` catches that one.

**Never translate or renotate the user's chart.** A text chart aligns chords over lyrics
by character column — `A7M` is 3 characters, `Amaj7` is 5. Any substitution inside chart
text shifts every chord on the line and destroys the alignment. The notation preference
applies to what the app generates (the chord dictionary, its search), never to the user's
content. Same for the "Acordes desta música" grid and the chord popover: they show the
name as it appears in the chart.

**Never put a `data-*` attribute value behind `t()`.** Values like `data-id="CifraClub"`
and `data-tipo="aberta"` are persisted into the song record. Translating one makes a
library saved in English diverge from one saved in Portuguese. Translate the visible
label only.

**Translation keys go in BOTH tables.** A parity test in `app/test/i18n.test.js` fails
otherwise. And translated strings must be produced at render time — a module-level
constant holding translated text is frozen at import and will not update when the
language changes.

**A list's `musicas` may hold ids with no song, so DOM position ≠ array index.** The ids
are there on purpose: a filtered export carries every list whole, orphans included, so
the missing songs heal themselves when the other source is imported later. The screen
skips those rows, which means the *n*-th row on screen is not `l.musicas[n]`. Anything
mapping between the two spaces must translate explicitly — `musicasPresentes(l)` for
counts, `indicesPresentes(l)` for positions. Drag-to-reorder shipped without that
translation and silently persisted the wrong show order: `listdrag.js` counts DOM rows
while `moveItem` indexes the real array. Keep both the pointer and the keyboard path
speaking **visible** positions, and translate in one place (`applyReorder`).

**No third-party musical content in the repo** — no chord charts, lyrics, tablature or
recordings you do not own. This applies to source code too: the demo songs once embedded
full lyrics as string constants, and removing them was its own cleanup. The example song
that ships with the app was written for the project.

## How changes get made

**spec → plan → implementation.** A design decision is written to
`docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` before code is touched; that spec
becomes a plan in `docs/superpowers/plans/`; only then does implementation start. Use the
superpowers brainstorming → writing-plans workflow, and do not jump to implementation
skills before a plan exists.

Treat the specs as living: when a decision changes, update the relevant section rather
than leaving it only in chat. `docs/superpowers/specs/2026-06-25-soma-play-design.md` is
the original PRD and is still referenced by section number (§5 content model, §6
navigation, §7 Listas, §11 out-of-MVP).

## The `chords/` asset library

`chords/` is the author's local source material (songbook PDFs and loose cifra images),
~1.8 GB. It is **gitignored and stays that way** — it is third-party content. Structure,
if you are adding to it locally:

```
chords/<Artista>/chords/      ← loose single songs (.png/.jpg/.psd)
chords/<Artista>/songbook/    ← complete songbook PDFs
chords/Coletaneas/songbook/   ← multi-artist songbooks
chords/_a-identificar/        ← songs whose artist isn't identified yet
```

Captured cifra images are often low-resolution (~595px wide) and blur on a tablet —
prefer ~2× sources.

**Extraction progress is tracked in three levels, and only the bottom one is written
by hand.** `chords/<acervo>/<documento>/INDICE.md` is the single source of truth —
front matter plus a table whose `Status` column holds one of six emoji. Above it,
`chords/<acervo>/PROGRESSO.md` and the `chords/PROGRESSO.md` dashboard are generated
by `python3 scripts/chords/progresso.py`, which rewrites only the region between
`<!-- chord:auto -->` markers and never touches an `INDICE.md`. Everything outside
those markers is hand-written prose — measured page maps, scan state, decisions — and
losing it would cost months. The **`/chord` skill** (`.claude/skills/chord/`) drives
all of this, with one recipe per material type.
