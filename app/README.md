# Soma_play — MVP (PWA)

App pessoal de cifras, acompanhamento multicanal e karaokê — 100% offline.

## Rodar

```bash
cd app
python3 -m http.server 8137
# → http://localhost:8137
```

Precisa de servidor http (não abre por `file://`) por causa do Service Worker, OPFS e ES modules.
No Chrome (desktop ou tablet Android) dá pra **instalar como app** (menu → Instalar).
Depois da primeira visita, funciona **sem internet**.

## Primeiro uso

- **Configurações → Importar exemplos** carrega 2 músicas de demonstração
  (Paralelas — cifra por imagem · Andança — cifra em texto com diagramas).
- **Configurações → Adicionar música** cadastra as suas: imagens de cifra ou texto colado,
  letra pra karaokê, stems de áudio (um arquivo por canal) e/ou versão completa.
- **Backup**: Configurações → Exportar/Importar biblioteca (arquivo `.somaplay` com tudo dentro).

## Estrutura

| Caminho | O quê |
|---|---|
| `js/db.js` | IndexedDB (metadados) + OPFS (arquivos grandes) |
| `js/audio.js` | Transporte único (Web Audio): play/pause/seek globais, ganho por canal, correção de drift |
| `js/chords.js` | Parser de cifra em texto + dicionário e diagramas SVG de acordes |
| `js/backup.js` | Formato `.somaplay` (manifest JSON + blobs concatenados) |
| `js/state.js` | Estado central + operações da biblioteca |
| `js/render/*` | Telas (home, artista, lista, cifra/karaokê, adicionar, configurações) |
| `sw.js` | Service Worker (precache do shell, cache-first) |

Espec: `../docs/superpowers/specs/2026-06-25-soma-play-design.md` (Anexo A = decisões do design visual).
