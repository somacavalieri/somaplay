# Soma_play — Plano de implementação do MVP

**Data:** 2026-07-05
**Base:** PRD `docs/superpowers/specs/2026-06-25-soma-play-design.md` + design visual aprovado (`-DESIGN/Soma Play.html`, projeto Claude Design "Soma_play").

## Decisões herdadas do design visual (deltas sobre o PRD)

1. **T1 e T2 são uma tela única** ("Tela Cifra"): o mixer + transporte aparecem quando a música tem áudio; não há template T2 separado. O switch no topo da música tem 2 posições: **Cifra | Karaokê** (Karaokê desabilitado quando a música não tem letra).
2. **Lente de modo** na Home = chips **T2 (Acompanhamento)** e **T3 (Karaokê)** multi-seleção (T1 é implícito — toda música tem cifra). Filtro = música precisa ter *todos* os modos selecionados. Na aba Listas a lente fica apagada/inativa.
3. **Sem seletor de modo intermediário** — tocar abre direto (karaokê quando o filtro T3 está ativo e a música tem).
4. **Acordes**: dicionário de digitações embutido + `digitacoes` por música; grade "Acordes desta música" no fim da cifra; **acordes fixados** (estrela) numa barra recolhível no topo.
5. **Cifra-imagem**: fit-to-width, pan por arrasto, pinch/ctrl+scroll zoom, inverter cores, toggle Aberta/Fechada (2 imagens).
6. **Fonte de áudio por música**: canais separados (stems) *ou* "versão completa" (música inteira, 1..n gravações); alternância no mixer.
7. Paleta/typographic tokens do design (Sora/Inter/JetBrains Mono; #0E0E11/#1A1A20/#23232B/#2E2E37/#F5F4F2/#9A9AA5/#E8A23D/#2DD4BF/#F4B860).

## Arquitetura

- **Sem build/toolchain**: ES modules servidos direto (`cd app && python3 -m http.server`). PWA instalável.
- `app/index.html` — shell; `css/app.css` — temas claro/escuro via CSS vars; fontes woff2 locais (offline).
- `js/db.js` — IndexedDB (`artists`, `songs`, `lists`, `settings`) + blobs em **OPFS** (fallback IndexedDB).
- `js/audio.js` — **transporte único**: por faixa `HTMLAudioElement → MediaElementSource → GainNode → masterGain (AudioContext)`; play/pause/seek globais; correção de drift contra a faixa líder.
- `js/chords.js` — dicionário, SVG de diagramas, parser de cifra-texto colada (seção `[..]` / linha de acordes / letra).
- `js/backup.js` — exportar/importar `.somaplay` (header JSON + blobs concatenados, leitura por `slice`, sem base64).
- `js/state.js` + `js/render/*.js` — estado central, re-render por tela; sliders/transporte fazem patch direto no DOM (sem re-render durante arrasto).
- `sw.js` — precache do shell, cache-first.

## Modelo de dados (IndexedDB v1)

```
artist: { id, name, av }
song:   { id, artistId, title, tom?, favorita, createdAt,
          cifra: { fonte: 'imagem'|'texto'|null, imagens:[{blobId,tipo}], texto?, acordes?, digitacoes? },
          letra?,                             // karaokê
          stems: [{ id, name, blobId, vol, muted }],
          full:  [{ id, nome, meta, blobId }] }
list:   { id, nome, fixada, musicas:[songId] }   // Favoritas = derivada de song.favorita
settings: { theme, awake, cifraZoom, defaultSpeed, masterVol }
```

## Escopo incluído além do desenho de telas

- Editar/excluir música pelo menu ⋯ da tela Cifra (excluir remove das listas, §7).
- Botão "Importar exemplos" nas Configurações (Paralelas/imagem + Andança/texto) para validação imediata.
- Wake lock, temas, zoom padrão, velocidade padrão, volume master, uso de armazenamento, backup.

## Verificação

Servir localmente e dirigir com chrome-devtools: cadastrar música com 2 stems WAV gerados, tocar, mixar, favoritar, criar lista, reordenar, karaokê, backup export/import, offline (SW).
