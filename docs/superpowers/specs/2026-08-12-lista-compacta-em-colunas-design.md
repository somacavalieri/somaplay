# Lista compacta em colunas — design

2026-08-12

## O problema

A aba Músicas renderiza cada música como um card de ~64px de altura, em coluna
única com `max-width: 880px` (`.rows`, `app.css:156`; `songRow`, `home.js:77`).
Com a biblioteca de estreia isso era confortável. Com o acervo real — **5737
músicas** depois da entrada do acervo VJ, dos songbooks e do CifraClub — a tela
vira um poço de rolagem: um tablet em pé mostra ~10 músicas por vez, achar
qualquer coisa exige dezenas de telas de rolagem, e toda a largura além dos
880px fica vazia.

O usuário desenhou a solução (mockup de 2026-08-12): linhas de **uma linha só**,
organizadas em **colunas que se multiplicam conforme a largura da tela** — 1 no
celular, 2–3 no tablet, mais no desktop.

## A decisão

**Grade responsiva de linhas compactas, só na aba Músicas.** As telas Artista e
Estilo continuam com a `songRow` atual — escolha explícita do usuário: são
listas curtas (uma discografia), o card atual serve bem lá. Listas de show
também ficam fora (têm numeração e drag-to-reorder próprios).

### A linha compacta (`song-line`)

Nova função `songLine(s)` em `home.js`, ao lado de `songRow` — função separada,
não flag na existente: card de duas linhas e linha única não compartilham
estrutura interna, e uma flag acoplaria os dois formatos para sempre.

Anatomia, da esquerda para a direita:

- **glifo de play** pequeno e discreto — ou as **barras de EQ** quando a música
  é a que está tocando (mesma troca que `songRow` já faz; no mockup é a linha
  do "Oceano"). O texto "Tocando agora" não existe aqui: não há segunda linha,
  o EQ é o indicador;
- **título** em Sora 600, com o **artista inline** logo após, em cinza menor —
  não em segunda linha. Ambos truncam com ellipsis (o título tem prioridade de
  largura; o artista encolhe primeiro);
- **qualificador ordinal** de colisão, quando houver (ver badge abaixo);
- à direita: **badge de fonte**, **mic** quando a música tem karaokê (T3),
  **coração** de favorita (preenchido âmbar quando favorita, como hoje) e
  **adicionar à lista**.

Sem card: fundo transparente, **hairline inferior** separando as linhas, hover
sutil (`--surface-hover`) no desktop. Altura ~48px. Os botões de coração e
lista perdem a caixa com borda do card atual e viram glifos puros — mas a área
de toque continua ≥40px (tablet é o alvo primário). A linha inteira continua
sendo `data-a="openSong"`; os botões internos têm `data-a` próprio e vencem na
delegação por `closest('[data-a]')`, como hoje.

### A grade

`.rows` da aba Músicas dá lugar a um grid:

```css
.songs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); column-gap: 28px; }
```

Largura total do content-scroll (sai o `max-width: 880px`). O número de colunas
**emerge da largura** — sem media queries: ~1 coluna abaixo de ~700px de
viewport, 2–3 no tablet, 4+ no desktop.

A ordem de leitura é **linha-a-linha** (1,2,3 na primeira linha da tela, 4,5,6
na segunda…) — é o fluxo natural do grid e é o fluxo do mockup, conferido pela
ordem alfabética das 14 músicas dele. A alternativa, CSS multicol
(`column-width`), leria de cima para baixo por coluna — mas multicol balanceia a
altura **total**: 5737 músicas virariam N colunas de ~85.000px, e ler
alfabeticamente exigiria rolar uma coluna inteira até o fim e voltar ao topo.
Descartada.

Hairline **vertical** entre colunas, como no mockup: um `::before` absoluto em
cada linha, deslocado para dentro do `column-gap`, com `overflow: hidden` no
container clipando o traço fantasma da primeira coluna. Sem JS, funciona com
qualquer número de colunas.

O estado vazio ocupa a grade inteira (`grid-column: 1 / -1`).

### Badge de fonte em toda linha

**Isto revisa uma decisão do mesmo dia.** A spec de desambiguação
(`2026-08-12-desambiguacao-por-fonte-design.md`) descartou "mostrar a fonte em
toda linha" por poluir a listagem e roubar largura do título. Aquela análise
valia para o card largo de coluna única. Na linha compacta a conta muda: o
badge vive na borda direita da coluna e não compete com o título (que trunca
antes dele), e numa biblioteca multi-fonte de 5737 músicas ver a procedência de
relance tem valor próprio — fonte é o eixo da lente, do export com filtro e da
curadoria de duplicatas. O usuário confirmou a revisão explicitamente
(2026-08-12). A spec de desambiguação ganha nota apontando para cá.

Consequência sobre o qualificador inline: com badge em toda linha, na aba
Músicas o `src-qual` renderiza **só o caso ordinal** (`'1'`, `'2'` — nenhuma
das colididas tem fonte, logo nenhuma tem badge, e o número é a única
distinção). Colisão com fontes distintas já é distinguível pelos badges;
colisão em que só uma tem fonte é distinguível pela presença/ausência do badge.
Fica um canto sem cobrir, aceito como está: numa colisão com duas ou mais
músicas sem fonte ao lado de uma com fonte, as músicas sem fonte continuam
indistinguíveis entre si — `qualificadorDe` devolve `SEM_FONTE` para todas
elas e a linha compacta não renderiza nada —, a mesma lacuna que o card antigo
já tinha (as duas mostravam o mesmo rótulo "Sem fonte").
A função pura `qualificadorDe` **não muda** — quem filtra é o render. Nas
telas Artista e Estilo (`songRow` clássica, sem badge) o qualificador continua
integral, senão a desambiguação sumiria de lá.

