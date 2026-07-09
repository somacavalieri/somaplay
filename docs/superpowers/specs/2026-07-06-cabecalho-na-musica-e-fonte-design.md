# Soma_play — Cabeçalho dentro da música + campo Fonte (design)

**Data:** 2026-07-06 · **Estado:** aprovado (brainstorming) → implementação
**Estende:** [`2026-06-25-soma-play-design.md`](2026-06-25-soma-play-design.md) §5 (modelo), Anexo A#1/#7 (Tela Cifra).

## Problema
A top-bar da Tela Cifra carrega título + artista + tom, ocupando espaço — ruim no mobile.

## Mudança
1. **Título, artista e tom saem da top-bar** e passam para um **cabeçalho no topo do conteúdo da cifra**, que **rola junto** (some ao rolar, liberando a tela). Aparece nas 3 visões (texto, imagem, karaokê).
2. **Título e artista** usam a **cor de acento** (`--accent`, âmbar — a mesma dos acordes), diferenciados por tamanho/peso (título forte em Sora; artista menor).
3. Novo campo **`fonte`** (origem da cifra), exibido ao lado do tom. Ex.: `Tom G · CifraClub`.
4. **Top-bar enxuta:** `←` voltar · switch Cifra/Karaokê · zoom (imagem) · `⋯` menu · mixer · badge offline.

## Modelo de dados
- Novo campo **`song.fonte`** (string, top-level). **Distinto de `song.cifra.fonte`** (que é o *formato*: `imagem`/`texto`). Comentar essa distinção no código.
- **Auto-preenchimento pelo tipo da cifra** (correlação real do usuário: link→CifraClub, PDF do songbook→imagem):
  - cifra `texto` → `fonte` default **"CifraClub"**
  - cifra `imagem` → `fonte` default **"Songbook"**
- Editável: campo de texto no Adicionar/editar com 2 atalhos (botões "CifraClub"/"Songbook") que preenchem; aceita qualquer texto. Auto-preenche ao trocar o tipo da cifra se estiver vazio; e no save, se vazio, aplica o default do tipo.

## Componentes
- `songHeaderHTML(song)` (novo, em `play.js`): título/artista/meta(tom+fonte); injetado no topo de `cifraTextHTML`, `cifraImageHTML`, `karaokeHTML` (dentro do container que rola).
- `renderPlay`: remove o bloco `.play-title` da `.play-head`; adiciona espaçador para alinhar os controles à direita.
- `addedit.js`: campo Fonte no formulário; `d.fonte` no draft; snapshot no `commitDraft` com default.
- `main.js`: ação `setFonte`; `setCifraFonte` auto-preenche `fonte` quando vazio.
- `samples.js`: `fonte` nos exemplos (As Pastorinhas/Oxum = "CifraClub"; Paralelas = "Songbook"; Andança = "CifraClub").
- `app.css`: `.song-id` (título/artista/meta) + campo do formulário.

## Fora do escopo
- Filtro/busca por fonte; múltiplas fontes por música; link clicável para a origem.

## Verificação
- Abrir As Pastorinhas/Oxum: cabeçalho no corpo (título/artista âmbar, `Tom · Fonte`), top-bar sem o título; rola junto. Adicionar música: campo Fonte auto-preenche por tipo; salvar/reabrir mantém.
