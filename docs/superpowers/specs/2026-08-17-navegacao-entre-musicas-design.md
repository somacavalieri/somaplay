# Soma_play — Navegação entre músicas dentro da música — design

**Data:** 2026-08-17 · **Estado:** especificado
**Estende:** [`2026-06-25-soma-play-design.md`](2026-06-25-soma-play-design.md) §6 (navegação), §7 (Listas)
**Encosta em:** [`2026-07-06-cabecalho-na-musica-e-fonte-design.md`](2026-07-06-cabecalho-na-musica-e-fonte-design.md) (top-bar enxuta)

**Origem:** pedido do usuário — *"o caminho mais fácil para fazer isso: eu tenho que dar
vários cliques, eu tenho que sair da música e voltar para a lista. Eu queria que tivesse
uma aba lateral, conforme o screenshot, com as músicas, para eu poder navegar dentro de
uma música. (…) seja quando eu estiver dentro de um artista ou quando eu tiver dentro de
uma lista."*

Com um mockup anexado: painel à direita, cabeçalho **"MÚSICAS DA PASTA · Djavan · 3 de
24"**, linhas numeradas com título e modo, a atual marcada `● Agora`.

## O problema

Ir da música 3 para a música 4 do mesmo artista custa três toques e uma troca de tela:
voltar, achar a linha, tocar. No ensaio isso é chato. No palco, com a mão no braço do
violão, é inviável — e é exatamente onde a próxima música é a coisa mais previsível do
mundo, porque ela está escrita na lista do show.

O que falta não é uma tela nova. É que a tela de toque **não sabe de onde você veio**. Ela
sabe o *tipo* da origem — `S.backTo` (`state.js:614`) guarda `'artist' | 'estilo' | 'list'
| 'home'` — e usa isso para uma única coisa: escolher para qual tela o botão voltar
retorna. Qual artista, qual lista, e quais músicas havia lá, ninguém guardou.

O mockup diz **"MÚSICAS DA PASTA"**, não "músicas do artista". A palavra é do usuário e é a
decisão de produto embutida no pedido: o conjunto que aparece ao lado da cifra é *de onde
você veio*, qualquer que seja — e não o artista, privilegiado sobre os outros.

## Decisão

### 1. Contexto de navegação

`S.backTo` vira `S.navCtx`, que guarda o tipo **e** a identidade:

```js
navCtx: { kind: 'artist'|'estilo'|'list'|'home', id },   // id: null quando kind === 'home'
navOpen: false,                                          // a gaveta está aberta?
```

`S.backTo` **deixa de existir**, e `goBack` (`main.js:279`) passa a ler `navCtx.kind`. Não é
economia de bytes: duas variáveis respondendo "de onde você veio" é como as duas passam a
discordar — a mesma razão pela qual `CAMPOS` (`partes.js`) é lido tanto pela poda da
exportação quanto pela fusão da importação em vez de existir duas vezes.

O `id` é capturado dentro de `openSong` a partir do estado corrente (`S.artistId`,
`S.estiloId`, `S.openListId`), pelo `kind` que o chamador já passa. **Nenhum chamador
muda:** os `data-from` espalhados por `home.js`, `artist.js`, `estilo.js` e `listscreen.js`
continuam idênticos.

O contexto vive só na sessão, como `backTo` hoje. Um contexto que sobrevive ao fechar o app
é uma promessa que a biblioteca pode não conseguir cumprir na volta.

### 2. A lista é derivada, não fotografada

Função nova em `state.js`, a definição única de "quais músicas, nesta ordem":

```js
export function songsDoContexto(ctx = S.navCtx)   // → [song], na ordem em que a tela mostrou
```

| `kind`   | fonte                                          | lente |
|----------|------------------------------------------------|-------|
| `artist` | `songsOfArtist(id)`                            | sim   |
| `estilo` | `songsOfEstilo(id)`                            | sim   |
| `list`   | `musicasPresentes(listaAberta(id))`            | **não** |
| `home`   | busca `S.query` + ordenação `S.sort`           | sim   |

