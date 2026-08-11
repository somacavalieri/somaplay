# Soma_play — Exportar com filtro de fontes — design

**Data:** 2026-08-11 · **Estado:** especificado
**Origem:** pedido do usuário — "quando eu exporto a biblioteca, vão todos os arquivos
juntos. Eu quero poder exportar, por exemplo, só os arquivos do Songbook... Também seria
mais interessante exportar ser uma mídia separada. Ter um de importar e um de exportar
para ficar mais fácil fazer uma UI legal."

## O problema

`exportLibrary()` varre `S.songs` inteiro. Ou é tudo, ou é nada. Com o acervo crescendo,
isso trava quatro coisas que o usuário quer fazer, todas confirmadas por ele:

1. **Backup por lote** — picar a biblioteca em arquivos menores, mais fáceis de guardar e
   de mover, e reimportar em merge depois.
2. **Passar um recorte para outra pessoa** — sem despejar a biblioteca inteira em cima
   dela.
3. **Migrar entre aparelhos aos poucos** — em vez de um arquivo gigante que pode falhar
   no meio.
4. **Curadoria** — separar um lote para revisar.

Como os quatro incluem "importar isso sozinho, num aparelho que talvez não tenha nada", o
arquivo filtrado precisa ser **autossuficiente**: nada de referência pendente que o
destino não saiba resolver.

O eixo `fonte` já existe, já é normalizado e já é testado (`fonteOf`, `fonteCasa`,
`fontesDaBiblioteca` em `state.js`, spec `2026-08-10-filtro-por-fonte-design.md`). O que
falta é o recorte na exportação.

O bloco "Armazenamento e backup" também empilha três botões sem explicar nenhum. O
usuário quer dirigir o uso para **Adicionar/atualizar** e deixar **Substituir** como o
que ele é: destrutivo.

## Decisão

### O motor não sabe o que é fonte

Esta é a decisão de arquitetura, e ela veio de uma reflexão do usuário: valeria a pena
exportar também por artista, por música e por lista?

A resposta é que **os eixos servem trabalhos diferentes**. Fonte é a *proveniência do
dono do acervo* — ótima para gerenciar backup, e quase inútil para o amigo que recebe o
arquivo, porque "veio do songbook" não quer dizer nada para quem não conhece o acervo. O
que o amigo pede é um artista ou um repertório.

Mas fonte, artista, lista e música são todos **maneiras de chegar num conjunto de
músicas**. Depois disso o trabalho é idêntico. Então o motor recebe o conjunto pronto:

```js
recorteParaExport({ artists, songs, lists }, { songIds, listIds })
```

`null` em qualquer um dos dois significa "tudo". Isso é **menos conceito, não mais**: o
motor deixa de ter um caso especial por eixo, e um eixo novo entra sem tocar em
`backup.js` nem no teste dele.

**Só o seletor de fontes entra nesta tarefa.** Artista e lista ficam em "Próximos
passos", e não como mais caixinhas em Configurações — 73 artistas numa lista de caixinhas
num tablet em pé na estante é um inferno, não é uma opção avançada. O lugar certo para
eles é contextual, de onde a coisa já está.

### Uma seleção, não um filtro

`S.exportFontes = null` significa **todas**, inclusive uma fonte cadastrada depois.
Desmarcar uma materializa o array com as outras; remarcar todas volta para `null`. A
caixinha mestra é literalmente `S.exportFontes === null`.

O ganho: com `null`, `recorteParaExport` devolve o estado inteiro, e o caminho do backup
completo fica **provadamente idêntico ao de hoje** — é uma asserção do teste, não uma
esperança.

Vive só na sessão, como `S.fonteFilter`. Uma seleção que sobrevive ao fechar o app vira
um backup misteriosamente incompleto no próximo ensaio.

### As listas viajam inteiras

Uma lista mistura fontes: "Show sábado" com 5 do Songbook e 3 do CifraClub. Num export só
do Songbook ela vai **com os 8 ids**. No destino aparecem as 5 que existem, e quando o
CifraClub for importado depois, **a lista se completa sozinha**.

Listas são só ids: não pesam nada no arquivo. O peso é áudio e imagem.

As duas alternativas foram descartadas por motivo concreto:

- *Podar a lista para o recorte* perde dado em silêncio: o merge faz `DB.putList(l)`, que
  **substitui a lista inteira pelo id**. Reimportar um arquivo com a lista podada por cima
  da própria biblioteca encolheria a lista original de 8 para 5.
- *Deixar as listas fora do export filtrado* faria picar a biblioteca por fonte perder
  todas as listas.

