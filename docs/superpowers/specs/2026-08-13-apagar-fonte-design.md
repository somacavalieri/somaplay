# Soma_play — Apagar uma fonte inteira — design

**Data:** 2026-08-13 · **Estado:** especificado
**Origem:** pedido do usuário — "eu, como usuário, gostaria de ter uma opção de remover
todos os arquivos de uma fonte... um símbolo de uma lixeirinha do lado do número de cada
fonte. Preciso de uma confirmação para remover. Com este recurso vai ser muito mais
simples administrar. Sem ele, o Somaplay não pode nem ser usado por outras pessoas,
porque fica muito difícil administrar um a um. Às vezes importamos bibliotecas inteiras
como teste."

Este é o item 3 dos "Próximos passos" de `2026-08-11-export-com-filtro-design.md`, que já
o previa nestes termos: *"Apagar em lote por fonte. É isto, e não exportar, que encolhe o
tablet — exportar copia, não apaga nada. Destrutivo, e por isso merece spec, confirmação e
verificação próprios."*

## O problema

Entrar na biblioteca só tem duas portas de saída hoje, e nenhuma serve:

- **Apagar música por música**, pelo menu `⋯` da tela de toque. Com 5.523 músicas de uma
  fonte, isso não é uma operação, é uma condenação.
- **Substituir tudo**, no import. Apaga a biblioteca inteira e exige ter em mãos um
  arquivo com o que você queria manter.

O resultado é que **importar é irreversível na prática**. Isso trava o fluxo que o dono do
acervo usa toda semana — puxar um lote novo do `chords/`, olhar como ficou, descartar se
ficou ruim — e é uma barreira de entrada para qualquer outra pessoa: experimentar o app
com uma biblioteca de teste vira um compromisso permanente com ela.

A fonte é o eixo certo para desfazer isso porque é exatamente **a marca de procedência de
um lote importado**. "VJ", "RV", "CifraClub", "Songbook" são de onde as músicas vieram; um
`.somaplay` gerado pelo export filtrado carrega uma fonte só. Apagar por fonte é desfazer
o import que a trouxe.

Todo o maquinário para escolher as vítimas **já existe e já é testado**: `fonteOf`,
`fonteCasa`, `fontesDaBiblioteca` e `songIdsDasFontes` em `state.js`. Falta o outro lado do
export: o mesmo recorte, apagando em vez de copiando.

## Decisão

### O motor recebe ids, e não sabe o que é fonte

É a mesma decisão de arquitetura do spec do export, aplicada ao gêmeo destrutivo. Fonte,
artista, lista e música são **maneiras de chegar num conjunto de músicas**; depois disso o
trabalho de apagar é idêntico. Então:

```js
deleteSongs(ids, { manterEmListas })
```

e a tradução "fonte → ids" é `songIdsDasFontes(S.songs, [nome])` — **a mesma função que o
export já usa, sem uma regra nova**. Grafia divergente ("songbook" vs "Songbook ") casa
igual, e o sentinela `SEM_FONTE` funciona sem caso especial.

Duas alternativas foram descartadas:

- **`deleteFonte(nome)`**, um motor que conhece o eixo, devolve ao código o caso especial
  por eixo que o export tirou fora — e cada eixo novo ganha um gêmeo para manter.
- **Um laço sobre o `deleteSong` de hoje** é zero código novo e inaceitável: ele refaz
  `S.songs` inteiro, varre todas as listas e checa o artista **por música**. São O(n²)
  operações e 5.523 transações IndexedDB para VJ — dezenas de segundos de tela congelada,
  num aparelho que já está sob pressão de armazenamento.

De brinde, "apagar este artista" e "apagar esta lista" passam a ser uma linha cada.

### As músicas somem; os ids ficam nas listas

Decisão do usuário, e ela tem uma consequência que é o ponto principal do recurso:

