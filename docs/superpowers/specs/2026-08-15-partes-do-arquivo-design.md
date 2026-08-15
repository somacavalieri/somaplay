# Soma_play — Partes do arquivo: compartilhar cifra e áudio separados — design

**Data:** 2026-08-15 · **Estado:** especificado
**Origem:** pedido do usuário — "quando eu envio um arquivo Somaplay, ele vai com playlist,
músicas favoritas. (…) eu queria poder enviar o arquivo sem enviar as listas. E, ao mesmo
tempo, também eu queria poder enviar uma lista separada. Outro ponto são os áudios. (…) Se
eu coloco áudio em 50 músicas, o arquivo fica impraticável de enviar por WhatsApp. (…)
Ficaria como se fosse uma extensão. Me ajude a repensar, pensando que eu quero tornar
flexível essa forma para facilitar o compartilhamento de arquivos entre músicos entusiastas
que estão utilizando a plataforma e que querem compartilhar seus arquivos, sejam com alunos
ou com amigos."

Direção de produto declarada na mesma conversa, e que pesa nas decisões abaixo: **o
soma_play deve caminhar para ser um gerenciador completo de arquivos/cifras.** `partes`
não é um remendo para o WhatsApp — é o vocabulário de "o que este arquivo contém".

## O problema

Um `.somaplay` é hoje tudo-ou-nada em três eixos que o usuário precisa separar.

**Listas.** Vão sempre, todas, inteiras. `recorteParaExport` recebe `listIds: null` em todo
caminho existente (`backup.js:27`), e `exportLibrary` despeja `S.lists` no manifest
(`backup.js:82`). Não existe hoje nenhuma forma de exportar sem elas.

**Favoritas.** Não existe uma "lista de favoritas": `favorita` é um **campo da música**
(`db.js:2`, `state.js:463`), e `favList()` só computa a lista virtual na hora. A flag anda
grudada em cada registro. Pior: o import em merge faz `DB.putSong(s)`, que **substitui o
registro inteiro** — mandar uma atualização de repertório para quem já tem aquelas músicas
**apaga as favoritas da pessoa**, junto com o `tom` que ela ajustou, a mixagem dela e as
digitações customizadas dela. Como ids só colidem quando a música veio de você antes, isso
acontece exatamente no cenário de intercâmbio, não num caso raro.

**Áudio e imagem** saem pelo mesmo cano: `blobIdsDasMusicas` (`state.js:281`) junta
`cifra.imagens`, `stems` e `full` numa lista só. É daí que vem o peso — e um repertório com
áudio em 50 músicas não passa por WhatsApp.

Os três são a mesma pergunta: **este arquivo fala sobre o quê?**

## Decisão

### `partes` — o arquivo declara o próprio escopo

O manifest ganha um campo `partes`. O merge lê a declaração em vez de adivinhar por presença
de campo.

| arquivo | `partes` |
|---|---|
| backup (Configurações, tudo marcado) | `['cifra','audio','pessoal']` |
| compartilhar só as cifras | `['cifra']` |
| compartilhar cifras + áudio | `['cifra','audio']` |
| pacote de áudio | `['audio']` |

**A folha do `⋯` nunca declara `pessoal`.** Compartilhar é dar conteúdo a alguém, não
despejar o gosto e os ajustes de quem mandou. Em Configurações, `pessoal` é uma caixinha
marcada por padrão — porque lá o trabalho normal é backup.

**`partes` ausente significa arquivo completo.** É isso que faz `version` continuar `1` e
todo `.somaplay` já existente importar exatamente como importa hoje — sem migração e sem
caso especial no código.

A alternativa descartada foi **ausência literal**: omitir os campos e deixar o merge ler
`undefined` como "não falo disso" e `[]` como "não tem". Custa zero campo novo, mas deixa a
regra invisível — o dia em que qualquer código serializar `stems: []` sem querer, o arquivo
**apaga o áudio no aparelho de quem recebeu**, em silêncio, e nenhum teste óbvio pega. Como
todo o desenho depende de "ausência não é deleção", essa regra precisa estar **escrita no
arquivo**, não deduzida dele.

