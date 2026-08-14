# Soma_play — Filtro de fontes em pílulas sempre visíveis — design

**Data:** 2026-08-14 · **Estado:** especificado
**Origem:** pedido do usuário, com print de um protótipo — "substituir o dropdown por uma
faixa de pílulas sempre visível, dentro da mesma linha da barra de abas... não pode
reduzir a área de leitura da lista."

Substitui as duas decisões centrais de `2026-08-10-filtro-por-fonte-design.md`: **uma
fonte por vez** e **não persiste entre sessões**. O resto daquele spec — alcance global,
listas imunes, comparação por grafia normalizada, o sentinela `SEM_FONTE`,
`fontesDaBiblioteca` e `fonteCasa` — continua valendo palavra por palavra.

## O problema

O filtro de hoje é um dropdown atrás de um ícone de etiqueta. Três defeitos, todos
consequência da mesma escolha:

- **O estado fica escondido atrás de um clique.** Só a fonte ativa aparece, e só quando
  há uma; qual é o recorte disponível, ninguém sabe sem abrir.
- **Não dá para comparar contagens.** Quantas músicas vieram do VJ *versus* do RV é
  exatamente a pergunta que o dono de um acervo de 6.000 músicas faz o tempo todo, e ela
  custa um clique e um menu que cobre a tela.
- **Não dá para combinar fontes.** "Só o que eu peguei em songbook" e "só o que eu peguei
  na internet" são recortes de duas ou três fontes, não de uma.

O acervo real do usuário já tem seis fontes (VJ 5.523, RV 180, CifraClub 162, RN 108,
Songbook 58, sem fonte 3) e cresce a cada lote importado. A escala pedida no spec anterior
— "seis ou sete" — chegou.

## Decisão

**Faixa sempre aberta, na mesma linha das abas.** O estado do filtro é legível sem
nenhum clique. Ela ocupa o espaço livre entre o `.segtab` e a `.lens`, e **não** ganha uma
linha própria em tela larga: a altura do cabeçalho não muda, e a área de leitura da lista
não encolhe. Esta é a restrição dura do pedido.

**Multisseleção, com primeiro clique que isola.** O gesto mais comum continua sendo "só
esta fonte", e continua custando um clique a partir de "Todas". Combinar é o segundo
clique em diante. Remover a última, ou marcar todas, volta para "Todas".

**"Todas" é o array vazio, e não as N fontes marcadas uma a uma.** Uma fonte nova
importada amanhã entra no resultado sem o usuário precisar ir marcá-la. Um filtro que
significa "estas seis" envelheceria em silêncio a cada import — que é justamente o fluxo
semanal do dono do acervo.

**Persiste entre sessões, com poda no boot.** O spec de 2026-08-10 recusou persistência
com um argumento correto: *"um filtro que sobrevive ao fechar o app vira uma biblioteca
misteriosamente vazia no próximo ensaio."* A faixa sempre visível desarma esse argumento —
o recorte está na tela, com nome e contagem, o tempo todo. Sobra o caso em que a fonte
salva não existe mais na biblioteca (apagada pelo recurso de `2026-08-13-apagar-fonte`, ou
um backup restaurado sem ela): aí não há pílula, e a biblioteca vazia volta a não ter
causa visível. Por isso a seleção é **podada no boot** contra as fontes que a biblioteca
realmente tem.

**Fontes com zero resultados continuam visíveis e clicáveis, apagadas.** "O VJ não tem
nada que case com o que você digitou" é informação; a pílula sumindo é a ausência dela. É
também o que mantém a faixa parada enquanto se digita.

**Cor fixa por fonte, cromo em tokens.** Ver a seção *CSS e temas*.

**Alcance: tudo que já passa pela lente, menos Listas.** Artistas, Músicas, Estilos, tela
do artista e tela do estilo — os cinco pontos que chamam `matchesLens`. Listas continuam
globais e imunes (§7 do PRD). Nada de novo aqui: é herdado, não implementado.

## Componentes

### `js/state.js` — estado, casamento, contagem

`S.fonteFilter` deixa de ser `string | null` e passa a ser `string[]`: as grafias
exibidas das fontes marcadas, `[]` para todas. O sentinela `SEM_FONTE` continua sendo um
membro válido do array. `S.fonteMenuOpen` é apagado junto com o dropdown.

**`fonteCasa` não muda de assinatura.** Ela é chamada por `songIdsDasFontes`, que serve o
export (`2026-08-11-export-com-filtro`) e o apagar em lote (`2026-08-13-apagar-fonte`), e
tem teste próprio nos dois. Em vez de alargá-la, entra uma irmã de uma linha:

```js
export function fonteCasaAlguma(fonte, filtros) {
  return !filtros?.length || filtros.some((f) => fonteCasa(fonte, f));
}
```

`matchesFonte(s)` passa a chamá-la com `S.fonteFilter`. `lensAtiva()` troca
`S.fonteFilter !== null` por `S.fonteFilter.length > 0`. **`matchesLens` não muda** — e é
por isso que as cinco telas herdam o comportamento novo sem uma linha de código cada.

A regra de clique é uma função pura, para o "isola / soma / remove / colapsa" ser testado
sem DOM:

```js
export function toggleFonte(atual, nome, todasDaBiblioteca) → string[]
```

| estado | clique | resultado |
|---|---|---|
| `[]` (todas) | `CifraClub` | `['CifraClub']` — **isola** |
| `['CifraClub']` | `VJ` | `['CifraClub','VJ']` — soma |
| `['CifraClub','VJ']` | `VJ` | `['CifraClub']` — remove |
| `['VJ']` | `VJ` | `[]` — a última saiu, volta pra todas |
| todas menos uma | a que falta | `[]` — marcou todas, colapsa |

Comparação por grafia normalizada (`trim()` + minúsculas), como o resto do módulo; o array
guarda a **grafia exibida**, que é a que o `data-id` carrega e a que aparece na pílula.

A poda do boot:

```js
export function podaFontes(salvas, daBiblioteca) → string[]
```

Intersecta por grafia normalizada e devolve **as grafias da biblioteca**, não as salvas —
assim uma fonte que mudou de grafia entre um import e outro se auto-corrige em vez de
sumir. Grafia órfã cai fora; se nada sobrar, `[]`.

As contagens:

```js
export function contagensPorFonte(songs, { query, modeFilter }) → { itens: [{nome, n}], total }
```

Três decisões dentro dela:

- **Conta músicas, sempre** — inclusive na aba Artistas, onde os cards contam artistas.
  A pílula quer dizer a mesma coisa em toda aba, ou a contagem não quer dizer nada.
- **Aplica busca e lente de modos; nunca o próprio filtro de fonte.** Se aplicasse, toda
  pílula não marcada mostraria zero e a faixa perderia a função de comparar.
- **O conjunto e a ordem das pílulas vêm de `fontesDaBiblioteca(S.songs)`** — biblioteca
  inteira, sem busca, mais usadas primeiro, `SEM_FONTE` por último. Só o **número** reage
  ao que se digita. Sem isso as pílulas dançariam de lugar e sumiriam letra a letra; com
  isso, a atualização durante a digitação é cirúrgica (ver `refreshFonteCounts`).

O predicado de busca é o de música — título ou nome do artista contém a consulta — e é um
só para todas as abas, pelo mesmo motivo do primeiro item.

`total` é o número da pílula `Todas`: as músicas que passam em busca e modo, com ou sem
fonte. É a soma das outras, já que toda música tem exatamente uma fonte ou nenhuma.

### `js/render/fontestrip.js` — módulo novo

O primeiro módulo de render com comportamento imperativo desde o `listdrag.js`, e pelo
mesmo motivo: HTML no render, comportamento ligado no `afterRender`. Três exports.

**`corDaFonte(nome)`** — mapa fixo por grafia normalizada:

| fonte | cor |
|---|---|
| `vj` | `#34D399` |
| `rv` | `#F4B860` |
| `cifraclub` | `#E8A23D` |
| `rn` | `#60A5FA` |
| `songbook` | `#2DD4BF` |
| `SEM_FONTE` | `#9A9AA5` |

Fora do mapa, hash determinístico do nome normalizado numa paleta de oito (`#A78BFA`,
`#F472B6`, `#60A5FA`, `#34D399`, `#F4B860`, `#2DD4BF`, `#FB923C`, `#C084FC`). Nome de
fonte é texto livre — o usuário digita o que quiser — então a cor precisa sair do nome, e
não da posição na lista: por posição, a cor de uma fonte mudaria quando outra ganhasse
músicas, e seria diferente em cada dispositivo. Duas fontes podem cair na mesma cor; nome
e contagem seguem sendo os identificadores, e a cor nunca é o único indicador.

Exportado, e não privado, para os badges de origem das linhas de música poderem reusar a
paleta depois sem duplicá-la.

**`fonteStripHTML()`** — só string, como todo render do app:

```html
<div class="fonte-strip" id="fonte-strip" role="group" aria-label="Filtrar por fonte">
  <span class="tagico">${I.tag(15)}</span>
  <div class="fonte-scroll" data-hscroll>
    <button class="fpill todas" data-a="clearFonte" aria-pressed="true" title="…">
      <span class="nm">Todas</span><em>14</em></button>
    <span class="sep"></span>
    <button class="fpill" data-a="toggleFonte" data-id="VJ" aria-pressed="false"
            style="--fc:#34D399" title="VJ · 2 músicas · ver somente esta">
      <span class="dot"></span><span class="nm">VJ</span><em>2</em></button>
    …
  </div>
  <button class="fscroll-next" data-a="fonteScrollNext" title="…">${I.chevR(18)}</button>
</div>
```

Cada pílula é um `<button>` com `aria-pressed`; a cor entra por variável CSS inline
(`--fc`), o que mantém o CSS livre de uma regra por fonte. `Todas` usa `--fc:var(--accent)`.

**`wireFonteStrip()`** — o comportamento, chamado do `afterRender()`. Ver *Os três
consertos mecânicos*.

### `js/render/home.js` — a barra

`fonteControl()` sai inteira. A `.tabrow` passa a ser:

```
.segtab · .tabsub · .fonte-strip (flex:1 1 auto; min-width:0) · .lens
```

O funil deixa de ser o rótulo do grupo todo e passa a rotular só os chips T2/T3, que é o
que sobra na `.lens`; a etiqueta na frente da faixa faz esse papel do outro lado. Dois
glifos parecidos na mesma linha, em pontas opostas, cada um rotulando um grupo — é o
primeiro ponto a olhar no navegador.

`filtroAtivoLabel()` — o sufixo que explica o recorte no card do artista e no resumo da
aba Músicas — passa a juntar os modos com **as fontes marcadas**, não com a fonte única.

### Os três consertos mecânicos

Nenhum deles é visível no protótipo, e os três quebram a faixa se ficarem de fora.

**a) O `scrollLeft` tem que sobreviver ao clique.** `update()` reescreve
`app.innerHTML` inteiro, e `captureUI`/`restoreUI` só guardam `scrollTop` de
`.content-scroll`. Eles ganham `[data-hscroll]` → `scrollLeft`, simétrico e sob a mesma
guarda de "só quando a tela é a mesma". Sem isso, clicar numa pílula com a faixa rolada
joga ela de volta ao começo — e as pílulas do fim do acervo ficam inalcançáveis na
prática.

**b) O foco tem que voltar para a pílula clicada.** Depois do re-render o foco cai no
`<body>` e a navegação por teclado morre no primeiro clique. Precedente exato: o
`pendingHandleIdx` do arraste de listas. Uma variável `pendingFonte` guarda a grafia e o
`afterRender` devolve o foco — **por varredura**
(`[...document.querySelectorAll('.fpill')].find((el) => el.dataset.id === nome)`), nunca
por string de seletor: nome de fonte é texto livre, e uma aspa ou colchete quebraria o
seletor.

**c) As contagens têm que acompanhar a busca sem re-render.** Digitar chama
`updateHomeResults()`, que troca só o `#home-results` — a `.tabrow`, onde a faixa mora,
não é tocada, e as contagens congelariam na primeira letra. Ele passa a chamar também
**`refreshFonteCounts()`**, que escreve o `textContent` dos `<em>` e alterna a classe
`.zero`, **e nada mais**. Cirúrgico de propósito: não mexe na estrutura, então não zera o
`scrollLeft` nem exige religar os listeners a cada tecla. Isso só é possível porque o
conjunto de pílulas vem da biblioteca e não da busca — a decisão da seção anterior paga
aqui.

### Overflow e responsivo

A faixa rola na horizontal com a barra de rolagem oculta, e ganha duas afordâncias quando
há conteúdo fora da vista: máscara de fade de 34px na borda direita e um botão-seta
circular de 30px que avança 70% da largura visível, com `scroll-behavior:smooth`.

- **Roda do mouse:** listener não-passivo convertendo `deltaY` em `scrollLeft`, sem exigir
  shift. `preventDefault()` **só** enquanto há para onde rolar naquele sentido — nas
  pontas o evento passa adiante e a lista rola, que é o que o dedo e a roda esperam.
- **Estado `.ov`:** `scrollWidth > clientWidth`, recalculado por `ResizeObserver` no
  scroller (mais confiável que `resize` de janela, porque a `.tabrow` reflui sozinha), no
  `scroll`, e ao fim de `refreshFonteCounts()` — a largura da pílula muda quando `162`
  vira `9`.
- Abaixo de **1180px** a faixa desce para uma segunda linha da própria `.tabrow`
  (`flex-basis:100%`), em vez de espremer as abas. Abaixo de **1280px** o `.tabsub`
  ("N artistas na biblioteca") some para liberar espaço — hoje ele some só em 900px.
