# Contributing

Thanks for wanting to help. This is a small project with a deliberately small setup —
there is nothing to install and no build step.

**Issues and pull requests in Portuguese are welcome.** The project started in Brazilian
Portuguese and most of its design history is written that way. Code, comments in new
code, and commit messages are in English.

## Running it

```bash
git clone https://github.com/somacavalieri/somaplay.git
cd somaplay/app
python3 -m http.server 8137
# → http://localhost:8137
```

A static HTTP server is required — `file://` will not work, because of the Service
Worker, OPFS, and ES modules. Any static server does; Python is just what everyone has.

**Configurações → Importar exemplos** loads the demo song so there is something on screen.

## Testing

```bash
cd app
node --test               # test suite — needs Node ≥ 20, installs nothing
node --check js/main.js   # syntax check a single module
```

The project has **no DOM test harness**, and that is on purpose. Verification works in
three layers:

1. **`node --test`** for pure logic — chord parsing, the catalog, backup reconciliation
2. **`node --check`** for syntax across modules
3. **Manual verification in the browser** for anything that touches the UI

Layer 3 counts as testing here. If your change affects a screen, say in the PR which
screens you opened and what you checked.

## Things that will bite you

Hard-won, and not obvious from reading the code:

**Any release that changes a file listed in `SHELL` is at least a PATCH.** Not "editing the
array" — changing anything the array precaches, which in practice means any change under
`app/`. The narrow reading is how the bug that started this comes back: a CSS-only fix
shipped without a bump is served from the old cache forever. The same goes for changing
`sw.js`'s own logic, which is not in `SHELL` but ships with it. The version is declared in
two places — [`app/js/version.js`](app/js/version.js) and line 2 of [`app/sw.js`](app/sw.js)
— and kept in sync by `app/test/version.test.js`. The install step calls `cache.addAll(SHELL)`,
which fails entirely if any path is missing, and without a new cache key installed clients keep
the old list. A stale `SHELL` breaks the app offline for everyone who already installed it.

**Never rename `DB_NAME` in [`app/js/db.js`](app/js/db.js).** It is the IndexedDB
database name. Changing it makes the app open an empty database — which means every
user's library disappears. The name is invisible to users; there is no reason to touch
it.

**Do not commit third-party musical content.** No chord charts, lyrics, tablature, or
recordings you do not own. This applies to source code too — the demo songs used to embed
full lyrics as string constants, and removing them was a whole cleanup. The example song
that ships with the app was written for the project. If you need demo material, write it.

**`chords/` is gitignored and stays that way.** It is the author's local asset library.

**`app/diag.html` and `app/diag-pdf.html` ship deliberately, unlinked and outside the
offline shell.** Both live under `app/`, which `.github/workflows/pages.yml` deploys
wholesale — so both are live on the public site, reachable by anyone who knows (or
guesses) the URL, even though nothing links to them and they are not in `SHELL` (they
404 offline). That is the established pattern, not an oversight: they are hand tools for
checking a codec/renderer directly, not part of the app. Do not delete either, and do not
add a new one to `SHELL` — that would defeat the point of a page that exists to be
opened by hand, occasionally, online.

## Third-party code

`app/js/vendor/` holds pdf.js, vendored — the project's only third-party dependency.
It is copied in as-is, not installed by a package manager; **nobody edits anything
under `vendor/`**. To update it, follow the procedure in
`app/js/vendor/pdfjs/VERSAO.md`.

## How changes get made

The project follows **spec → plan → implementation**:

1. A design decision is written to `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`
   before code is touched
2. That spec becomes a plan in `docs/superpowers/plans/`
3. Only then does implementation start

Those documents are in Portuguese and are the honest record of how the app got here. For
a small bug fix, skip straight to a PR. For anything that changes behavior, open an issue
first so the design conversation happens before the code.

## Pull requests

- Keep it focused — one concern per PR
- Run `node --test` and say so in the description
- Say which screens you verified in the browser
- Match the surrounding code: vanilla ES modules, no dependencies, no build step

Adding a runtime dependency is a design decision, not an implementation detail. Open an
issue for it first.