O badge:

- texto do nome da fonte como o usuário digitou, em caps via CSS
  (`text-transform`), nunca reescrito no dado; `esc()` como todo conteúdo de
  usuário; trunca com ellipsis a partir de ~96px, com `title` completo
  (reusa a chave `home.song.sourceQualifier` — nenhuma chave i18n nova);
- música sem fonte: **sem badge** — a ausência é informação;
- **cor determinística por nome**: `corDaFonte(nome)` em `state.js`, junto das
  demais funções do eixo fonte. Hash djb2 do nome `trim().toLowerCase()`,
  módulo 5, indexando a paleta `[verde, âmbar, teal, dourado, neutro]` — cinco
  classes CSS (`f0`–`f4`) sobre tints que já existem nos tokens (tema claro
  incluído). **Superseded — ver a nota de atualização logo abaixo.**

Por que assim:

- **por nome, não por ranking de uso** — ranking muda quando a biblioteca
  muda, e as cores dançariam a cada import;
- **hash do lowercase** — "cifraclub" e "CifraClub" são a mesma fonte pela
  regra de dedupe da biblioteca, então recebem a mesma cor;
- **djb2 e não djb2a/fnv1a/sdbm** — testado com os nomes reais: djb2 é a
  variante que separa `cifraclub → âmbar`, `songbook → teal`, `vj → neutro` em
  baldes distintos, que são **exatamente as cores do mockup**. Fontes futuras
  podem colidir de cor entre si — aceitável: o texto identifica, a cor reforça;
- **paleta sem vermelho** — vermelho é vocabulário de erro/exclusão no app.

**Atualização (2026-08-14):** o `corDaFonte` descrito acima — índice `0–4`, hash djb2,
cinco classes `.src-badge.f0`–`.f4` — foi **substituído**, não só movido de lugar. A faixa
de pílulas do filtro de fonte (`2026-08-14-filtro-fontes-pilulas-design.md`) trouxe um
segundo `corDaFonte`, determinístico por hex, em `js/render/fontestrip.js`. Os dois
sistemas discordavam de cor na mesma tela — VJ cinza no badge e verde na pílula — e a
paleta de 5 posições colidia VJ e RV no mesmo slot. O controlador determinou a unificação
a favor do hex, que é o que atende o pedido original do usuário: *"uma cor fixa por fonte,
reaproveitada nos badges de origem das listas de músicas."* O `corDaFonte` de `state.js`
não existe mais; `fonteBadge()` em `home.js` agora pinta via
`style="--fc:${corDaFonte(nome)}"`, importado de `fontestrip.js`. Ver o spec de
2026-08-14, seção "O que não muda", para o diff completo.

## O que não muda

Toolbar de ordenação, contador ("N de M músicas…"), busca, lente T2/T3/fonte,
abrir música pelo toque na linha, `data-from` de navegação, telas Artista /
Estilo / Listas, popover de adicionar à lista, e **nenhum dado persistido**.
Nenhum módulo novo em `app/js/` → `SHELL` do service worker intacto; `VERSION`
bomba mesmo assim porque `app.css` e `home.js` cacheados mudam.

## Fora deste trabalho

- **Virtualização da lista.** As 5737 linhas já são todas renderizadas hoje; a
  linha compacta tem *menos* DOM por música que o card. Se um dia doer, é
  outro trabalho.
- **Badge clicável para filtrar pela fonte.** A lente por fonte já existe no
  topo; duplicar o gatilho em 5737 lugares é decisão para depois de sentir
  falta.
- **Agrupamento por letra** (cabeçalhos A, B, C…) ou índice de rolagem rápida.
- **Compactar Artista / Estilo / Listas.**

## Verificação

- `node --test` — `corDaFonte`: determinística; case-insensitive
  (`CifraClub` ≡ `cifraclub`); os três nomes reais (`cifraclub`, `songbook`,
  `vj`) caem em baldes distintos e nos baldes esperados (âmbar, teal, neutro);
  trim aplicado. **Superseded (2026-08-14):** estes três testes de `state.js`
  foram apagados junto do `corDaFonte` antigo; o `corDaFonte` que sobreviveu é
  o de `js/render/fontestrip.js`, coberto por `app/test/fontestrip.test.js`.
- `node --check` em `home.js` e `state.js`.
- **Navegador** — redimensionar: 1 → 2 → 3 colunas sem media query; tema claro
  e escuro; a biblioteca real de 5737 músicas rola fluida; tocar na linha abre
  a música, tocar no coração/lista não abre; música tocando mostra EQ; colisão
  sem fonte nenhuma ainda mostra `1`/`2`; badge trunca fonte longa; telas
  Artista e Estilo continuam com o card antigo e o qualificador integral.
- **Offline** — `VERSION` bombada em `sw.js`; instalação limpa serve a lista
  nova sem rede.