Também foi descartado **dois formatos** (`.somaplay` + `.somaplay-audio`): impossível
confundir, mas são dois caminhos de código, dois botões, e o aluno precisa entender a
diferença antes de conseguir usar. Ele só quer tocar no arquivo que chegou.

### A identidade sempre viaja

Fora das partes existe uma quarta coisa. `id`, `artistId` e `title` são como o arquivo diz
*"esta música"* — sem eles um registro não quer dizer nada. É por isso que um pacote só de
áudio consegue criar uma música nomeada em vez de bytes órfãos.

| | campos |
|---|---|
| *(identidade — sempre)* | `id`, `artistId`, `title`, e os `artists` correspondentes |
| **`cifra`** | `tom`, `cifra{}` (tipo, imagens, texto, acordes, digitações), `letra`, `estilo`, `fonte`, e o `chordbook` |
| **`audio`** | `stems[]`, `full[]` — **com a mixagem dentro** |
| **`pessoal`** | `favorita`, `createdAt`, e `settings` |

Quatro escolhas dessa tabela não são óbvias:

**A mixagem anda com o áudio, não com o aparelho.** Volume e mute de cada stem moram
*dentro* do array `stems` — `persistCurrentStems` (`state.js:553`) salva a música inteira
quando um fader se mexe. Não são preferência solta: são o ponto de partida que quem mandou
montou. "Violão em 60%, bateria em 100%" viaja junto com os bytes.

**`createdAt` é pessoal, não conteúdo.** É "quando *eu* adicionei". Se viajasse, um
repertório entraria no tablet do aluno já envelhecido e a ordenação por Recentes mentiria
para ele. Ficando de fora, uma música compartilhada chega com a data de hoje — que é a
verdade dele. Num backup completo a data original volta intacta, porque backup declara
`pessoal`.

**`favorita` não pode ser "nunca viaja".** Um backup precisa restaurá-la, senão restaurar o
acervo perde dado. Não é propriedade do campo; é propriedade **do arquivo** — a mesma coisa
que o áudio. É essa observação que reduziu três regras a um mecanismo só.

**`chordbook` anda com `cifra`.** Sem ele uma cifra chega sem a digitação customizada que o
autor desenhou. Um pacote só de áudio não leva dicionário nenhum.

### O merge passa a ser campo-a-campo

```
Para cada música do arquivo:
  não existe no aparelho  → cria com o que veio; o que o arquivo não fala fica no default
  já existe               → sobrescreve SÓ os campos das partes declaradas
```

Uma regra só, e é ela que faz os quatro casos caírem no mesmo motor. O ganho concreto:
**importar leve→pesado e pesado→leve chega no mesmo lugar.** A ordem deixa de existir como
conceito, e some a instrução na tela que qualquer outra abordagem exigiria.

### O que o receptor vê quando falta áudio

Nada. A música chega como **T1 puro** — o app do aluno não sabe que existe acompanhamento,
porque o arquivo leve simplesmente não leva `stems`. Sem play quebrado, sem promessa
pendurada, sem badge de "importe o pacote".

Foram consideradas e descartadas: *marcar "áudio disponível"* (cria expectativa que o app
não pode cumprir sozinho, e polui a biblioteca de quem nunca vai receber o pacote) e *deixar
o registro intacto e quebrar ao tocar* (o pior caso possível num tablet em cima da estante).

Consequência direta: como o leve não leva `stems`, é o **pacote de áudio** que carrega essa
informação. Ele não é só bytes — ele fala das músicas.

### O pacote de áudio sozinho cria a música

Importar um pacote sem ter o repertório faz aparecerem as músicas com áudio e **cifra
vazia**. Quando o repertório chegar, elas se completam.

