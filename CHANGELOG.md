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

## [0.15.0] - 2026-08-17

### Added

- Navigate between songs from inside a song. A drawer lists the songs of the
  context you came from — artist, style, list, or the search results — with the
  current one marked and scrolled into view, and previous/next arrows ride the
  same show-and-fade cycle as the autoscroll control.
- The chart header now says where you are: `3 of 24 in Djavan`.

### Fixed

- Switching songs while already on the play screen left the previous song's
  transport running, its scroll and control timers alive, and its media loaded.
  Only duplicate-in-key reached that path before; the drawer makes it routine.
- With the chord-shape editor open, switching songs left it pointing at the
  previous song. A save then wrote the fingering into that song's dictionary,
  silently, while the screen showed the new one. Every other screen transition
  already cleared the editor — opening a song was the one door that did not.

## [0.14.3] - 2026-08-17

### Added

- Chord dictionary: 31 new voicings, covering the names the Chediak songbook
  repertoire needs — inverted-bass shapes (`G6/B`, `Dm/F`, `E7/G#`, `A7/C#`,
  `A/G`, `Bb(add9)/D`…) and common extensions (`D7(9)`, `E7(b9)`, `A7(13)`,
  `C7M(9)`, `C6(9)`, `Cm7(b5)`, `Db7M(9)`, `Am(7M)`…). Before this the catalog
  had 80 shapes and 31 names in the imported songs opened an empty diagram in
  the chord popover. Each shape was picked by search and validated against the
  chord name: required notes present, no foreign note, root (or the named bass)
  in the bass, at most a 4-fret span, no muted string in the middle.

### Fixed

- `toBr` was not idempotent for names whose alteration is already parenthesized:
  `D7(b9)` became `D7((b9))`, and one more pair of parentheses on every pass.
  The alteration matched inside its own parentheses. Now the parenthesized forms
  are matched first and map to themselves, keeping the single-pass design and
  avoiding lookbehind, which Safari only supports from 16.4. The idempotency test
  sweeps the catalog, so the defect only surfaced once `D7(b9)` was added to it.

## [0.14.2] - 2026-08-17

### Changed

- **A column of the Songs grid is a reading width, not a fitting width.** The
  minimum column goes from 340px to 480px. Subtract from a column the play
  glyph, the source badge, the two buttons and the gaps between them — 248px
  that do not shrink — and what is left is the title's. At 340px that was about
  120px: two words, then an ellipsis. At 480px it is around 230px, and since
  the grid divides the leftover among the columns, in practice the title gets
  more. A 1912px screen goes from five columns to three, 600px each.
- **Every break now asks for a bigger screen.** The second column arrives at
  about 1044px of window, the third at 1552px, the fourth at 2060px. A tablet
  in portrait stays on a single column on purpose — one wide row reads better
  than two clipped ones, and the songs a screen holds was never the number that
  mattered. Below 480px of window the column follows the window instead, so a
  phone never scrolls sideways.

  *(0.14.1 carried a first pass at this — a 400px column above 1400px of window
  only. It was superseded before release and its numbers are not in any build.)*

## [0.14.0] - 2026-08-16

### Added

- **Key transposition.** Tapping the key pill in a text chart opens a popover
  with half-step buttons, a twelve-key grid and a reset — the shape musicians
  already know from CifraClub. Chords are re-placed in their original character
  columns, so a chord stays over its syllable even when `C` becomes `C#`.
- A song with no key recorded now shows one **guessed from the last chord of the
  chart**, marked with `?` until the field is filled in on the edit screen.
- **Duplicate in this key** saves a transposed chart as a new song named
  `Title (Key)` — an identical copy, audio included, with its own bytes.

### Notes

- Transposition is ephemeral: it resets when you leave the song, and no field is
  added to the song record. The `.somaplay` format is unchanged.
- Audio and tablature do not follow the transposition, and the app says so while
  you are away from the original key. Image charts are out of scope.

## [0.13.0] - 2026-08-16

### Changed

- A text chart now has a **maximum reading measure of 96 columns**. A songbook
  system runs 127 to 132 columns; on a wide screen that fits on one line, and
  fitting it was the complaint — the eye cannot follow a chord to its syllable
  across 132 columns. Past 96 the line now breaks even though it would fit, and
  because the break hunts for the phrase, it lands at the end of one. The cap
  applies to the wrap measure only, not to the box: capping the box would make
  the fit-to-width step below see a smaller box and shrink the font for no
  reason.
- A text chart now **shrinks to fit before it breaks**. The width of a system is
  the width the songbook printed — 127 to 132 columns across the Caetano Veloso
  vol. 1 songs measured so far — and splitting one in two undoes the phrasing
  the book itself wrote. The chart font now steps down until the widest system
  fits the column, and only below a legible floor (15px) does a system wrap. On
  a wide screen nothing wraps at all; the zoom setting stays the ceiling, so the
  adjustment only ever shrinks.
- When a system does have to wrap, **it breaks where the song breathes**. The
  printed chart encodes a phrase as a wide gap — where the music breathes, the
  book leaves several spaces. The old cut stopped at the first usable space, so
  a single space between two words counted as much as a gap of nine: across the
  Caetano vol. 1 library, 54 of 72 breaks landed mid-phrase, splitting things
  like `Visão   do | espaço`. The cut now looks back up to a quarter of the line
  for the widest gap common to both the chord and the lyric row. Same corpus at
  72 columns: 35 mid-phrase instead of 54, and 19 breaks on a real breath
  instead of 4.

## [0.12.1] - 2026-08-15

### Changed

- The Artists and Styles grids are denser. The number of columns now follows the
  window width instead of a fixed four, and each card is a compact row — thumb,
  name, count — rather than a tall stack. A wide monitor fits around eight
  columns where it used to fit four, and a card is roughly half as tall. With a
  library past 200 artists, the old grid spent most of the screen on padding.
- An artist or style thumb now shows two initials when the name has two words:
  Gilberto Gil is **GG**, Banda Mel is **BM**, Rock Nacional is **RN**. Articles
  and prepositions don't count as words, so A Turma do Seu Lobato is **TS**. A
  single-word name keeps its single letter. Twenty artists whose names start
  with A no longer render as twenty identical blocks.

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

  A song that arrives from a share is dated the day it arrives, so it lands at
  the top of **Recém-adicionadas** for whoever received it. A complete backup
  still restores the original date.

- **Compartilhar** hands the file to the system share sheet where the browser
  offers one, so on Android it reaches WhatsApp in a single tap instead of going
  through Downloads. **Exportar** in Settings still downloads — a backup is a
  file you keep, not something you send.

- **Substituir tudo** now says what a partial file will cost before it does it.
  A file that carries no audio, no charts, no favourites and settings, or no
  lists gets a line of its own in the confirmation, one per missing piece.

  This matters most for the two pieces that do *not* change the file name: an
  export with **Minhas favoritas e ajustes** and **Minhas listas** unchecked is
  named exactly like a complete backup, so months later there is nothing in the
  Downloads folder to tell them apart. Replacing with the wrong one rewrites the
  library with no favourites, no dates, no settings and no playlists. The
  warning is the only thing that says so. The lists warning is skipped when the
  device has no lists to lose.

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
