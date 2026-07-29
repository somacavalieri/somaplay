# Soma_play — Popover de acorde na cifra (toque no acorde → diagrama + variar) — design

**Data:** 2026-07-29 · **Estado:** aprovado (brainstorming) → plano
**Referência visual:** CifraClub atual — popover compacto (nome + diagrama + bolinhas + "Variar") que expande num carrossel de variações com "Aplicar".

## Objetivo

No meio da música, tocar num **acorde da cifra em texto** e ver na hora um **popover ancorado** com a miniatura do diagrama — essencial para identificar o acorde rapidamente quando a cifra está "fechada" (sem miniaturas inline visíveis). Do mesmo popover, **"Variar"** abre um carrossel de formas; **"Aplicar"** troca a digitação do acorde na **música inteira**.

## Decisões do brainstorm

- **Variar cicla no próprio popover** via carrossel (estilo CifraClub), não abre o picker central.
- **Aplicar vale para a cifra toda** — sem o checkbox "variar em toda a cifra" do CifraClub. A digitação continua sendo por nome de acorde por música (`cifra.digitacoes[nome]`); troca por ocorrência individual exigiria mudar o modelo de dados e fica fora (YAGNI).
- **Pontos de uso:** linhas de acorde do **texto** e **miniaturas inline** abrem o popover novo. A grade "Acordes desta música" **mantém o picker completo** ("Variações de X") — é lá que vivem "Editar" e "Nova variação".
- **Arquitetura:** estado global + re-render (padrão do app), reusando `chordSVG`, `shapesOf`/dicionário e a gravação do `pickChordShape`. Descartados: widget imperativo fora do ciclo de render (duplicaria lógica por um ganho imperceptível) e ancorar o picker existente (não reproduz o fluxo mini → carrossel).

## Comportamento (UX)

**Acordes tocáveis.** Nas linhas de acorde da cifra em texto, cada token que é acorde vira tocável — visual **idêntico** ao de hoje (laranja, negrito, mono); nada muda até o toque. Tokens não-acorde (`N.C.`, `|`, `x2`, `%`…) não são tocáveis.

**Popover mini.** Toque num acorde abre um card ancorado **acima** do acorde (abaixo quando não couber), com:
- nome do acorde;
- diagrama grande (`chordSVG` small=false) da **digitação atual** — a da música (`cifra.digitacoes[nome]`) ou, sem ela, a padrão do dicionário;
- **bolinhas** indicando a posição da forma atual entre as variações conhecidas (inclui o pseudo-item "desta música" quando a digitação é custom);
- botão **"Variar"** — desabilitado quando o acorde tem ≤ 1 forma.

Fecha ao: tocar fora do card (sem escurecer o fundo), **qualquer rolagem da cifra** (manual ou automática) e sair da tela. Tocar noutro acorde **reancora** no novo com um toque só.

**Carrossel (modo variar).** "Variar" expande o mesmo card:
- fileira horizontal de formas (`shapeStripHTML` com diagramas grandes + rótulos), rolagem com snap, forma **selecionada destacada** (borda accent, como no picker);
- tocar numa forma **só seleciona** — não aplica (evita troca acidental no palco);
- rodapé: **↺** (volta a seleção para a forma salva) e **"Aplicar"**;
- **Aplicar** grava a forma como digitação do acorde na música inteira (mesmo efeito do picker atual: `frets`/`barre`/`varId` + `saveSong`) e fecha o popover; grade, miniaturas inline e barra de fixados refletem no mesmo render.

**Sem forma nenhuma no dicionário:** o mini mostra o diagrama "?" (já existente no `chordSVG`) e uma dica para usar a grade "Acordes desta música" (onde existe "Nova variação"); "Variar" desabilitado.

**Karaokê e cifra por imagem: intocados** (numa imagem não há acorde tocável; a grade sob a imagem segue abrindo o picker).

## Estado e dados