É a escolha simétrica: os dois arquivos são vistas parciais das mesmas músicas, e o merge as
une em qualquer ordem, sem regra especial. A alternativa — *avisar e descartar as que faltam*
— nunca cria música capenga, mas perde os bytes de quem chegou fora de ordem e obriga a
reimportar o pacote depois.

### Onde a escolha mora

A escolha leve/pesado é propriedade de **produzir um export**, e portanto aparece nos dois
lugares onde um arquivo nasce: a folha contextual e o bloco de Configurações.

Isso corrige o rumo de uma resposta anterior do usuário, que localizava o compartilhar só no
`⋯`. Relendo o pedido: **hoje o único export que existe é o de Configurações** — é ele que
está sendo usado quando "envio um arquivo Somaplay e ele vai com playlist". Deixar
Configurações pesado-só manteria a queixa original de pé.

Não são dois portais: é o mesmo mecanismo nos dois pontos de origem.

## Componentes

### `js/partes.js` — o vocabulário

Um módulo novo, e não um pedaço de `backup.js` como esta spec dizia antes. O motivo é que
os **dois lados** da troca leem o mesmo mapa de campos: a poda, na saída, e a fusão, na
entrada. Uma segunda cópia desse mapa é exatamente como as duas passariam a discordar sobre
o que é `cifra`.

```js
export const PARTES_TODAS = ['cifra', 'audio', 'pessoal'];
export const IDENTIDADE = ['id', 'artistId', 'title'];
export const CAMPOS = { cifra: [...], audio: [...], pessoal: [...] };

export function normalizaPartes(partes)                     // → lista de partes, sempre
export function podaPorPartes(songs, partes)                // saída: só os campos das partes
export function fundeMusica(atual, doArquivo, partes, agora) // entrada: campo a campo
```

Puras, sem DOM e sem DB, como `recorteParaExport` ao lado.

`normalizaPartes` é a guarda única: **o que não é uma lista de partes significa arquivo
completo** — que é o que um `.somaplay` anterior a este formato quer dizer, e o que um
arquivo corrompido deve querer dizer em vez de derrubar o import. Ela mora aqui, e não em
cada leitor, pelo mesmo argumento que trouxe `CAMPOS`: quatro guardas ad-hoc é quatro
chances de uma divergir. Os leitores são `podaPorPartes`, `fundeMusica`,
`avisosDeSubstituir`, `importLibrary` e `mergePlan`.

As duas funções compartilham um **atalho de identidade**: quando as partes declaradas cobrem
`PARTES_TODAS`, os registros passam **inteiros**, sem copiar campo a campo. Na saída é a
asserção que prova que o backup não regrediu; na entrada é o que faz restaurar um backup
devolver o registro **inteiro** — inclusive um campo que este módulo nunca ouviu falar. Sem
o atalho, no modo substituir (`atual` é sempre null, o `DB.wipe()` já rodou) um campo fora de
`IDENTIDADE ∪ CAMPOS` sobreviveria ao arquivo e sumiria na volta, em silêncio.

`fundeMusica` recebe `agora` — o relógio do import — em vez de chamar `Date.now()`, para
continuar pura. Uma música **nova** que chega **sem** `createdAt` (todo compartilhamento,
porque a data é `pessoal`) nasce com essa data. Sem isso ela entraria sem data nenhuma, e
Recentes ordena por `(b.createdAt || 0)`: o repertório inteiro iria para o **fim** da lista,
na época zero — a mesma mentira que pôr `createdAt` em `pessoal` queria evitar, ao contrário.
Um relógio só por import, e não um por música, para o lote chegar junto.

### `js/backup.js` — o export

`exportLibrary` ganha `partes` nas opções e passa a ordenar assim:

```js
const corte   = recorteParaExport({ artists, songs, lists }, { songIds, listIds });
const podadas = podaPorPartes(corte.songs, partes);
const blobIds = blobIdsDasMusicas(podadas);        // intacta
```

