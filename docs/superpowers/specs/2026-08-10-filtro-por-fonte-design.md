# Soma_play — Filtro por fonte na lente global — design

**Data:** 2026-08-10 · **Estado:** implementado, **parcialmente superado** por
`2026-08-14-filtro-fontes-pilulas-design.md`

> **Superado em 2026-08-14, em dois pontos.** O acervo chegou às seis fontes que este
> spec previa como teto ("seis ou sete"), e aí as duas decisões abaixo viraram o gargalo:
>
> - **"Uma fonte por vez"** → multisseleção, com o primeiro clique isolando (o gesto
>   comum continua custando um clique).
> - **"Não persiste entre sessões"** → persiste, com poda no boot. O argumento original —
>   *"vira uma biblioteca misteriosamente vazia no próximo ensaio"* — era correto para um
>   filtro escondido atrás de um dropdown; a faixa sempre visível o desarma.
>
> Junto foi o dropdown inteiro: `S.fonteMenuOpen`, `fonteControl()`, `.fonte-menu` e
> `setFonteFilter` não existem mais. O que **continua valendo** deste spec: alcance global
> igual à lente de modos, listas imunes a filtros, comparação por grafia normalizada, o
> sentinela `SEM_FONTE`, `fontesDaBiblioteca` e `fonteCasa`.
**Origem:** pedido do usuário — "gostaria que tivesse uma opção de filtrar por
categoria... pode ser um ícone para economizar espaço. Porém, quando o filtro estiver
ativado, eu quero que mostre e destaque qual filtro que é... com um xizinho."

O usuário chama de **categoria** o que o app chama de **fonte** (`song.fonte`):
CifraClub, Songbook, e o que mais ele for cadastrando — hoje duas, com expectativa de
seis ou sete. Fecha a lacuna que `2026-08-10-atalhos-de-fonte-design.md` deixou
explicitamente em "Fora de escopo": *filtro ou busca por fonte*.

## O problema

A fonte já é um eixo real da biblioteca: ela aparece no cabeçalho da música, tem chips
de atalho no formulário e cresce sozinha conforme o acervo. Mas não dá para pedir "me
mostra só o que veio do songbook". Com 73 artistas e o acervo crescendo, esse recorte é
justamente o que separa "o que eu toco lendo do songbook" de "o que eu peguei solto no
CifraClub".

A lente global de modo (T2/T3) já existe e já filtra Artistas, Músicas e Estilos ao
mesmo tempo. O filtro de fonte é um segundo eixo da **mesma** lente, não um mecanismo
novo.

## Decisão

**Uma fonte por vez.** Escolher Songbook troca a fonte ativa; não há multisseleção. É o
que o usuário descreveu, e é o que se lê de relance num tablet em cima da estante.

**Filtro, não navegação.** Não vira uma aba "Fontes" ao lado de Estilos: o usuário quer
recortar a visão atual, não trocar de tela.

**Alcance global, igual à lente de modo.** Vale em Artistas, Músicas e Estilos, e nas
telas de artista e de estilo. **Listas continuam ignorando qualquer filtro** (§7 do PRD)
— nada muda lá.

**Não persiste entre sessões.** Igual a `S.modeFilter`, o filtro vive só na sessão. Um
filtro que sobrevive ao fechar o app vira uma biblioteca misteriosamente vazia no
próximo ensaio.

**Comparação por grafia normalizada.** `trim()` + minúsculas, a mesma regra do
`fontesSugeridas`: "songbook", "Songbook " e "Songbook" são a mesma fonte. O registro
salvo nunca é reescrito.

## Componentes

### `js/state.js` — estado e regra

`S.fonteFilter = null` — a fonte ativa (a grafia exibida), ou o sentinela `SEM_FONTE`,
ou `null` para "todas". `S.fonteMenuOpen = false` — o menu suspenso, no mesmo molde de
`S.sortMenuOpen`.