**Apagar "VJ" para liberar espaço e reimportar o `.somaplay` de VJ depois devolve o
repertório inteiro.** O "Show sábado" volta com as 8 músicas, não com as 3 que
sobreviveram.

É o mesmo mecanismo de auto-cura que faz o export por fonte funcionar, e ele já está
implementado e coberto: `musicasPresentes(l)` e `indicesPresentes(l)` existem exatamente
porque uma lista pode conter id de música ausente. Nenhuma tela precisa mudar.

Isso **diverge de propósito** do apagar-uma-música-avulsa, que continua podando os ids das
listas. A diferença é de intenção, e é honesta: pelo menu da música você matou *aquela
música* — ela não deve voltar sozinha; aqui você está mexendo no acervo, não no
repertório.

O custo é que uma lista pode ficar guardando ids que talvez nunca voltem. É barato: lista
é só id, não pesa nada, e as telas já não os mostram.

### Metadados primeiro, arquivos depois

A ordem importa porque a operação não é atômica: são várias transações mais um
`removeEntry` por arquivo no OPFS. Se o navegador morrer no meio, o estado que sobra
depende da ordem.

Apagar os **metadados primeiro** deixa, no pior caso, arquivos órfãos ocupando espaço —
bytes invisíveis, recuperáveis depois por uma varredura de `listBlobIds`. Apagar os
**arquivos primeiro** deixaria, no pior caso, músicas na biblioteca apontando para imagens
e áudios que não existem mais: cifra que abre em branco e stem que não toca.

Bytes órfãos são um problema menor que registro quebrado. A ordem é: memória e IndexedDB
primeiro, blobs depois.

### Sem desfazer

O remédio está a dois centímetros do problema: o bloco Exportar, no mesmo cartão, gera o
`.somaplay` daquela fonte antes de apagar. Uma lixeira de verdade — guardar as músicas
apagadas em algum canto por 30 dias — seria manter em disco exatamente o que o usuário
pediu para liberar. Isso está no texto do confirm, não no código.

## Componentes

### `js/state.js` — duas puras e um orquestrador

As decisões viram funções puras, testáveis sob `node --test` sem DOM e sem DB, como
`recorteParaExport` já é:

```js
export function blobIdsDasMusicas(songs)      // → string[] — imagens + stems + full, sem os vazios
export function artistasOrfaos(songs, ids)    // → string[] — artistIds sem NENHUMA música sobrevivente
```

`artistasOrfaos` recebe a biblioteca inteira e o conjunto apagado, e resolve numa passada
o que hoje custa um `S.songs.some(...)` por música. `ids` é um `Set` — a mesma estrutura
que `songIdsDasFontes` devolve.

O orquestrador é fino de propósito:

```js
export async function deleteSongs(ids, { manterEmListas = false } = {})
```

Não devolve nada, como `deleteSong` hoje: quem chama já tem o `Set` e sabe o tamanho dele.

Ordem: recorta as vítimas de `S.songs` → calcula `blobIdsDasMusicas` e `artistasOrfaos` →
grava os metadados (IndexedDB em lote, ver abaixo) → atualiza `S.songs` e `S.artists` em
memória → **só então** apaga os blobs, um a um.

`manterEmListas: false` (o padrão) poda os ids de todas as listas afetadas e grava só as
que mudaram. `true` não toca em lista nenhuma.

**`deleteSong(songId)` vira `deleteSongs([songId])`** — `deleteSongs` normaliza array ou
`Set` na entrada, para quem chama não precisar saber. O caminho de apagar uma
música avulsa passa a ser um caso do lote, e não um segundo código para manter em pé —
inclusive porque é ele que já define o comportamento correto de listas e de artista vazio.

### `js/db.js` — três operações em lote

Ao lado das existentes, uma transação para o lote inteiro em vez de uma por item:

```js
deleteSongs(ids)      // ids.forEach(id => s.delete(id)) numa transação só
deleteArtists(ids)
putLists(ls)
```