**Podar primeiro, coletar depois.** `blobIdsDasMusicas` **não** ganha um parâmetro `partes`:
o comentário em `state.js:279` diz que ela existe justamente para apagar e exportar nunca
discordarem sobre o que é mídia de uma música, e um segundo eixo de verdade ali é como essa
garantia se perde. Um pacote de áudio tem registros sem `cifra.imagens`, então a função
existente naturalmente devolve só os stems.

`chordbook` e `settings` entram no manifest condicionados à parte correspondente.

Nome do arquivo — `nomeDoExport` ganha o recorte e um qualificador. A regra é uma só, e vale
igual nas duas superfícies: **`cifra` e `audio` juntas não qualificam nada; sozinhas viram
sufixo.** `pessoal` e as listas não entram no nome — quatro sufixos combinados dariam
`somaplay-show-sabado-cifras-sem-listas-...`, que não ajuda ninguém a escolher um arquivo.

| recorte + partes | nome |
|---|---|
| tudo, todas as partes | `somaplay-backup-2026-08-15.somaplay` *(igual a hoje)* |
| uma fonte, todas as partes | `somaplay-songbook-2026-08-15.somaplay` *(igual a hoje)* |
| uma fonte, sem áudio | `somaplay-songbook-cifras-2026-08-15.somaplay` |
| lista, cifras + áudio | `somaplay-show-sabado-2026-08-15.somaplay` |
| lista, só cifras | `somaplay-show-sabado-cifras-2026-08-15.somaplay` |
| lista, só áudio | `somaplay-show-sabado-audio-2026-08-15.somaplay` |

As palavras "cifras"/"áudio" chegam de fora já traduzidas, como `palavraFontes` já faz: nome
de arquivo não é dado persistido, então a regra do `data-*` do CLAUDE.md não se aplica. A
função continua pura.

### `js/merge.js` — o merge campo-a-campo

`mergePlan(existing, incoming, agora)` passa a ler `incoming.partes` (ausente **ou
corrompido** = todas, por `normalizaPartes`) e a devolver, para cada música, o registro
**fundido** com o que já existe, e não o registro do arquivo. A fusão em si é `fundeMusica`,
em `partes.js`: o merge não conhece o mapa de campos, só o aplica.

Duas garantias que moram aqui, e só aqui:

- **Campo de parte não declarada nunca é tocado.** É o que faz o pacote de áudio sobreviver
  a um arquivo leve importado depois, e as favoritas do aluno sobreviverem a uma atualização
  de repertório.
- **A forma da música é restaurada na fronteira.** Toda música na biblioteca tem um objeto
  `cifra`, porque o formulário sempre cria um; um pacote só de áudio quebraria a invariante,
  e `normalizaCifra` (`db.js:186`) devolve a música intacta quando `cifra` não existe, sem
  criar default. Então uma música nova vinda de pacote de áudio nasce com `cifra` **vazia**,
  nunca ausente. Um lugar só — em vez de auditar todo render atrás de `.cifra.`
  desprotegido. "Cifra vazia" já é um estado válido do app: `newDraft` é defensivo em toda
  leitura (`addedit.js:19-26`), e adicionar uma música deixando a cifra em branco sempre
  funcionou.

O módulo continua puro e sem DOM/DB.

### `js/backup.js` — o import

`importLibrary` no modo merge passa os registros fundidos do plano. O modo substituir
continua fazendo o aparelho virar espelho do arquivo — inclusive quando o arquivo é parcial.

**Uma guarda nova.** "Substituir tudo" com um arquivo que não declara `audio` **apaga todo o
áudio da biblioteca**. É a leitura honesta de "substituir tudo", mas é fácil de fazer sem
querer e é irreversível. O diálogo de confirmação ganha uma linha quando o arquivo é parcial:
*"Este arquivo não tem áudio. Substituir vai apagar o áudio da sua biblioteca."*