O custo é consertar o contador do cabeçalho da lista, que hoje conta id órfão e não o
mostra — bug que já existe, e que essa decisão torna visível.

### O que mais viaja

| peça | regra | por quê |
|---|---|---|
| `songs` | as do conjunto de ids | — |
| `artists` | só os com ≥1 música no recorte | artista vazio no destino é lixo para apagar à mão |
| `lists` | todas, intactas (`listIds: null`) | decisão acima |
| `chordbook` | sempre inteiro | não tem fonte, é o dicionário do aparelho, e é JSON pequeno; sem ele uma cifra pode chegar sem a forma customizada do acorde |
| `blobs` | só das músicas do recorte | **é daqui que vem o arquivo menor** |
| `settings` | como hoje | só é aplicado no modo substituir |

**Nenhuma migração e nenhum bump de formato.** O manifest continua `version: 1` — um
arquivo filtrado é um `.somaplay` v1 legítimo, e uma versão antiga do app lê ele sem saber
que houve filtro.

## Componentes

### `js/state.js` — o eixo vira ids

Ao lado de `fonteCasa` e `fontesDaBiblioteca`, que já são o domínio de fonte:

```js
export function songIdsDasFontes(songs, fontes)   // → Set<id>
```

Devolve um **`Set`**, e é um `Set` que `recorteParaExport` recebe em `songIds` — o teste
de pertinência é o trabalho todo dessa estrutura, e uma biblioteca grande não merece
`Array.includes` por música.

`fontes` é um array de grafias exibidas e/ou o sentinela `SEM_FONTE`. A comparação é
`fonteCasa`, a mesma regra normalizada da lente — `"songbook"`, `"Songbook "` e
`"Songbook"` são a mesma fonte. **Zero regra nova.** Uma fonte marcada que não existe mais
na biblioteca simplesmente não contribui.

Recebe `songs` por parâmetro, como as vizinhas, para o teste passar arrays literais.

Estado novo: `S.exportFontes = null`.

### `js/backup.js` — o motor

```js
export function recorteParaExport({ artists, songs, lists }, { songIds, listIds })
```

Pura, sem DOM e sem DB — `backup.js` já importa sob Node, verificado. `songIds` é um
`Set`; `null` em qualquer dos dois campos significa "tudo".

Devolve **só as três coleções recortadas**: `{ artists, songs, lists }`. `chordbook` e
`settings` continuam vindo direto dos seus módulos dentro de `exportLibrary`, sem passar
por aqui — não têm fonte, e portanto não têm o que recortar.

`exportLibrary(sel)` passa a chamar essa função e a montar `blobIds` a partir do `songs`
recortado. O resto do formato — magic, header de 10 dígitos, blobs concatenados na ordem
do manifest — **não muda**.

Nome do arquivo, porque quatro `somaplay-backup-2026-08-11` na pasta de Downloads não
servem para nada:

| seleção | nome |
|---|---|
| todas (`null`) | `somaplay-backup-2026-08-11.somaplay` *(igual a hoje)* |
| uma fonte | `somaplay-songbook-2026-08-11.somaplay` |
| duas ou mais | `somaplay-3-fontes-2026-08-11.somaplay` |

O slug é minúsculas com não-alfanumérico virando `-`; `SEM_FONTE` vira `sem-fonte`. A
palavra "fontes"/"sources" passa por `t()`: nome de arquivo não é dado persistido, então a
regra do `data-*` não se aplica. Marcar tudo de volta normaliza para `null`, e o nome
volta a ser `backup`.

### `js/render/settings.js` — três blocos

O bloco único vira três.

**Armazenamento** — só a barra e o rótulo de uso, como já são. Some o "e backup" do
título.

**Exportar biblioteca** — subtítulo de uma linha e a lista de fontes, reaproveitando
`.check-row` / `.checkbox` do popover "Adicionar à lista". **Sem CSS novo.**

```
Exportar biblioteca
Gera um .somaplay para guardar ou levar para outro aparelho.

  [✓] Todas as fontes                    186
  ─────────────────────────────────────────
  [✓] VJ                                 112
  [✓] Songbook                            41
  [ ] CifraClub                           30
  [✓] Sem fonte                            4

  [ ↓  Exportar 157 músicas ]
```

As linhas vêm de `fontesDaBiblioteca(S.songs)` — mais usadas primeiro, "Sem fonte" por
último. Três detalhes que não são óbvios:

- O `data-id` da linha carrega a **grafia salva** da fonte, nunca traduzida — a regra do
  `data-*` do CLAUDE.md. Só "Sem fonte" usa `__sem_fonte` no `data-id` com rótulo
  traduzido, como o menu de fonte da home já faz.
- **`fontesDaBiblioteca` com menos de dois itens → some a lista inteira**, mestra
  inclusive, e o bloco vira só o botão Exportar. Biblioteca nova não merece uma caixinha
  solitária para marcar. Nesse caso `S.exportFontes` permanece `null`, e o arquivo sai
  pelo caminho completo de sempre.
- Nenhuma marcada → o botão fica **desabilitado** e o rótulo troca para
  `settings.export.nothing` ("Nenhuma fonte marcada"), em vez de "Exportar 0 músicas".
  Exportar um arquivo vazio não é um caso de uso, é um acidente.

**Importar** — a hierarquia que o usuário pediu, com o texto fazendo o trabalho:

```
Importar

  [ ↑  Adicionar / atualizar ]        ← .btn-primary, largura cheia
  Junta o arquivo à sua biblioteca. Nada do que você já tem é apagado.

  [ Substituir tudo ]                 ← .btn-ghost, texto vermelho
  Apaga a biblioteca deste aparelho e põe a do arquivo no lugar.
```

Os diálogos de confirmação continuam como estão — já dizem o que precisa. O
`<input type="file" id="file-backup">` e a religação dele em `main.js` não mudam.

### `js/main.js` — ações

`toggleExportAll`, `toggleExportFonte` (usa o `data-id`) e `exportBackup`, que passa a
montar a seleção:

```js
const fontes = S.exportFontes;
const sel = fontes ? { songIds: songIdsDasFontes(S.songs, fontes), listIds: null }
                   : { songIds: null, listIds: null };
```

Os toasts de exportação (`msg.backup.exporting`, `exported`, `exportFailed`) continuam.

### `js/render/listscreen.js` — o contador

Uma armadilha real. Em `listscreen.js:41` o `idx` do `.map` vira `data-idx`, e é ele que o
arrastar usa em `moveItem(l.musicas, from, to)`. **Filtrar o array quebraria a reordenação
em silêncio.**

Então o `.map` continua sobre `l.musicas` cru e `data-idx` continua sendo o índice real.
Muda só o que é visível:

- um contador próprio para o `.pos-num`, para numerar 1..n sem buraco;
- o total do cabeçalho e do `aria-label`, contando só o que `songById` resolve;
- `canDrag`, pelo mesmo total visível.

Os testes de `moveItem` (`listdrag`, `listorder`) são puros e não se mexem.

### `js/i18n/pt.js` e `js/i18n/en.js`

Chaves novas nas **duas** tabelas — o teste de paridade cobra:

| chave | PT | EN |
|---|---|---|
| `settings.storage.heading` | Armazenamento | Storage |
| `settings.export.heading` | Exportar biblioteca | Export library |
| `settings.export.sub` | Gera um .somaplay para guardar ou levar para outro aparelho. | Creates a .somaplay file to keep or move to another device. |
| `settings.export.action` | Exportar {count} {song} | Export {count} {song} |
| `settings.export.nothing` | Nenhuma fonte marcada | No source selected |
| `settings.export.fileMulti` | fontes | sources |
| `settings.import.heading` | Importar | Import |
| `settings.import.merge` | Adicionar / atualizar | Add / update |
| `settings.import.mergeSub` | Junta o arquivo à sua biblioteca. Nada do que você já tem é apagado. | Merges the file into your library. Nothing you already have is deleted. |
| `settings.import.replace` | Substituir tudo | Replace everything |
| `settings.import.replaceSub` | Apaga a biblioteca deste aparelho e põe a do arquivo no lugar. | Wipes this device's library and puts the file's in its place. |

**Reaproveitadas, não duplicadas:** `home.fonte.all` ("Todas as fontes") e
`home.fonte.none` ("Sem fonte") já existem com exatamente esse texto. O rótulo do balde
sem fonte **precisa** ser o mesmo nos dois lugares; duplicar seria criar duas verdades. Se
um dia divergirem, é uma linha para separar.

**Aposentadas das duas tabelas:** `settings.backup.heading`, `settings.backup.export`,
`settings.backup.import`, `settings.backup.merge` — os quatro rótulos do bloco antigo, sem
outro uso no app.

### `css/app.css`

Uma linha: `.btn-ghost.danger{color:var(--red)}`. O resto é `.check-row`, `.checkbox`,
`.btn-primary`, `.btn-ghost` e `.storage-bar`, todos existentes.