É daqui que vem a diferença entre 5.523 transações e uma.

As três singulares continuam existindo, mas por motivos diferentes, e vale registrar qual é
qual: `putList` tem seis chamadores espalhados por `main.js`, `state.js` e `backup.js`;
`deleteList` é usada ao apagar uma lista. Já **`deleteSong` e `deleteArtist` ficam sem
chamador nenhum** depois desta mudança, porque o único caminho que as usava agora passa
pelo lote. Ficam mesmo assim: `db.js` é a camada de persistência, e a superfície dela
espelha os stores — remover duas de seis deixaria `putSong` sem o `deleteSong` par, e a
próxima feature que apagar uma música sozinha reescreve as duas linhas.

Blob continua sendo `deleteBlob` um a um: `removeEntry` do OPFS não tem versão em lote.
Não é problema onde dói mais — VJ é cifra de texto e não tem blob nenhum; o custo real
está nas fontes de imagem, que são centenas de arquivos, não milhares.

### `js/render/settings.js` — a linha ganha uma lixeira

```
  [✓] Todas as fontes                  5925
  ────────────────────────────────────────────
  [✓] VJ                               5523   🗑
  [✓] RV                                180   🗑
  [✓] CifraClub                         162   🗑
  [✓] Sem fonte                           3   🗑
```

A linha hoje **é** um `<button class="check-row">`, e botão dentro de botão é HTML
inválido. Vira um `<div class="check-row has-del">` com dois botões dentro:

```html
<div class="check-row has-del">
  <button class="check-main" data-a="toggleExportFonte" data-id="VJ">…caixinha, nome, contagem…</button>
  <button class="del" data-a="deleteFonteAsk" data-id="VJ" aria-label="…">🗑</button>
</div>
```

`.check-row` continua sendo o contêiner flex, com o mesmo `:hover` e o mesmo raio; quem a
usa como `<button>` (o popover "Adicionar à lista", `render/popover.js:20`) **não muda**.
Os seletores `.check-row .nm` e `.check-row .ct` continuam casando de dentro do
`.check-main`.

O `data-id` da lixeira carrega a **grafia salva** da fonte, nunca traduzida — a regra do
`data-*` do CLAUDE.md. Só o balde usa `__sem_fonte`, com rótulo traduzido no que se vê,
igual ao que a linha já faz.

Três regras de exibição:

- **Sem lixeira na linha "Todas as fontes".** Aquilo é "apagar a biblioteca", outra
  decisão e outro botão.
- **A lista aparece com 1 fonte ou mais**, e não com 2 ou mais como hoje. A regra antiga
  ("biblioteca nova não merece uma caixinha solitária para marcar") abriria um buraco bem
  no caso que motivou o recurso: importou uma biblioteca de teste num aparelho vazio → uma
  fonte só → nenhuma lixeira, nenhuma saída. Com uma fonte só, **some a linha mestra**,
  que seria uma cópia da única linha; `S.exportFontes` permanece `null` e o export sai
  pelo caminho completo de sempre.
- Biblioteca vazia (`fontes.length === 0`) continua sem lista nenhuma.

### `css/app.css` — quatro linhas

```css
.check-row.has-del{padding-right:4px}
.check-main{flex:1;min-width:0;display:flex;align-items:center;gap:13px;height:52px;background:transparent;border:none;padding:0;cursor:pointer}
.check-row .del{width:44px;height:44px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:transparent;border:none;border-radius:11px;color:var(--muted2);cursor:pointer}
.check-row .del:hover{color:var(--red);background:var(--red-tint)}
```

Discreta como o usuário pediu — `I.trash(16)` em `var(--muted2)`, sem borda e sem fundo,
vermelha só no hover — mas com **44×44 de área de toque** dentro da linha de 52px. Dedo em
tablet não negocia, e no tablet não existe hover: o ícone fica sempre visível, sempre
apagado.

