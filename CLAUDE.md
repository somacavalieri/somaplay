# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is (and is not)

This folder is **soma_play**: a *personal* project, currently at the **design/PRD stage — there is no application code yet** (no `package.json`, build, lint, or tests). Do not invent build/run/test commands; there is no toolchain until implementation begins.

The product is an **offline, installable PWA** for reading guitar/voice chord charts ("cifras"), playing along with multitrack audio, and karaoke — for a single user (the author), used at home, in rehearsal, and on stage (Android tablet primary, desktop secondary).

**Disambiguation:** the parent `My Drive/CLAUDE.md` (auto-loaded) describes a *different* project (3D boxes for smokers). That context does **not** apply here — this subfolder is the cifras app. Everything in this project is written and discussed in **Brazilian Portuguese**; keep that language for specs, UI copy, and discussion.

## Source of truth

- **`docs/superpowers/specs/2026-06-25-soma-play-design.md`** is the authoritative spec (PRD). **Read it before any design or implementation work.** Section numbers (§5 content model, §6 navigation, §7 Listas, §8 templates, §11 out-of-MVP, etc.) are referenced throughout discussions.
- This project follows the **superpowers brainstorming → writing-plans** workflow. New/changed features go through the design spec first; specs live in `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`. The next step after a settled design is the `writing-plans` skill — do not jump to implementation skills before a plan exists.

## Architecture (the big picture, from the PRD)

- **Single PWA codebase** for Android tablet (Chrome) and desktop. No backend; the whole library lives on-device.
- **Mode is a global lens.** The top of the app selects one of three modes — **T1 Cifra** (default), **T2 Acompanhamento**, **T3 Karaokê** — and the *entire* library is filtered to content available in the active mode. Playing a song is meant to be a single tap (no intermediate mode picker); inside a song a T1/T2/T3 switch doubles as a feature indicator (disabled modes = the song lacks that content).
- **Three views** within a mode: **Artistas**, **Músicas**, and **Listas**. Listas (§7) are an exception — they are **global, ignoring the mode lens**; entering Listas dims the mode selector, and opening a song from a list plays it in its *best available* mode.
- **Content model (§5):** `Artista → Música`. A Música's chart ("Cifra") is **image OR text, chosen per song** — mostly single-column CifraClub-style images, text when the source makes it more practical. Images are tagged `aberta | fechada` (with/without chord diagrams); the T1 **Aberta/Fechada toggle** swaps the two images (or, for text, shows/hides diagrams — diagram generation from text is post-MVP). Música also has audio `stems` (name/volume/mute), a karaoke `Letra`, and a `favorita` flag.
- **Audio:** Web Audio API. Each stem is a gain node; all share **one transport clock** so global play/pause/seek stay in sync.
- **Offline & storage:** Service Worker for offline operation; **large files (audio/images) in OPFS**, metadata in IndexedDB. Backups export/import the whole library including lists and favorites.

## The `chords/` asset library

`chords/` is the imported source material (PDF songbooks + loose cifra images), **organized by artist** with a fixed convention — preserve it when adding files:

```
chords/<Artista>/chords/      ← loose single songs (images: .png/.jpg/.psd)
chords/<Artista>/songbook/    ← complete-book songbook PDFs
chords/Coletaneas/songbook/   ← multi-artist songbooks (Bossa Nova, Choro, MPB, Rock, Beatles, etc.)
chords/_a-identificar/        ← loose songs whose artist isn't yet identified
```

- "Favoritas" and any system list aside, **artist folders always carry both `chords/` and `songbook/` subfolders.**
- When importing many cifra images, note they are often low-resolution (e.g. a typical capture is ~595px wide) and blur when filling a tablet screen — prefer ~2× resolution sources.

## Working conventions

- Discuss and write in Portuguese.
- Treat the PRD as living: when a design decision is made, update the relevant spec section (and renumber/cross-reference consistently) rather than letting decisions live only in chat.
