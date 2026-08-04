# Bundled fonts

Three typefaces ship with the app, subset to `latin` and `latin-ext` and served
locally so the app keeps working offline. All three are **SIL Open Font License
1.1**, which permits redistribution but requires the licence text to travel with
the files — that is what `LICENSES/` is for.

| Family | Used for | Source | Licence |
|---|---|---|---|
| **Sora** | Titles and headings (`--f-title`) | [google/fonts](https://github.com/google/fonts/tree/main/ofl/sora) | [SIL OFL 1.1](LICENSES/Sora-OFL.txt) |
| **Inter** | Body and interface text | [google/fonts](https://github.com/google/fonts/tree/main/ofl/inter) | [SIL OFL 1.1](LICENSES/Inter-OFL.txt) |
| **JetBrains Mono** | Chord charts, where column alignment matters | [google/fonts](https://github.com/google/fonts/tree/main/ofl/jetbrainsmono) | [SIL OFL 1.1](LICENSES/JetBrainsMono-OFL.txt) |

All three are variable fonts, declared in `app/css/app.css` with a weight range
rather than one file per weight.

**Why a monospace font for chord charts:** a text chart aligns chords over
lyrics by character column. Any font with variable-width characters breaks that
alignment, and the chart stops meaning what it says.

If you replace or add a font, put its licence in `LICENSES/` and add a row here.
The OFL also forbids selling the fonts on their own and requires derivatives to
keep the same licence — worth reading before swapping anything.