`avisosDeSubstituir(manifest, { temListas })` cobre os **quatro** eixos, e não só as partes:
falta `audio`, falta `cifra`, falta `pessoal`, e o arquivo não traz lista alguma enquanto o
aparelho tem pelo menos uma. Os dois últimos foram um acréscimo tardio, e são o mais
importante: `pessoal` e as listas **não qualificam o nome do arquivo** (de propósito — quatro
sufixos empilhados não ajudam ninguém), então um export com as duas caixas desmarcadas sai
com o nome **byte a byte idêntico** ao de um backup completo. Meses depois não há como
distinguir os dois na pasta de Downloads, e substituir com o errado reescreve a biblioteca
sem `favorita`, sem `createdAt`, sem os ajustes e sem lista nenhuma.

O argumento antigo — "perder as favoritas num substituir tudo é o que substituir sempre fez"
— era verdade **até esta feature**: antes dela todo `.somaplay` carregava as favoritas, então
substituir nunca as perdia. É esta feature que fabrica o arquivo que perde.

O aviso das listas só aparece quando há o que perder: num aparelho sem lista nenhuma ele
seria ruído.

### `js/render/` — a folha de compartilhar

Um módulo novo (`js/render/sharesheet.js`), somado ao `SHELL` de `sw.js` — sem isso o app
quebra offline, e `app/test/shell.test.js` cobra.

```
Compartilhar "Show sábado" · 12 músicas

  ○ Só as cifras                        1,8 MB
    Cabe no WhatsApp. O áudio pode ir depois.

  ○ Cifras + áudio                       184 MB
    Tudo de uma vez. Melhor por Drive.

  ○ Só o áudio                           182 MB
    Pra quem já recebeu as cifras.

              [ Compartilhar ]
```

Uma folha em vez de três itens de menu porque é aqui que cabe **o tamanho** — que é
exatamente a decisão sendo tomada.

Os tamanhos são baratos: `getFile().size` no OPFS é metadado, não leitura de bytes. São
~48 handles para uma lista de 12 músicas com 4 stems cada. Resolvem **depois** da folha
abrir, preenchendo os números; se falhar, a folha funciona sem eles e **nunca bloqueia**. É
também por isso que a folha só existe em recorte limitado — numa biblioteca inteira seriam
milhares de handles, e é por isso que Configurações não mostra tamanho.

**Mandar de verdade.** `navigator.share({ files })` existe no Chrome Android: o arquivo vai
direto para o WhatsApp em um toque, em vez de baixar → achar em Downloads → anexar. Guardado
por `navigator.canShare({ files })`; onde não existir, cai no download de sempre. Melhoria
progressiva — o caminho antigo continua inteiro por baixo.

### `js/render/listscreen.js` e `js/render/artist.js`

O `⋯` da lista (`listscreen.js:41`) ganha o item **Compartilhar**, que abre a folha com
`{ songIds: new Set(l.musicas), listIds: new Set([l.id]) }`. O `listIds` é o que garante que
os outros repertórios do usuário não viajem junto.

A tela do artista **não tem menu nenhum** hoje — só o botão de voltar. Ganha o mesmo `⋯`,
por enquanto com um item só, chamando a folha com `{ songIds: …, listIds: new Set() }`: um
artista compartilhado não leva lista alguma.

### `js/render/settings.js`

O bloco Exportar mantém as caixinhas de fonte — *quais músicas* — e ganha um segundo grupo,
*o que de cada música*. As quatro caixas **são** o vocabulário de `partes`, sem tradução:

```
Exportar biblioteca

  [caixinhas de fonte, como hoje]

  O que incluir
  [✓] Cifras                              → 'cifra'
  [✓] Áudio                               → 'audio'
  [✓] Minhas listas                       → listIds
  [✓] Minhas favoritas e ajustes          → 'pessoal'

  [ ↓ Exportar 157 músicas ]
```