- Alvos de toque de 44px em ponteiro grosso.

### `css/app.css` — CSS e temas

Cromo em tokens, cor da fonte fixa. Os hex do protótipo **são** os tokens do tema escuro,
então no escuro o resultado é o print:

| protótipo | token |
|---|---|
| `#17171C` fundo inativo | `var(--surface2)` |
| `#2E2E37` borda | `var(--border)` |
| `#D8D7D4` texto | `var(--text)` |
| `#6E6E7A` contagem, etiqueta | `var(--muted)` |
| `#131317` fundo zero | `var(--deep)` |
| `#5A5A64` texto zero | `var(--muted2)` |

Uma exceção deliberada: o texto da pílula **ativa** fica `#0E0E11` cravado, e não
`var(--bg)`. O fundo da pílula ativa é a cor da fonte — saturada e clara nos dois temas —
e o que contrasta com ela é tinta escura; no tema claro, `var(--bg)` daria bege sobre
verde. Vale igual para o ponto (`rgba(14,14,17,.5)`) e para a contagem
(`rgba(14,14,17,.6)`), que são exatamente os valores do protótipo.

Geometria: altura 36px (44 em ponteiro grosso), raio 999px, padding lateral 13px, gap
interno 7px, gap entre pílulas 6px, ponto de 7px. Nome em Inter 13px (500 inativo, 700
ativo), contagem em JetBrains Mono 11px — as três famílias já são locais. Transição de
120ms em `background` e `color`, e nada de animação de layout.

Saem `.fonte-wrap`, `.fonte-pill`, `.fonte-menu`, `.chip.fonte` e o override
`.fonte-menu{left:0;right:auto}` do bloco de 900px.

### `js/main.js` — ações

Entra `toggleFonte` (aplica a função pura, grava e marca `pendingFonte`) e
`fonteScrollNext`. `clearFonte` sobrevive, agora zerando para `[]`. Saem
`toggleFonteMenu`, `setFonteFilter`, o fecha-ao-clicar-fora do `.fonte-wrap` e a entrada
de `fonteMenuOpen` no `Esc`.

A poda roda em dois lugares: no `initState()`, depois de `S.songs` carregar, e depois de
um import de backup — ao lado do `S.exportFontes = null` que já existe ali pelo mesmo
motivo, e que o spec do export já explica: a biblioteca acabou de trocar debaixo de uma
seleção que guarda grafias.

### `js/i18n/pt.js` e `js/i18n/en.js`

Nas **duas** tabelas, senão `i18n.test.js` reprova:

| chave | PT | EN |
|---|---|---|
| `home.fonte.all` | Todas | All |
| `home.fonte.tipAll` | Todas as fontes · {n} músicas | All sources · {n} songs |
| `home.fonte.tipOnly` | {fonte} · {n} músicas · clique para ver somente esta | {fonte} · {n} songs · click to see only this |
| `home.fonte.tipInclude` | {fonte} · {n} músicas · clique para incluir | {fonte} · {n} songs · click to include |
| `home.fonte.tipRemove` | {fonte} · {n} músicas · clique para remover | {fonte} · {n} songs · click to remove |
| `home.fonte.next` | Ver mais fontes | See more sources |

`home.fonte.hint` ("Filtrar por fonte") vira o `aria-label` do grupo e `home.fonte.none`
("Sem fonte") continua sendo o rótulo do sentinela — as duas seguem como estão.
`home.fonte.all` muda de texto ("Todas as fontes" → "Todas") porque agora divide a linha
com as outras pílulas. `home.fonte.clear` sai.

O nome da fonte nunca passa por `t()` como texto traduzido — mas passa como **parâmetro**,
e `t()` não escapa parâmetro. `esc()` antes de passar, como `filtroAtivoLabel` já faz.

### `sw.js`

`./js/render/fontestrip.js` no `SHELL`. `shell.test.js` já cobre o registro — ele varre
`js/**` e reprova qualquer módulo fora do `SHELL`.

**Nota (2026-08-14, revisão pós-implementação):** na hora de escrever este spec a versão
ainda era o `VERSION` cru do `sw.js` (`somaplay-v38` → `somaplay-v39`, o texto original
desta seção). No mesmo dia o app ganhou versionamento visível
(`2026-08-14-versionamento-design.md`): a versão virou um número `X.Y.Z` em três literais
sincronizados — `export const VERSION` em `app/js/version.js`, `somaplay-<versão>` em
`app/sw.js`, e uma seção `## [<versão>]` no `CHANGELOG.md`, cobrados por
`app/test/version.test.js`. Esta funcionalidade saiu como `0.10.0` — MINOR, porque muda o
que o app faz.