Cada linha reproduz o que a tela de origem já faz — `artist.js:11`, `estilo.js:11`,
`listscreen.js:18`. A da Home hoje está solta dentro do render (`home.js:128-133`): ela
**muda de lugar** para `songsDoContexto`, e a Home passa a chamá-la. É o ganho de tabela
desta feature: a Home para de ter lógica de biblioteca dentro da função que desenha HTML.

`kind: 'home'` significa a aba **Músicas** e só ela: `songLine` (`home.js:100`) é o único
lugar que emite `data-from="home"`, e as duas chamadas de `songRow` passam `artist` ou
`estilo` explicitamente. A aba Artistas não lista música, lista artista.

**Favoritas não é uma lista de verdade.** `'__fav'` é virtual, montada por `favList()`
(`state.js:597`) a partir de `S.songs.filter(s => s.favorita)` — ela **não está em
`S.lists`**, e `listById('__fav')` devolve `null`. A tela da lista já sabe disso e resolve
com `isFav ? favList() : listById(id)` (`listscreen.js:17-18`). Essa resolução vira
`listaAberta(id)` em `state.js`, e a tela da lista passa a chamá-la — senão nasce a segunda
cópia de uma regra cuja primeira cópia está a uma linha de distância.

**Listas não passam pela lente**, e isso não é um esquecimento: Listas são globais por
decisão do PRD §7. A gaveta mostra o show inteiro, mesmo com a lente ligada — porque foi
isso que a tela da lista mostrou.

**Ids órfãos ficam de fora sozinhos.** `musicasPresentes` já é a tradução entre o array real
e o que a tela mostra; usá-la aqui é o que faz a numeração da gaveta bater com a numeração
da tela da lista. Escrever o filtro à mão aqui seria a terceira cópia de uma regra que já
custou um bug de reordenação.

**Por que derivar e não fotografar os ids na abertura.** A foto é mais simples e tem
precedente. Mas quebra num caminho que já existe: `duplicateInKey` (`main.js:473`) cria uma
cópia da música num tom novo e abre a cópia com a mesma origem. Numa foto tirada antes, a
cópia não está na lista — a gaveta mostraria "— de 24", sem linha atual. Derivando, ela
aparece na posição alfabética certa, porque é do mesmo artista. O caso vindo de uma lista
continua mostrando a cópia fora dela, o que está correto: ela genuinamente não está na
lista.

### 3. A gaveta sobrepõe, não empurra

**A cifra em texto se re-diagrama pela largura da caixa.** `reflowCifra` (`play.js:240`) mede
a caixa em colunas de caractere e re-renderiza quando ela muda; `fontQueCabe` (`play.js:291`)
encolhe a fonte até o sistema mais largo caber. Uma coluna que empurra a cifra mudaria o
tamanho da fonte e o ponto de quebra de cada linha a cada abre/fecha — a música se mexeria
debaixo do dedo no meio do ensaio.

Então a gaveta **flutua por cima**, com scrim, e a cifra atrás fica intacta. De brinde: não
disputa a vaga do mixer (`.mixer`, 380px à direita, `app.css:429`), não precisa de breakpoint
novo, e o mesmo código serve tablet e celular.

Visualmente é o mockup:

- 380px à direita, scrim escurecendo a cifra
- cabeçalho: ícone + rótulo do tipo, nome do contexto, `3 de 24`, e um chevron que leva à
  tela de origem (mesmo destino do voltar)
- linhas numeradas: posição, título, `bestLabel(s)` — `Cifra` ou `Cifra + acompanhamento`
- a música atual marcada com `● Agora`
- ao abrir, a linha atual rola para a vista
- fecha ao escolher uma música, ao tocar o scrim, no `Esc`, ou no botão

Abre por um botão novo na top-bar. **A gaveta é transitória**: você abre, pula, ela sai da
frente. Ela não é uma segunda coluna de trabalho como o mixer.

### 4. As setas moram na camada flutuante

Anterior/próxima **não vão para a top-bar** — ela foi esvaziada de propósito em
[2026-07-06](2026-07-06-cabecalho-na-musica-e-fonte-design.md) ("top-bar enxuta"), e já
carrega voltar, o switch Cifra/Karaokê, o zoom, o `⋯`, o mixer e o selo offline.