Todas marcadas por padrão: em Configurações o trabalho normal é backup, e backup quer tudo.
Desmarcar **Minhas listas** é o "enviar sem as listas" do pedido original (`listIds:
new Set()`); desmarcar **Áudio** é o arquivo de WhatsApp; desmarcar **Minhas favoritas e
ajustes** é dizer "isto vai para outra pessoa".

Cifras e Áudio ambas desmarcadas → o botão fica **desabilitado**, pela mesma regra que já
existe para "nenhuma fonte marcada": exportar um arquivo vazio não é caso de uso, é
acidente.

**Caixas aqui e radio na folha, de propósito.** São perguntas diferentes. A folha é uma
decisão de um toque entre três cenários com nome e tamanho ("cabe no WhatsApp"); Configurações
é o painel de uma operação de acervo, onde os eixos precisam ser independentes. E lá o grupo
de listas **não existe**: compartilhar uma lista leva aquela lista, compartilhar um artista
não leva lista nenhuma. O recorte já respondeu a pergunta.

### `js/state.js`

Estado novo da folha (`S.shareSheet`) e da escolha em Configurações (`S.exportPartes`,
`S.exportListas`). Ambos vivem só na sessão, pela mesma razão que `S.exportFontes`: uma
seleção que sobrevive ao fechar o app vira um backup misteriosamente incompleto no próximo
ensaio.

### `js/i18n/pt.js` e `js/i18n/en.js`

Chaves novas nas **duas** tabelas — `app/test/i18n.test.js` cobra a paridade. Os rótulos da
folha, os três subtítulos, as palavras "cifras"/"áudio" do nome de arquivo, a caixa "Incluir
minhas listas" e a linha nova do diálogo de substituir.

Nenhum valor de `data-*` passa por `t()`.

### Versão

MINOR: **0.11.0 → 0.12.0** — capacidade nova, pela tabela de
`2026-08-14-versionamento-design.md`. Os dois literais (`app/js/version.js` e a linha 2 de
`app/sw.js`) sobem juntos; `app/test/version.test.js` cobra a sincronia. O `SHELL` ganha
`./js/render/sharesheet.js`.

## O que não muda

- O formato do `.somaplay`: magic, header de 10 dígitos, `version: 1`, blobs concatenados na
  ordem do manifest. **Nenhuma migração.**
- Todo arquivo `.somaplay` já existente importa exatamente como importa hoje — `partes`
  ausente significa completo.
- `recorteParaExport`, `blobIdsDasMusicas`, `songIdsDasFontes`, `fonteCasa` e o filtro de
  fonte da home.
- `DB_NAME`, e toda a camada de blobs.
- O `<input type="file">` único e o botão único de importar: continua havendo **um** tipo de
  arquivo e **um** caminho de import.

## Fora de escopo

- **Fundir listas por união.** Você compartilha "Show sábado" com o aluno, ele acrescenta
  duas músicas, você manda a versão atualizada: **as duas dele somem**, porque o import faz
  `DB.putList`, que substitui a lista por id. É o comportamento de hoje, e é o que faz uma
  lista se curar depois de um import parcial. Mudar para união é outra decisão de design,
  com spec própria — e esta feature torna rotina a ação que a expõe.
- **Marcar "áudio disponível" na música.** Decidido contra, na seção do receptor.
- **Compartilhar a partir da pílula de fonte na home.** Fonte é a proveniência do dono do
  acervo; o bloco de Configurações já cobre esse recorte.
- **Tamanho estimado em Configurações.** Milhares de handles numa biblioteca inteira.
- **Persistir `S.exportPartes` / `S.exportListas` entre sessões.**
- **Compartilhar uma música avulsa.** Escolher música por música já existe e se chama Lista.
- **Congelar o formato com garantia de compatibilidade** — isso é o MAJOR `1.0.0`.

## Próximos passos

1. **Fundir listas por união**, se o cenário de aluno-acrescenta-música aparecer na prática.
2. **`⋯` do artista com mais itens** — renomear, apagar em lote. A folha abre a porta.
3. **Receber por link/arquivo compartilhado** (Web Share Target), para o `.somaplay` chegar
   no app direto do WhatsApp em vez de passar por Downloads. É o par natural do
   `navigator.share`, e o passo seguinte na direção de gerenciador de arquivos.