```js
export const SEM_FONTE = '__sem_fonte';        // sentinela, nunca traduzido
export function fonteOf(s)                     // string trimada, ou '' se não tem
export function fontesDaBiblioteca(songs)      // [{ nome, n }]
export function fonteCasa(fonteDaMusica, filtro) // pura: filtro null → true
export function matchesFonte(s)                // fonteCasa(fonteOf(s), S.fonteFilter)
```

`fonteCasa` é pura e recebe os dois lados por parâmetro — é ela que o teste exercita.
`matchesFonte` é a casca de uma linha que lê `S.fonteFilter`.

`fontesDaBiblioteca` devolve **só o que a biblioteca realmente usa**, ordenado por
quantidade (desc) e depois alfabético — determinístico, portanto testável. É
deliberadamente diferente de `fontesSugeridas`, que crava CifraClub e Songbook mesmo sem
uso: ali os fixos existem porque são o preenchimento automático do formulário; aqui,
oferecer um filtro que não casa com nada é oferecer uma tela vazia. Se houver ao menos
uma música sem fonte, entra ao final um item com `nome: SEM_FONTE`.

Recebe `songs` por parâmetro (não lê `S.songs` por dentro), como `fontesSugeridas` —
assim o teste passa arrays literais sem tocar no estado global.

`matchesLens(s)` passa a ser **modo E fonte**. Os cinco pontos que já chamam essa função
— cards de artista, aba Músicas, cards de estilo, tela do artista, tela do estilo —
herdam o filtro sem mudança nenhuma. O nome continua `matchesLens` porque continua sendo
exatamente isso: a lente global, agora com dois eixos. O comentário acima da função
passa a dizer os dois.

Nenhum módulo novo: tudo cabe em `state.js`, ao lado de `estiloOf`/`fontesSugeridas`. Um
arquivo a mais sob `app/js/` é uma entrada a mais no `SHELL` do Service Worker, e uma
chance a mais de quebrar o app offline sem ganho aqui.

### `js/icons.js` — ícone novo

`I.tag(w = 17)` — etiqueta, no mesmo traço `#9A9AA5` do `funnel` e do `sort`, para
combinar com a barra. É o único ícone novo.

### `js/render/home.js` — o controle

Dentro da `.lens`, **antes** dos chips T2/T3:

```
sem filtro:   [🏷]  [🎛]  [🎤]
com filtro:   [🏷 Songbook ×]  [🎛]  [🎤]
```

Fechado é só o ícone. Ativo, o mesmo controle vira uma pílula com o nome da fonte e um
×. São **dois alvos de toque irmãos** dentro de um `.fonte-pill` que parece uma peça só:
o rótulo dispara `toggleFonteMenu`, o × dispara `clearFonte`. Irmãos, e não aninhados,
porque o dispatcher de cliques usa `closest('[data-a]')` — um `<button>` dentro de outro
nunca receberia o clique certo.

Envolvendo pílula e menu, um `.fonte-wrap` com `position:relative`, no molde do
`.sort-wrap` — é ele que ancora o menu e que o clique-fora consulta.

O menu suspenso reaproveita `.sort-menu`: **Todas as fontes** no topo, depois cada fonte
com a contagem (`Songbook · 41`), check na ativa. O item sem fonte usa
`data-id="__sem_fonte"` e rótulo traduzido — o sentinela no `data-*`, a tradução só no
que se vê.

Na aba **Listas**, a `.lens` inteira já fica esmaecida e inerte (`.lens.off`); o botão de
fonte entra dentro dela e herda isso sem código novo. O filtro continua ativo no estado,
como já acontece com os chips de modo.

### Contadores

Hoje o rótulo do card de artista e o resumo da aba Músicas só mencionam filtro quando
`S.modeFilter.length`. Passam a considerar **"há algum filtro ativo"**, e o sufixo cita a
fonte junto com os modos. Sem isso, o usuário veria "3 músicas" num artista que tem 12 e
não saberia por quê.

### `css/app.css`

