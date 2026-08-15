# Changelog

All notable changes to soma_play are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the numbering follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
as adapted below.

## Versioning rules

While the version is `0.x`, the backup format may still change in incompatible
ways. `1.0.0` ships when the `.somaplay` format is frozen with a compatibility
guarantee for import and export.

- **MINOR** (`0.9 → 0.10`) — a change to what the app *does*: a new capability,
  or behaviour that changed or was removed.
- **PATCH** (`0.9.0 → 0.9.1`) — a fix or adjustment to behaviour that already
  existed.

Two rules keep the number honest:

- **Any release that changes a file listed in `SHELL` is at least a PATCH.** Not "editing the
  array" — changing anything the array precaches, which in practice means any change under
  `app/`. The version *is* the cache key, so a new release always means a new cache. The narrow
  reading is how stale files ship: a CSS-only fix without a bump is served from the old cache
  forever. The same goes for changing `sw.js`'s own logic, which is not in `SHELL` but ships
  with it.
- **Changes outside the app do not bump the version** — `docs/`, specs, plans,
  `scripts/`. The number tracks the app, not the repository.

## [Unreleased]

Nothing yet.

## [0.12.0] - 2026-08-15

### Added

- A `.somaplay` file now declares which **parts** it carries — `cifra`, `audio`,
  `pessoal` — and sharing can leave parts out. You can send a repertoire as
  charts only, small enough for WhatsApp, and send the audio afterwards as a
  separate pack that finds its own songs.

  New: **Compartilhar** in the ⋯ of a list and of an artist, with the size of
  each option shown before you choose; and four checkboxes in Settings — Charts,
  Audio, My lists, My favourites and settings — that are the same vocabulary,
  so a backup can be narrowed the same way.

- **Compartilhar** hands the file to the system share sheet where the browser
  offers one, so on Android it reaches WhatsApp in a single tap instead of going
  through Downloads. **Exportar** in Settings still downloads — a backup is a
  file you keep, not something you send.

### Fixed

- Importing a file no longer overwrites what the receiving device did with those
  songs. The merge now only touches the fields of the parts the file actually
  declares, so a shared repertoire stops wiping the recipient's favourites, and
  a chart-only file stops deleting audio that is already there. Absence in a
  file is no longer read as an instruction to delete.

## [0.11.0] - 2026-08-15

### Added

- Chord charts can now use a whole chord as the bass — `Dm7/G7`, `C/Bb7M`,
  `Am7/D9`. The slash after a chord already accepted a bass *note* (`D/F#`) and
  a CifraClub-style extension (`A7/13`), but not a bass *chord*.

  This was not cosmetic. A token the parser does not recognise drops the whole
  line, because a chord line requires every token to be a chord or a mark — so
  the chart was demoted to lyrics and the song opened **with no chords at all**,
  without any error. Almir Chediak prints `Dm7/G7` twenty-two times in *Beleza
  pura* alone, so that whole song was unreadable.

## [0.10.0] - 2026-08-14

### Changed

- The source filter is now a strip of pills that is always visible, in the same row
  as the tabs, instead of a dropdown behind a tag icon. The filter state and every
  source's song count are readable without a click.
- Sources combine: the first click on a source isolates it, further clicks add and
  remove. Removing the last one — or selecting every source — returns to **All**.
- The selection persists between sessions. On startup it is pruned against the
  sources the library actually has, so a source deleted or missing from a restored
  backup cannot leave the library looking empty with nothing on screen to explain it.
- Each source carries a fixed colour, derived from its name so it stays the same
  across devices.

### Removed

- The source dropdown and its tag button in the top bar.

## [0.9.0] - 2026-08-14

First numbered release. The app was already in production and in use on stage;
this is where it starts carrying a version you can read.

What it does today: chord charts as image or text, play-along with per-stem
volume on a shared transport clock, karaoke, songs organised by artist, style
and list, `.somaplay` backup with a merge mode that upserts by id, a chord
dictionary with custom fingerings, Brazilian and international chord spelling,
PT/EN interface, and full offline operation as an installable PWA.

### Added

- Version number in Settings, under **About**.
- This changelog.

### Changed

- The service worker cache key is now the product version (`somaplay-0.9.0`)
  instead of an ad-hoc counter (`somaplay-v39`). One number, one meaning: a
  release cannot ship without a new cache.