### `js/main.js` — a ação

```js
deleteFonteAsk(d) // d.id = a grafia salva, ou __sem_fonte
```

1. Traduz para ids com `songIdsDasFontes(S.songs, [d.id])`; se vier vazio, não faz nada.
2. `confirm(t('msg.fonte.confirmDelete', { name, count, song }))` — `name` é o rótulo
   visível (a grafia crua, ou `t('home.fonte.none')` para o balde) **sem `esc()`**: o
   diálogo nativo é texto puro, ao contrário do `aria-label`, que é atributo e passa por
   `esc()`.
3. `toast(t('msg.fonte.deleting'))`, `await deleteSongs(ids, { manterEmListas: true })`,
   `update()`, `toast(t('msg.fonte.deleted', …))`.

**Guarda de reentrância**: uma flag de módulo (`let apagandoFonte = false`) descarta um
segundo clique enquanto o trabalho corre. Duas exclusões concorrentes mexendo em `S.songs`
se sobrescrevem em silêncio, e o `confirm()` não protege contra isso — ele é modal, mas o
trabalho depois dele é assíncrono.

A barra de armazenamento **não precisa de nada**: `main.js:94` já chama `fillStorageInfo()`
a cada render de Configurações, então o espaço liberado aparece sozinho no `update()`.

### Estado reconciliado depois de apagar

Três ponteiros ficam olhando para o que não existe mais, e **quem conserta cada um segue a
mesma divisão do motor**: os dois que falam de fonte são da ação `deleteFonteAsk`; o que
fala de id de música é do `deleteSongs`, porque vale para qualquer exclusão.

| estado | quem | o que fazer | por quê |
|---|---|---|---|
| `S.exportFontes` | ação | volta para `null` | guarda **grafias**, e a biblioteca mudou por baixo dela. Mesmo motivo e mesmo remédio do import (`wireBackupInput`) |
| `S.fonteFilter` | ação | zera se `fonteCasa` casar com a fonte apagada | senão você volta para a home vazia sem entender por quê |
| `S.currentSongId` | `deleteSongs` | zera se a música apagada era ela | evita reabrir uma música morta ao voltar |

### `js/i18n/pt.js` e `js/i18n/en.js`

Chaves novas nas **duas** tabelas — o teste de paridade cobra:

| chave | PT | EN |
|---|---|---|
| `settings.export.delFonte` | Excluir as músicas da fonte {name} | Delete the songs from the source {name} |
| `msg.fonte.confirmDelete` | Excluir as {count} {song} da fonte "{name}" deste aparelho? As cifras, os áudios e as imagens vão junto, e não dá para desfazer. Exporte antes se quiser guardar. | Delete the {count} {song} from the source "{name}" on this device? Charts, audio and images go with them, and there is no undo. Export first if you want to keep them. |
| `msg.fonte.deleting` | Excluindo... | Deleting... |
| `msg.fonte.deleted` | Fonte excluída: {name} · {count} {song} | Source deleted: {name} · {count} {song} |
| `msg.fonte.deleteFailed` | Falha ao excluir: {error} | Delete failed: {error} |

O `deleteFailed` é o único acréscimo à lista original, e existe porque apagar 5 mil
músicas falhar **em silêncio** é pior que falhar: o usuário não teria como saber se o
espaço foi liberado. `deleteSongAsk`, a exclusão avulsa, não tem esse tratamento hoje —
uma inconsistência conhecida, pequena demais para consertar junto.

`common.song` / `common.songs` fazem o plural, como em `msg.backup.confirmReplace`.
`home.fonte.none` ("Sem fonte" / "No source") é reaproveitada como `{name}` do balde — a
mesma string dos outros dois lugares, não uma quarta cópia.

### `sw.js`

`VERSION` sobe de `somaplay-v36` (o valor que já está no working tree) para
`somaplay-v37`. O Service Worker é cache-first: sem o bump, quem já instalou continua
rodando o JS antigo. O `SHELL` **não muda** — nenhum módulo novo.