- `S.chordPop = null | { name, anchor:{x,y,w,h}, modo:'mini'|'carrossel', selId }` — `anchor` capturado no toque (`getBoundingClientRect()` do elemento, coordenadas do viewport); `selId` é a forma selecionada no carrossel.
- **Helper compartilhado** extraído do `chordPickerHTML`: `pickerShapes(name, digitacaoAtual)` → `{ shapes, selId }`, com a resolução que hoje vive no picker (match por `varId`, senão por `shapeKey`, senão pseudo-item `__song` "desta música"; sem digitação → padrão do dicionário marcada). Usado pelo picker **e** pelo popover — elimina a duplicação.
- **Gravação compartilhada:** corpo do `pickChordShape` extraído em `applyShapeToSong(song, name, shape)`, chamado pela ação do picker e pela ação "Aplicar" do popover.
- Sem mudança de modelo de dados nem de backup.

## Componente e posicionamento

- **`app/js/render/chordpop.js`** (novo): `chordPopHTML(song)` e a função **pura** `popPosition(anchor, cardW, cardH, viewport)` → `{left, top}` — prefere acima do acorde, vira para baixo sem espaço, clampa nas bordas laterais com margem.
- Renderizado no fim do `renderPlay()` (como o picker), `position:fixed`. **Sem scrim bloqueador** (senão "tocar noutro acorde reancora" não funciona): fechamento por listener global de `pointerdown` — toque que não é num acorde nem dentro do `.chord-pop` fecha; toque num acorde cai na ação `openChordPop` e reancora.
- **Linha de acordes tocável:** função pura nova em `chords.js` que tokeniza a linha `.ch` **preservando espaços byte a byte** (`white-space:pre` intacto) e envolve só os tokens-acorde em `<button data-a="openChordPop">` com CSS zerado (mesma fonte/cor/peso, `display:inline`, sem padding/borda) — alinhamento acorde↔sílaba não muda em nenhum zoom.
- Miniaturas inline: `data-a` dos blocos `.ch-diag` passa de `openChordPicker` para `openChordPop`.
- Fechar em rolagem: listener de `scroll` no container da cifra (fecha só se `S.chordPop` aberto).

## Mudanças por arquivo

- **`app/js/state.js`** — `chordPop: null` no estado volátil.
- **`app/js/main.js`** — ações `openChordPop`, `chordPopVariar`, `chordPopSelect`, `chordPopReset`, `chordPopApply` (usa `applyShapeToSong`), `closeChordPop`; refactor do `pickChordShape`.
- **`app/js/chords.js`** — tokenização da linha de acordes em segmentos tocáveis.
- **`app/js/chordbook.js`** — `pickerShapes(name, cur)` compartilhado (usa `shapesOf`/`shapeKey` do próprio módulo; sem ciclo de import).
- **`app/js/render/chordpop.js`** — novo componente (HTML + `popPosition`).
- **`app/js/render/play.js`** — usa a linha tocável em `cifraTextHTML`, troca a ação das miniaturas, renderiza `chordPopHTML`, picker passa a usar `pickerShapes`.
- **`app/css/app.css`** — `.chord-pop` (card, bolinhas, carrossel com snap, rodapé), reset do botão inline da linha `.ch`.
- **`app/sw.js`** — bump `somaplay-v10 → v11` (mudança de shell).

## Testes (node, `app/test/`)

- **Tokenização:** espaços preservados byte a byte; só acordes viram botão; linha sem acordes intacta.
- **`popPosition`:** acima quando cabe, flip para baixo, clamp nas bordas esquerda/direita.
- **`pickerShapes`:** seleção por `varId`; por `shapeKey`; digitação custom → item `__song`; sem digitação → padrão do dicionário selecionada.

## Verificação (manual, cifra em texto)

1. Tocar acorde no meio da música abre o mini com a forma atual; 2. bolinhas batem com a posição da variação; 3. Variar → carrossel com a atual destacada; 4. selecionar + Aplicar troca na cifra toda (grade/miniaturas/fixados juntos); 5. ↺ volta a seleção; 6. tocar fora fecha sem aplicar; 7. rolagem (manual e automática) fecha; 8. acorde perto da borda da tela não corta o card; 9. zoom não desalinha a linha; 10. acorde sem forma mostra "?" e Variar desabilitado; 11. miniaturas inline abrem o popover, grade abre o picker.

## Fora do escopo (YAGNI)

- Troca de digitação **por ocorrência** (checkbox "variar em toda a cifra" do CifraClub).
- "Editar"/"Nova variação" dentro do popover (continuam na grade → picker).
- Popover em cifra de **imagem** e no karaokê.
- Persistir a variação "espiada" sem Aplicar.