Elas entram na **camada que já aparece e some sozinha**: `.scroll-ctl` (`play.js:664`), que
surge ao toque e se apaga em 3,2s. Duas setas coladas nas laterais de `.cifra-col`, na mesma
altura (`bottom:18px`), com o controle de rolagem seguindo centralizado entre elas. Mesma
classe `ctl-hidden`, mesmo fade de `.25s`, mesmo timer.

```
┌──────────────────────────────────────────────┐
│  E o vencedor caminha só                     │
│                                              │
│  ┌───┐        ┌─────────────────┐      ┌───┐ │
│  │ ‹ │        │ ▶  −  Rolagem +  │      │ › │ │
│  └───┘        └─────────────────┘      └───┘ │
└──────────────────────────────────────────────┘
```

**Nas pontas, desabilitadas — não escondidas.** Sumir mudaria o lugar do controle de rolagem
entre uma música e outra, e o dedo aprende posição antes de aprender rótulo.

**Um seletor, não três.** O par mostrar/esconder está escrito em `play.js:665` e `:671`, e o
laço da rolagem automática mantém `.scroll-ctl` visível por conta própria em `play.js:686`.
São três listas que precisam concordar. Extrair uma constante `CTL_SEL` é o que evita a
terceira esquecer as setas e deixá-las presas na tela durante a rolagem.

### 5. Trocar de música sem deixar rastro

`openSongAction` (`main.js:176`) **não** chama `leavePlay()`. Hoje isso quase não aparece,
porque o teardown mora no caminho do voltar (`goBack`) e quase toda abertura de música vem
de fora da tela de toque. A exceção existente é `duplicateInKey`, que troca de música
estando dentro dela.

A gaveta e as setas tornam essa troca o caminho principal. Sem o teardown, ficam para trás
o transporte tocando, os timers de rolagem e de controles vivos, e a mídia anterior
carregada. Então: quando `S.screen === 'play'`, `openSongAction` faz `leavePlay()` antes de
trocar. Corrige o caminho existente junto.

O resto do reset já está pronto e não muda: `openSong` (`state.js:606`) zera transposição,
`tomPop`, zoom, invert, variante, velocidade e posição.

**O `kind` viaja com a troca.** Isso mantém viva, música após música, a regra de
`state.js:610`: vindo de uma lista, a música abre no melhor modo disponível e *não* pula
para o karaokê mesmo com a lente T3 ligada.

### 6. O indicador de posição

Entra como mais um item da linha de meta do cabeçalho que já existe no corpo da cifra —
`songHeaderHTML` (`play.js:104`), ao lado de Tom e Fonte:

```
Sina
Djavan
[Tom C] · CifraClub · 3 de 24 em Djavan
```

Não vai para a top-bar. Rola junto com a cifra e some quando você desce, o que é aceitável:
a resposta glanceável para "onde eu estou" é a própria gaveta, a um toque.

Quando `kind === 'home'`, o sufixo não tem nome de contexto — a linha é só a posição.

## Componentes

- **`state.js`** — `navCtx` e `navOpen` no `S`; `backTo` removido; `openSong` captura o `id`;
  `songsDoContexto(ctx)`; `listaAberta(id)` (resolve `'__fav'`, extraída de
  `listscreen.js:17-18`); `contextoLabel(ctx)` (rótulo + nome, para a gaveta e o cabeçalho);
  `posicaoNoContexto()` → `{ i, n }`.
- **`render/listscreen.js`** — passa a usar `listaAberta` em vez de resolver `'__fav'` na
  mão.
- **`render/songnav.js`** (novo) — a gaveta e as setas. Uma responsabilidade: andar entre
  as músicas do contexto. **Entra no `SHELL` de `app/sw.js`** (`shell.test.js` cobre).
- **`render/play.js`** — botão da gaveta na `.play-head`; as setas ao lado de `.scroll-ctl`;
  `CTL_SEL` extraído; a linha de posição em `songHeaderHTML`; a gaveta e o scrim no fim de
  `renderPlay`.
- **`render/home.js`** — o filtro+ordenação de `renderSongs` sai daqui e vira chamada a
  `songsDoContexto`.