## O que não muda

- O dicionário de acordes (`chordbook`): é do aparelho, não da fonte. Uma cifra que volta
  por import reencontra as formas customizadas dela.
- As configurações, e `DB.wipe()`, que continua sendo só do import "substituir".
- O campo `song.fonte`, o formulário e os chips de atalho.
- O formato do `.somaplay` e os dois modos de import.
- `moveItem`, `reorderInList` e o arrastar das listas.
- O apagar-uma-música-avulsa, visto de fora: mesma confirmação, mesmo resultado — só a
  implementação passa a ser um caso de `deleteSongs`.

## Fora de escopo

- **Desfazer / lixeira temporária** — guardaria em disco exatamente o que se pediu para
  liberar. O remédio é exportar antes, e o confirm diz isso.
- **Lixeira na linha "Todas as fontes"** — é "apagar a biblioteca", outra decisão.
- **Apagar por artista ou por lista** — ficam baratos depois desta tarefa (o motor já
  recebe ids), mas cada um é spec próprio, e o lugar deles é contextual, na tela do artista
  e no menu da lista, não em Configurações.
- **Varredura de blobs órfãos** — o remédio para o crash no meio da exclusão. Precisa de
  `listBlobIds` cruzado com a biblioteca inteira, e de uma tela própria.
- **Renomear ou fundir fontes.**
- **Apagar as músicas marcadas nas caixinhas** — a caixinha é seleção de export; misturar
  os dois sentidos na mesma marca é como se apaga a coisa errada.

## Verificação

**Automática** (`cd app && node --test`), sobre as puras:

- `artistasOrfaos`: artista que perde todas as músicas entra; artista que sobrevive com
  uma fica de fora; conjunto vazio não devolve ninguém; música órfã de artista inexistente
  não quebra.
- `blobIdsDasMusicas`: junta imagens, stems e full; ignora `blobId` nulo e listas
  ausentes; música sem mídia nenhuma devolve vazio.
- `songIdsDasFontes` já é testada em `test/fontes.test.js` — aqui ela é o contrato de quem
  escolhe as vítimas, e o teste que garante que `SEM_FONTE` e grafia divergente continuam
  casando vale para os dois lados.

A paridade PT/EN é coberta por `test/i18n.test.js`, e o `SHELL` por `test/shell.test.js`.

**Manual, no navegador** (`cd app && python3 -m http.server 8137`) — o que o teste não
alcança:

- Apagar uma fonte de imagens e ver a **barra de armazenamento encolher de verdade**.
- Antes de apagar, exportar aquela fonte; depois de apagar, **reimportar em merge**: as
  músicas voltam, e **a lista se completa sozinha** com elas.
- Uma lista que perdeu músicas continua contando certo no cabeçalho, numerando 1..n sem
  buraco, e **arrastando na ordem certa**.
- O artista que só tinha músicas daquela fonte some das Artistas; o que tinha músicas de
  duas fontes fica, com as que sobraram.
- Cancelar no confirm não apaga nada.
- Com a lente da home naquela fonte, apagar a fonte devolve a home cheia, sem filtro
  fantasma.
- Com uma seleção de export parcial, apagar uma fonte volta tudo para "Todas as fontes".
- Biblioteca com **uma fonte só**: a linha aparece com a lixeira, sem a mestra.
- Apagar a única fonte restante: a lista some, o botão Exportar fica desabilitado, o app
  não quebra.
- Trocar PT/EN: o texto do confirm e o `aria-label` traduzem; o nome da fonte, não.
- No tablet: a lixeira é acertável com o dedo **sem acertar a caixinha**, e vice-versa.
- Apagar VJ (5.523 músicas) e cronometrar: tem que ser rápido o bastante para não parecer
  travado, e o toast "Excluindo..." tem que aparecer antes do trabalho.