## O que não muda

- O campo `song.fonte`, o formulário, os chips de atalho e o preenchimento automático.
- O formato do registro salvo e o `.somaplay`. **Nenhuma migração de dados.**
- `fonteCasa`, `songIdsDasFontes`, o export filtrado e o apagar em lote.
- Listas: globais e imunes a filtros.
- A lente de modos (T2/T3), a busca, a ordenação, a densidade dos cards e a tela de toque.
- O `.src-qual` da desambiguação por colisão (o qualificador de texto puro que aparece só
  quando dois títulos colidem) fica como está.

**Ruling do controlador, meio da execução (2026-08-14):** o `.src-badge` da linha compacta
(`2026-08-12-lista-compacta-em-colunas-design.md`) **passou a usar este `corDaFonte`
hex**, e não mais o índice `0–4` que tinha antes em `state.js`. Os dois sistemas de cor
discordavam na mesma tela — VJ cinza no badge e verde na pílula, RV cinza contra âmbar — e
a paleta antiga de 5 posições colidia VJ e RV no mesmo slot. O pedido original do usuário
já pedia isto por extenso: *"uma cor fixa por fonte, reaproveitada nos badges de origem das
listas de músicas."* O `corDaFonte` antigo de `state.js` foi apagado; `fonteBadge()` em
`home.js` agora pinta por `style="--fc:${corDaFonte(nome)}"`, a mesma variável CSS da
pílula. Ver o plano, Task 3 Step 6b, para o diff exato.

## Fora de escopo

- Um controle de fonte nas telas de artista e de estilo. O filtro continua valendo lá,
  via `matchesLens`, mas sem controle visível — exatamente como a lente de modos já se
  comporta hoje. Não é regressão; se incomodar, é spec próprio.
- Filtrar por fonte dentro de uma lista aberta.
- Renomear ou unificar grafias de fonte em massa.
- Persistir a lente de modos (T2/T3), que segue vivendo só na sessão.

## Verificação

**Automática** (`cd app && node --test`), em `test/fontes.test.js`:

- `fonteCasaAlguma`: array vazio passa tudo; grafia divergente casa; `SEM_FONTE` só as sem
  fonte; duas fontes marcadas passam as duas e barram a terceira.
- `toggleFonte`: as cinco linhas da tabela acima, incluindo o colapso quando a última
  fonte da biblioteca é marcada.
- `podaFontes`: grafia órfã cai; grafia divergente se corrige para a da biblioteca; tudo
  órfão vira `[]`; seleção vazia continua vazia.
- `contagensPorFonte`: reage à busca e ao `modeFilter`; **ignora** o `fonteFilter`; ordem
  e conjunto iguais aos de `fontesDaBiblioteca`, com `SEM_FONTE` por último; `total`
  igual à soma dos itens.
- `corDaFonte`: as seis do mapa; determinismo (mesma entrada, mesma saída); grafia
  divergente dá a mesma cor; nome desconhecido cai na paleta.

`i18n.test.js` cobre a paridade das chaves e `shell.test.js` o módulo novo, ambos sem
código de teste novo.

**Manual, no navegador** (`cd app && python3 -m http.server 8137`) — o que o teste não
alcança, e é onde este spec de fato se decide:

- Estado inicial: `Todas` ativa, nenhuma música escondida.
- Primeiro clique isola; o segundo soma; tirar a última volta pra `Todas`; marcar todas
  colapsa pra `Todas`.
- Digitar na busca: as contagens mudam **e** as pílulas ficam paradas; a que zera fica
  apagada e ainda clicável.
- Combinar com T2/T3: as contagens refletem os dois eixos.
- A faixa rolada não volta ao começo ao clicar numa pílula; a pílula clicada continua com
  o foco (visível no `Tab` seguinte).
- Roda do mouse rola a faixa; nas pontas, a página volta a rolar.
- Com dez fontes cadastradas: fade, seta e rolagem por toque; nada cortado sem afordância.
- Recarregar o app: a seleção volta. Apagar a fonte selecionada (`apagar em lote`) e
  recarregar: volta pra `Todas`, biblioteca inteira à vista.
- Aba Listas: a faixa apagada e inerte; abrir uma lista mostra todas as músicas dela.
- Tema claro: a faixa não vira uma ilha escura, e a pílula ativa tem contraste.
- Larguras 1280, 1180 e 900: o `.tabsub` some, a faixa desce de linha, as abas não são
  espremidas, e a altura do cabeçalho não cresce em tela larga.
- PT/EN com fontes marcadas: `Todas` e os `title` traduzem, `Songbook` não.