### `sw.js`

`VERSION` sobe de `somaplay-v28` para `somaplay-v29`. O Service Worker é cache-first: sem
isso, quem já instalou continua rodando o JS antigo. O `SHELL` **não muda** — nenhum
módulo novo.

## O que não muda

- O formato do `.somaplay`: magic, header, `version: 1`, blobs concatenados. **Nenhuma
  migração.**
- `importLibrary` e `mergePlan`, em qualquer dos dois modos.
- O campo `song.fonte`, seu formulário e seus chips de atalho.
- A lente de fonte da home (`S.fonteFilter`), que é independente da seleção de export.
- Os diálogos de confirmação de importação.

## Fora de escopo

- Seletor por artista, por lista ou por música nesta tela — ver "Próximos passos".
- Um campo `fontes: [...]` no manifest, para o arquivo se descrever: não tem consumidor
  hoje, o import não precisa e a mensagem de conclusão já diz "+41 novas". Ficaria código
  órfão.
- Persistir a seleção de export entre sessões.
- Mostrar o tamanho estimado do arquivo antes de exportar: exigiria ler todos os blobs, e
  a contagem de músicas já orienta a decisão.
- Apagar em lote — ver "Próximos passos".
- Tela de gerenciar/renomear fontes.

## Próximos passos

Registrados aqui para não se perderem. Cada um é spec próprio.

1. **"Exportar esta lista"** no menu `⋯` que a tela da lista já tem. Uma linha:
   `{ songIds: new Set(l.musicas), listIds: new Set([l.id]) }` — e o `listIds` garante que os outros
   repertórios do usuário não viajem junto para o amigo. É o principal caso do "efeito
   comunidade", e serve melhor que qualquer aba em Configurações.
2. **"Exportar este artista"** — mesma ideia, mas a tela do artista hoje não tem menu
   nenhum, só o botão de voltar. Precisa do `⋯` antes.
3. **Apagar em lote por fonte.** É isto, e não exportar, que encolhe o tablet — exportar
   copia, não apaga nada. Destrutivo, e por isso merece spec, confirmação e verificação
   próprios.
4. **Nunca: seletor de músicas avulsas.** Escolher música por música já existe no app e se
   chama Lista. Cria "Para o Léo", joga as músicas dentro, exporta a lista — e o amigo
   recebe o repertório já montado.

## Verificação

**Automática** (`cd app && node --test`).

Em `test/export.test.js`, sobre `recorteParaExport`:

- seleção `{ songIds: null, listIds: null }` → devolve o estado inteiro, **idêntico**. É
  esta asserção que garante que o backup completo não regrediu;
- só as músicas cujo id está no conjunto;
- artista sem música no recorte fica de fora; artista com pelo menos uma entra;
- `listIds: null` → todas as listas, intactas, com os ids órfãos preservados;
- `listIds: new Set(['x'])` → só a lista x;
- conjunto vazio → recorte vazio, sem quebrar (a UI não deixa chegar aqui, mas a função
  não pode explodir).

Em `test/fontes.test.js`, sobre `songIdsDasFontes`:

- grafia divergente casa ("songbook" vs "Songbook ");
- `SEM_FONTE` pega só as músicas sem fonte;
- fonte marcada que não existe mais na biblioteca não contribui e não quebra;
- array vazio → conjunto vazio.

A paridade PT/EN é coberta por `test/i18n.test.js`, que já existe, e o `SHELL` por
`test/shell.test.js`.

**Manual, no navegador** (`cd app && python3 -m http.server 8137`) — o que o teste não
alcança:

- Tudo marcado: o arquivo tem o mesmo tamanho e o mesmo nome de hoje.
- Desmarcar CifraClub: a contagem do botão cai, e o arquivo **encolhe de verdade**.
- Importar esse arquivo em merge num perfil limpo: só as músicas daquela fonte, só os
  artistas certos, e as listas aparecem com as músicas que existem.
- Importar depois a outra fonte no mesmo perfil: **a lista se completa sozinha**.
- Numa lista com id órfão: o cabeçalho conta só o que aparece, a numeração vai 1..n sem
  buraco, e **arrastar continua reordenando certo**.
- Nenhuma fonte marcada: o botão fica desabilitado.
- Biblioteca com uma fonte só: a lista de caixinhas não aparece.
- Trocar PT/EN com uma fonte desmarcada: "Todas as fontes" traduz, "Songbook" não.
- No tablet: as caixinhas dão para acertar com o dedo, e o bloco Importar deixa claro qual
  botão é o de todo dia.
