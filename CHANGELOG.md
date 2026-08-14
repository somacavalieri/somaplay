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

- **Any release that touches the service worker `SHELL` is at least a PATCH.**
  The version *is* the cache key, so a new release always means a new cache —
  there is no way to ship stale files by forgetting to bump something.
- **Changes outside the app do not bump the version** — `docs/`, specs, plans,
  `scripts/`. The number tracks the app, not the repository.

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