- **`main.js`** — `goBack` lê `navCtx.kind`; ações `toggleSongNav`, `songPrev`, `songNext`,
  `openSongFromNav`; `leavePlay()` no caminho da troca; `Esc` fecha a gaveta.
- **`app.css`** — `.songnav` (gaveta + scrim, reaproveitando o padrão de `.mixer` no
  celular) e `.songnav-arrow`.
- **`i18n/pt.js` + `i18n/en.js`** — chaves novas nas **duas** tabelas (`i18n.test.js` cobre).
  Rótulos visíveis traduzidos; nenhum valor de `data-*` passa por `t()`.
- **`version.js` + `sw.js` linha 2** — bump **MINOR → 0.15.0** (`version.test.js` cobre).

## O que não muda

- A ordem em que cada tela lista música: `songsDoContexto` reproduz o que já existe.
- A lente global e como as telas a aplicam.
- O reset de estado ao abrir uma música.
- A regra do CLAUDE.md sobre não renotar a cifra: esta feature não toca no texto.
- Nenhum campo novo na música — nada a acrescentar em `CAMPOS` (`partes.js`), nada muda no
  `.somaplay`, no export ou no merge.

## Fora de escopo

- **Tocar a próxima automaticamente quando o áudio acaba.** Tentador e adjacente, mas é uma
  feature de reprodução, não de navegação — e decide sozinha o que tocar no palco.
- Reordenar as músicas de dentro da gaveta (isso é da tela da lista, com `listdrag.js`).
- Buscar dentro da gaveta.
- Gesto de arrastar a cifra para o lado para trocar de música: conflita com o pan da imagem
  (`setupImgGestures`, `play.js:722`).
- Lembrar o contexto entre sessões.
- Aba lateral em qualquer tela que não seja a de toque.

## Verificação

Lógica, com `node --test`:

- `songsDoContexto` nos quatro tipos; com a lente ligada em `artist`/`estilo`/`home`;
  numa lista com id órfão (a órfã fora, a numeração contínua); numa lista com a lente
  ligada (a lente é ignorada); em `'__fav'` (a lista virtual resolve).
- `posicaoNoContexto` na primeira, no meio, na última, e **com a música atual ausente do
  contexto** — que não é hipotético: desfavoritar a música pelo `⋯` estando dentro dela
  (`menuFav`, `play.js:526`) a remove do contexto Favoritas sob os próprios pés. Nesse
  caso as setas se desabilitam e a gaveta não marca `● Agora`; ninguém trava e nada some
  da tela.
- `shell.test.js`, `i18n.test.js` e `version.test.js` já cobrem módulo novo, paridade de
  chaves e sincronia da versão.

No navegador, que é a camada que conta:

1. Artista com muitas músicas → abrir a 3ª → a gaveta mostra as do artista, `3 de 24`,
   `● Agora` na certa, e a linha atual visível sem rolar.
2. Setas: aparecem ao toque com o controle de rolagem, somem juntas em 3,2s, continuam
   visíveis durante a rolagem automática, e estão desabilitadas na primeira e na última.
3. Trocar de música com o áudio tocando → o transporte da anterior para, o mixer é o da
   nova, a rolagem automática não continua sozinha.
4. Abrir de uma lista → a gaveta mostra a ordem do show, não a alfabética; andar com as
   setas não pula para o karaokê mesmo com a lente T3 ligada.
5. Lente T2 ligada, abrir de um artista → a gaveta mostra o mesmo recorte que a tela do
   artista mostrou.
6. Cifra em texto: abrir e fechar a gaveta **não** muda a fonte nem as quebras de linha.
7. Cifra em imagem e karaokê: gaveta e setas funcionam nos três modos.
8. Transpor, duplicar num tom novo, e conferir que a cópia aparece na gaveta com `● Agora`.
9. Abrir de **Favoritas** → a gaveta lista as favoritas; desfavoritar pelo `⋯` de dentro
   da música não trava nada.
10. Celular estreito: a gaveta cobre a tela sem brigar com o mixer em folha.
11. Offline, depois do bump: a versão em Configurações é 0.15.0 e a gaveta funciona.

## Próximos passos

Plano de implementação em `docs/superpowers/plans/2026-08-17-navegacao-entre-musicas.md`.