`.fonte-pill` e `.fonte-menu`, derivados de `.chip` e `.sort-menu`. A pílula ativa usa a
cor **accent** (âmbar), que não colide com o teal do T2 nem com o dourado do T3. Altura
de 44px, igual aos chips, para não desalinhar a barra. Em telas estreitas a `.lens` já
quebra para a linha inteira (`@media` existente) — a pílula acompanha.

### `js/main.js` — ações

`toggleFonteMenu`, `setFonte` (nome já ocupado pelo formulário → **`setFonteFilter`**) e
`clearFonte`. O menu fecha nos quatro caminhos que o `sortMenuOpen` já tem: ao escolher,
ao trocar de aba, no clique fora (`!e.target.closest('.fonte-wrap')`) e no Esc.

### `js/i18n/pt.js` e `js/i18n/en.js`

Chaves novas nas **duas** tabelas — o teste de paridade cobra:

| chave | PT | EN |
|---|---|---|
| `home.fonte.hint` | Filtrar por fonte | Filter by source |
| `home.fonte.all` | Todas as fontes | All sources |
| `home.fonte.none` | Sem fonte | No source |
| `home.fonte.clear` | Limpar filtro de fonte | Clear source filter |

O **nome da fonte nunca passa por `t()`**: é conteúdo do usuário, e o `data-id` do item
carrega a grafia salva. Só o sentinela e os rótulos fixos são traduzidos.

### `sw.js`

`VERSION` sobe de `somaplay-v21` para `somaplay-v22`. O Service Worker é cache-first: sem
isso, quem já instalou continua rodando o JS antigo. O `SHELL` **não muda** — nenhum
módulo novo.

## O que não muda

- O campo `song.fonte`, seu formulário, seus chips de atalho e o preenchimento
  automático.
- O formato do registro salvo e o `.somaplay`. **Nenhuma migração.**
- Listas: continuam globais e imunes a filtros.
- A lente de modo (T2/T3), que segue funcionando exatamente como hoje, sozinha ou
  combinada com a fonte.

## Fora de escopo

- Multisseleção de fontes.
- Persistir o filtro entre sessões.
- Filtrar por fonte dentro de uma lista aberta.
- Tela de gerenciar/renomear/apagar fontes, ou renomear em massa variantes de grafia.
- O mesmo controle para estilo — Estilos já tem aba própria.

## Verificação

**Automática** (`cd app && node --test`), em `test/fontes.test.js`, sobre
`fontesDaBiblioteca`:

- biblioteca vazia → lista vazia (e **não** os dois fixos, ao contrário de
  `fontesSugeridas`);
- ordenado por contagem desc, desempate alfabético;
- "songbook" e "Songbook " contam para a mesma fonte; a primeira grafia encontrada é a
  exibida;
- música sem fonte (ou só espaço) cai no balde `SEM_FONTE`, que aparece por último;
- sem música sem fonte → o balde não aparece.

E sobre `fonteCasa`: filtro `null` → passa tudo; grafia divergente ("songbook" vs
"Songbook") → casa; `SEM_FONTE` → só as músicas sem fonte.

**Manual, no navegador** (`cd app && python3 -m http.server 8137`) — o que o teste não
alcança:

- Aba Artistas: filtrar por Songbook some com os artistas que não têm nenhuma música do
  songbook, e a contagem do card reflete só as que passaram.
- Aba Músicas: a lista recorta e o resumo cita o filtro; combinar com T2 e com a busca.
- Aba Estilos: os cards recortam; entrar num estilo mantém o recorte.
- Entrar num artista com o filtro ativo mantém o recorte; voltar preserva.
- O × limpa e tudo volta; o menu fecha ao escolher, no clique fora, no Esc e ao trocar de
  aba.
- Aba Listas: a pílula fica esmaecida e não responde; abrir uma lista mostra todas as
  músicas dela.
- Trocar PT/EN com o filtro ativo: "Todas as fontes" traduz, "Songbook" não.
- No tablet: a barra não vazia com a pílula aberta, e o alvo do × dá para acertar com o
  dedo.
