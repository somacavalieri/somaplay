# Soma_play

**English** · [Português](README.pt-BR.md)

An offline, installable PWA for reading chord charts, playing along with multitrack
audio, and singing karaoke — built for a tablet on a music stand.

**[Try it →](https://somacavalieri.github.io/somaplay/)** · No account, no server, nothing
to install. Everything lives on your device.

![Karaoke mode](screens/karaoke.png)

---

## Why this exists

A printed chord chart can't play along with you. And every chord app I tried wanted an
account, an internet connection, and a subscription — three things a stage doesn't
reliably have.

What I actually needed was narrower and stranger than what those apps sell:

- **On stage,** a screen that stays readable under changing lights, never sleeps, and
  never waits on a network request.
- **At rehearsal,** the ability to mute the guitar stem and play that part myself — or
  mute the vocals and sing it.
- **At home,** a chart that scrolls at my own pace so both hands stay on the instrument.

Those three situations are the same songs seen three different ways. That observation
became the app's core idea.

## The three modes

The mode selector at the top of the app is a **lens over the whole library** — the
library filters itself to whatever is available in the active mode.

| Mode | What it gives you |
|---|---|
| **T1 · Chart** | The chord chart, with auto-scroll at adjustable speed |
| **T2 · Accompaniment** | A multitrack mixer — volume and mute per channel, one shared transport |
| **T3 · Karaoke** | Backing track playing, lyrics on screen |

Playing a song is a single tap — there's no intermediate mode picker. Inside a song, the
T1/T2/T3 switch doubles as a feature indicator: a disabled mode means that song has no
content for it.

## Features

**Chord charts**
- Chart per song as **image or text**, whichever the source makes practical
- **Diagrams: On/Off** — show or hide chord diagrams
- Auto-scroll with adjustable speed
- Inline diagram thumbnails above the chord line
- **Tap any chord** in the text to open an anchored diagram popover; *Variations* cycles
  through alternate shapes and *Apply* swaps that fingering across the whole song
- A **chord editor** with real barre support, and a **chord dictionary** to browse and
  store your own variations

**Audio**
- One gain node per stem, all sharing a **single transport clock**, so global
  play/pause/seek stay in sync
- Per-channel volume and mute

**Library**
- Browse by **Artist**, **Song**, **Style**, or **List**
- Setlists with drag-to-reorder, plus favorites
- Lists are global — they ignore the mode lens, and opening a song from a list plays it
  in its best available mode
- Interface in **English or Portuguese**, with chord notation in Brazilian or international convention

**Offline & data**
- Service Worker for full offline operation; installable as a PWA
- Large files (audio, images) in **OPFS**, metadata in **IndexedDB**
- **Backup** exports and imports the whole library — including lists and favorites — as a
  single `.somaplay` file, with a **merge mode** that upserts by id instead of wiping
  what's on the device

## Bring your own content

This app is a **reader**, not a library. It ships with a single example song, written for
the project. Chord charts, lyrics, and audio are **yours to add**, and they never leave
your device — there is no server to send them to.

## Getting started

Requires a static HTTP server — `file://` won't work, because of the Service Worker,
OPFS, and ES modules.

```bash
git clone https://github.com/somacavalieri/somaplay.git
cd somaplay/app
python3 -m http.server 8137
# → http://localhost:8137
```

In Chrome (desktop or Android tablet), use **menu → Install** to add it as an app. After
the first visit it works with no internet at all.

To see it working: **Settings → Load example** loads the demo song. Then
**Settings → Add song** is where you add your own — chart images or pasted
text, karaoke lyrics, and one audio file per channel.

## How it works

No backend, no build step, no dependencies. Plain ES modules served as-is.

| Concern | Approach |
|---|---|
| Audio | Web Audio API — a gain node per stem, one shared transport clock |
| Offline | Service Worker precaches the app shell, cache-first |
| Large files | OPFS (Origin Private File System) |
| Metadata | IndexedDB |
| UI | Vanilla JavaScript, ~4,000 lines, zero runtime dependencies |

Tested on Android tablet (Chrome) as the primary target, desktop as secondary.

## Contributing

Contributions are welcome. The setup is deliberately small: clone it, serve `app/`, and
you're running the real thing.

```bash
cd app
node --test        # test suite — needs Node ≥ 20, installs nothing
node --check js/main.js
```

The project follows a **spec → plan → implementation** workflow. Design decisions are
written down in `docs/superpowers/specs/` before code is touched — those documents are in
Portuguese and are the honest history of how the app got here.

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## Roadmap

Tracked as [issues](https://github.com/somacavalieri/somaplay/issues). The larger open
items:

- Chord diagram generation from text charts
- Scroll synchronized to audio playback, and time-synced karaoke lyrics
- Transpose and tempo change
- A-B loop

Deliberately **out of scope**: cloud sync, multi-user accounts, automatic stem
separation, and in-app microphone mixing.

## Status

A personal project in real use — at home, at rehearsal, and on stage — now opening up
because friends asked for it. Expect the rough edges of software written for an audience
of one.

## License

[MIT](LICENSE) — the code. The content you load into it stays yours.