## Verificação

**Automática** (`cd app && node --test`), tudo puro e sem DOM.

Em `test/partes.test.js`, sobre `podaPorPartes` (o arquivo acompanhou o módulo, que saiu de
`backup.js`):

- `PARTES_TODAS` → registros **idênticos** aos de entrada. É esta asserção que garante que o
  backup e a leitura de arquivo antigo não regrediram;
- `['cifra']` → sem `stems`, sem `full`, sem `favorita`, sem `createdAt`; com `id`,
  `artistId`, `title`;
- `['audio']` → sem `cifra`, sem `letra`, sem `estilo`, sem `fonte`; com `stems` **e a
  mixagem dentro**;
- `['pessoal']` → só identidade mais `favorita` e `createdAt`;
- `blobIdsDasMusicas(podaPorPartes(songs, ['audio']))` não devolve nenhum blob de imagem;
- `blobIdsDasMusicas(podaPorPartes(songs, ['cifra']))` não devolve nenhum blob de áudio.

E sobre `nomeDoExport`, que continua puro:

- todas as partes → o nome de hoje, **sem sufixo** (a asserção de não-regressão do nome);
- só `cifra` → sufixo `-cifras`; só `audio` → sufixo `-audio`;
- tirar `pessoal` ou as listas **não** muda o nome.

Em `test/merge.test.js`, sobre `mergePlan` com partes:

- campo de parte **não** declarada fica intacto na música existente;
- `favorita` local sobrevive a um arquivo que declara só `['cifra']`;
- música nova de pacote `['audio']` nasce com `cifra` **vazia**, nunca ausente;
- **a propriedade que sustenta a extensão:** aplicar leve→pacote e pacote→leve chega ao
  **mesmo registro final**. É um teste de ordem, e trava a regressão mais provável desta
  feature;
- manifest **sem** `partes` → comportamento de hoje, campo a campo;
- `partes: []` não explode (a UI não deixa chegar aqui, mas a função não pode quebrar).

A paridade PT/EN é coberta por `test/i18n.test.js`, o `SHELL` por `test/shell.test.js` e a
versão por `test/version.test.js` — os três já existem.

**Manual, no navegador** (`cd app && python3 -m http.server 8137`) — o que o teste não
alcança:

- Backup completo: mesmo tamanho e mesmo nome de hoje.
- Um `.somaplay` antigo (sem `partes`) importa igual, nos dois modos.
- Compartilhar uma lista "só as cifras": o arquivo **encolhe de verdade**, e o tamanho na
  folha bate com o do arquivo baixado.
- Importar esse arquivo num perfil limpo: músicas em T1, sem play quebrado, e a lista
  aparece.
- Importar depois o pacote de áudio: **o T2 acende sozinho**, com a mixagem que foi mandada.
- Ordem invertida num terceiro perfil: pacote primeiro (músicas com cifra vazia), leve
  depois — a cifra preenche e o áudio continua lá.
- Favoritar uma música no perfil do "aluno", reimportar o repertório atualizado: **a favorita
  continua marcada**.
- "Substituir tudo" com um arquivo leve: o aviso novo aparece antes.
- Configurações com **Minhas listas** desmarcada: o arquivo não leva lista nenhuma.
- Configurações com **Minhas favoritas e ajustes** desmarcada: importar num perfil que já tem
  favoritas não encosta nelas.
- Configurações com **Cifras** e **Áudio** ambas desmarcadas: o botão fica desabilitado.
- No tablet Android: `navigator.share` abre a folha do sistema e o arquivo chega no WhatsApp.
- Num navegador sem `navigator.share`: cai no download, sem erro.
- Trocar PT/EN: os rótulos da folha traduzem; nome de fonte, não.
