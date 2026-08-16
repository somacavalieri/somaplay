# Soma_play — Transposição de tom — design

**Data:** 2026-08-16 · **Estado:** especificado
**Origem:** pedido do usuário — "para uma maior parte dos violeiros que eu conversei, o
recurso de subir um tom ou descer um tom na música é muito relevante. (…) Eu quero, por
exemplo, entrar numa música no tom C e poder subir ela para o tom de cima ou o tom de baixo.
Não tem problema se tiver restrições e isso não funcionar para todas as músicas."

Com uma referência anexada: o popover de tom do CifraClub, apresentado como **"um formato
muito bem aceito entre os músicos"**. Ele dita o gesto e o vocabulário desta feature, e
resolve sozinho várias perguntas que este spec, sem ele, teria que abrir.

## O problema

A cifra chega no tom em que foi escrita. O violeiro canta no tom da voz dele. Hoje as duas
coisas não se encontram: o app mostra `Tom: C#m` numa pílula decorativa
(`render/play.js:66`) e não há nada a fazer com essa informação.

O recurso é conhecido e o formato é conhecido — o que este spec resolve não é "como
transpor um acorde", é o que a transposição encosta no caminho:

**O alinhamento.** A cifra em texto alinha acorde sobre sílaba **por coluna de caractere**.
`C` tem 1 caractere, `C#` tem 2. Reescrever o acorde no lugar empurra a linha inteira e
desfaz o encontro entre acorde e sílaba — o mesmo motivo pelo qual o CLAUDE.md proíbe
renotar a cifra do usuário.

**A permanência.** Um tom escolhido é estado. Estado no soma_play tem consequência: campo
novo no registro entra em `CAMPOS` (`partes.js`), viaja — ou não — no `.somaplay`, e passa a
ser mais uma coisa que o merge precisa saber conciliar.

**O que não acompanha.** Áudio não muda de tom. Tablatura é casa absoluta. Imagem é pixel.
Digitação customizada é um conjunto de casas, não um nome.

## Decisão

### O gesto vem da referência

A `.tag-tom` deixa de ser decoração e vira o botão. O popover ancora nela e reproduz o
formato do CifraClub, que o usuário declarou como o de entendimento estabelecido:

```
  Tom: C#m
  ┌───────────────┬───────────────┐
  │    −½ tom     │    +½ tom     │
  └───────────────┴───────────────┘
    Am   Bbm   Bm   Cm  [C#m]  Dm      ← [atual]: preenchido
    Ebm  (Em)  Fm   F#m  Gm    G#m     ← (original): contornado
  ┌───────────────────────────────┐
  │          ↺ Restaurar          │
  └───────────────────────────────┘
```

Doze tons em duas fileiras de seis, **em ordem alfabética** (não cromática), como na
referência. Dois estados visuais distintos, porque são duas perguntas diferentes: *onde eu
estou* e *de onde eu vim*.

O passo é **meio tom**, e o rótulo diz "½ tom" em vez de "tom". Isso importa: para o
violeiro, "subir um tom" é dois semitons, e um botão rotulado "tom" que anda um semitom
mentiria em uma palavra. A referência já escreve `-1/2 tom` / `+1/2 tom`; adotamos.

A grade herda o **modo** do tom original — `C#m` mostra doze menores, `C` mostra doze
maiores. O modo é lido do próprio campo: fundamental `[A-G][#b]?` seguida de `m` que não
seja `maj`. Um `tom` que não comece por fundamental válida ("E com capuz na 2ª") é tratado
como tom ausente, e cai na regra do palpite abaixo.

### A transposição é efêmera; guardar é duplicar

`S.transpose` guarda um inteiro em semitons. Zera ao trocar de música, junto com o cache de
`media`. **Nenhum campo novo entra no registro da música** — e portanto `CAMPOS` em
`partes.js` não muda, o `.somaplay` não muda, o merge não muda.

Quem quer guardar um tom **duplica a música**: `Wave` em Bb vira uma música nova chamada
`Wave (Bb)`, com a cifra já transposta gravada. A cópia é uma música comum do acervo —
aparece nas telas, entra em listas, exporta e importa sem saber que nasceu de uma
transposição.

Foi descartado **persistir o offset na música**. Custa um campo, uma entrada em `CAMPOS` e a
decisão de se ele viaja: em `cifra` chega no tom de quem mandou, em `pessoal` chega no
original — e as duas respostas estão certas dependendo de quem compartilha com quem. A
duplicação dissolve a pergunta em vez de responder mal: o que se compartilha é uma música,
e ela está no tom em que está.

Foi descartado também **não oferecer nada além do efêmero** (o comportamento literal do
CifraClub). O CifraClub é site que se visita; o soma_play é a estante de partitura que sobe
no palco. Re-transpor a cada ensaio é trabalho repetido em cima de uma decisão que já foi
tomada uma vez.

### Duplicar é duplicar

A cópia é **idêntica ao original** salvo pelo que a duplicação obriga a mudar:

| campo | na cópia |
|---|---|
| `id` | novo |
| `title` | com o tom entre parênteses |
| `cifra.texto` | transposto |
| `tom` | o tom novo |
| `createdAt` | hoje — é uma música nova, e Recentes tem de mostrá-la |
| `blobId` de cada mídia | novo, apontando para bytes próprios |

Todo o resto vem junto sem exceção: áudio, letra, estilo, fonte, favorita, digitações.

Isto é decisão explícita do usuário, e o argumento dele é melhor que a alternativa que este
spec tinha proposto: *"muitas vezes eu vou duplicar porque eu quero testar um outro tom e,
se eu estou levando outro tom, tenho que levar os recursos junto."* Uma cópia mutilada não é
uma cópia — é uma terceira coisa que o usuário precisa aprender.

**O áudio vai por bytes próprios, não por referência.** `saveBlob(uid(), await
getBlob(idAntigo))`. A cópia fica com blobIds novos e independência total.

A reescrita dos ids se faz por um mapa antigo→novo montado a partir de
`blobIdsDasMusicas([song])` — e não listando `stems` e `full` à mão. Aquela função é a
definição única de "quais blobs são desta música" (`state.js:289`), e o spec de partes já
registrou por que um segundo eixo de verdade ali é como apagar e exportar passam a
discordar. Duplicar entra na mesma regra.

A alternativa — os dois registros apontando para o mesmo blobId — não custa disco, mas
introduz **propriedade compartilhada** num codebase que assume exclusiva, e duas coisas
existentes quebrariam calado:

| onde | o que quebra |
|---|---|
| `state.js:474` | `deleteSongs` apaga todos os blobIds das vítimas sem checar quem mais usa — apagar uma das duas mata o áudio da outra |
| `backup.js:78` | o laço do export não deduplica — o mesmo blob entraria duas vezes no `.somaplay`, dobrando o arquivo |

As duas correções são pequenas (um filtro contra os sobreviventes, um `new Set()`), mas o
que sobra depois delas é uma invariante nova para todo mundo lembrar. O custo de disco é
limitado na prática: a maior parte do acervo é cifra de songbook sem áudio nenhum. Se um dia
doer, a otimização continua disponível, e as duas correções estão mapeadas aqui.

**O título.** `${title} (${tomNovo})`. Se o título já termina em tom entre parênteses, a
regra **substitui em vez de acumular** — duplicar `Wave (Bb)` para C dá `Wave (C)`, não
`Wave (Bb) (C)`. Sem isso, testar três tons em sequência produz um título que cresce sem
fim.

### O array cromático é fixo

A referência resolveu isto sozinha. Ela mostra `Am, Bbm, Bm, Cm, C#m, Dm, Ebm, Em, Fm, F#m,
Gm, G#m`: bemol no Bb e no Eb, sustenido no C#, F# e G#. Isso não é armadura calculada por
ciclo de quintas — é **um array de doze nomes**, sempre o mesmo:

```
C · C# · D · Eb · E · F · F# · G · G# · A · Bb · B
```

Foi descartado derivar a grafia do tom-alvo. É mais correto na teoria e mais caro em tudo:
uma tabela por tom, comportamento que muda conforme para onde você transpõe, e testes que
precisam enumerar doze destinos. O preço do array fixo é teórico e conhecido: uma música em
F# escreve `Bb` onde a teoria pede `A#`. O CifraClub faz exatamente isso e a referência que
o usuário trouxe é a prova de que o músico lê sem tropeçar.

Na **entrada** as duas grafias valem — a cifra escreve o que quiser, e `chord-notation.js` já
tem o mapa `ENARMONIA` que resolve `Db`→`C#`. Na **saída** só o array.

### O alinhamento: reposição por coluna

`chordLineSegs` (`chords.js`) já parte a linha de acordes em segmentos de acorde e de espaço
preservando byte a byte — foi escrita para o `white-space:pre` não desalinhar nada.
`transporLinha` transpõe só os segmentos de acorde e **repõe cada um na coluna original**,
empurrando para a direita apenas quando o vizinho anterior cresceu a ponto de encostar. A
folga mínima entre dois acordes é **um espaço** — sem ela, `C` e `G` em colunas vizinhas
virariam `C#G#` e deixariam de ser dois acordes, inclusive para o parser. Encolheu, devolve
o espaço.

É o mesmo algoritmo de colisão que `layoutChordRow` já usa para as miniaturas, em colunas de
caractere em vez de pixels. E é o que uma pessoa faria reescrevendo a cifra à mão: cada
acorde volta para cima da sua sílaba, e quando dois não cabem mais, o segundo anda.

Foi descartado **normalizar a largura** (`C ` com espaço à direita para todo acorde curto).
Mantém a coluna sem esforço, mas reescreve o espaçamento da cifra inteira, inclusive nas
linhas onde nada mudou — e o usuário veria a própria cifra respirar diferente por causa de
um `C#` a três sistemas de distância.

**Esta é uma exceção deliberada à regra "nunca renotar a cifra do usuário"** do CLAUDE.md.
A regra nasceu porque renotar (`A7M`→`Amaj7`) não entrega nada ao usuário e destrói
alinhamento. Transpor entrega, e a reposição por coluna é o que torna seguro. A exceção
entra no CLAUDE.md junto com a implementação — senão daqui a seis meses ela parece violação.

### O tom original, e o palpite

`tom` é campo de texto livre e opcional (`render/addedit.js:160`). Boa parte do acervo está
sem ele, e sem ele não há pílula para tocar nem como rotular a grade.

A regra: **sem `tom`, o app deduz do último acorde da cifra e assume o palpite na
interface** — a pílula mostra `Tom: G ?`. Preencher o campo na tela de edição tira a marca.

Consequência visível: **na cifra em texto a pílula passa a existir sempre**. Hoje ela só
aparece com o campo preenchido (`render/play.js:65`), e uma feature cujo botão some na
maioria do acervo não é uma feature. Os quatro estados:

| situação | pílula | grade de 12 |
|---|---|---|
| `tom` preenchido | `Tom: C#m` | sim |
| `tom` vazio, palpite possível | `Tom: G ?` | sim |
| `tom` vazio, sem acorde reconhecido | `Tom: —` | não |
| transposto, sem tom nem palpite | `Tom: +1` | não |

`deduzTom` reduz o último acorde a fundamental mais modo e descarta o resto: `G7` → `G`,
`Am7` → `Am`, `F#m7(b5)` → `F#m`. É palpite de tom, não catalogação de acorde.

Cifra popular quase sempre termina no tom, então o palpite acerta na maioria. Ele erra na
relativa menor — `Em` e `G` têm os mesmos acordes — e errar significa a grade oferecer doze
maiores para uma música menor. A transposição em si continua certa nos dois casos: só o
rótulo e o modo da grade dependem do palpite. A marca de chute é o que separa o que o app
sabe do que ele supôs, e é barata: um caractere e uma condição.

Foi descartado **exigir o campo preenchido** — a feature nasceria invisível na maior parte
do acervo. E foi descartado **deduzir calado**: o app afirmaria como fato uma coisa que
adivinhou, contra a mesma disciplina que os últimos commits vêm aplicando ao
compartilhamento ("tell the truth after a cancel", "stop under-reporting").

Os botões de ±½ tom **funcionam sem tom nenhum**: deslocar todos os acordes não exige saber
de onde se parte. Se nem o palpite for possível (cifra sem nenhum acorde reconhecido), a
pílula mostra só o deslocamento acumulado — `Tom: +1` — e a grade não aparece.

### Onde a cifra não acompanha

Um mecanismo de aviso, dois gatilhos. Enquanto a transposição for ≠ 0, uma linha discreta
aparece junto ao mixer/transporte:

| gatilho | aviso |
|---|---|
| música tem `stems` ou `full` | *"áudio no tom original"* |
| cifra tem bloco de tablatura | *"tablatura no tom original"* |

**O áudio não é travado.** Foi considerado desabilitar os botões de tom com o transporte
tocando; tira o controle da mão do músico exatamente no ensaio, para evitar um problema que
ele percebe no primeiro compasso. O app avisa e sai da frente.

**A tablatura não é transposta**, mas a linha de acordes que encabeça o bloco é — senão a
cifra ficaria meio transposta, que é pior que qualquer das duas pontas. Deslocar os números
de casa seria mecanicamente possível e musicalmente falso: você refingeraria a passagem
inteira, e a corda solta não tem para onde descer.

## Componentes

### `js/transpose.js` — o motor (novo)

Puro, sem estado e sem DOM, no espírito de `chord-notation.js`.

| export | contrato |
|---|---|
| `transporAcorde(nome, semitons)` | desloca fundamental e baixo; qualidade, extensões e parênteses viajam intactos |
| `transporLinha(linha, semitons)` | linha de acordes transposta com as colunas repostas |
| `tomDeSemitons(tom, semitons)` | rótulo do tom resultante, preservando o modo (`C#m` +2 → `Ebm`) |
| `deduzTom(parsed)` | palpite pelo último acorde, ou `null` |
| `tituloNoTom(title, tom)` | regra do parêntese, com substituição |

A barra tem dois sentidos na notação do CifraClub: baixo (`D/F#`) e extensão (`Em7/5-`,
`A7/13`). `transporAcorde` reusa a regex `NOTA` de `chord-notation.js` para separá-los, em
vez de reimplementar a distinção e errar diferente da que já existe.

### `js/render/tompop.js` — o popover (novo)

Segue o padrão de `chordpop.js`: uma função de HTML e uma de posicionamento. `play.js` já
tem 634 linhas, e o popover é uma peça com fronteira clara — vive melhor no arquivo dele.
O posicionamento e o fechamento por scroll reusam o que `popPosition` já resolve.

### `js/render/play.js`

`songHeaderHTML` transforma a pílula em botão (`data-a="openTomPop"`), com a marca de
palpite quando aplicável. `cifraTextHTML` aplica a transposição **depois** do
`parsedCifra` — que continua cacheado por música — em vez de invalidar o cache: parseia uma
vez, transpõe a cada render. `chordsGridHTML` recebe os nomes já transpostos, e o aviso
entra junto ao mixer.

Na cifra em imagem, a pílula continua sendo o `<span>` de hoje.

### `js/state.js`

`S.transpose` (inteiro, zerado na troca de música) e `duplicarMusicaNoTom(song, semitons)` —
que copia o registro, gera ids novos para os blobs, grava a música e devolve o id novo para
a tela abrir.

### `js/main.js`

Ações: `openTomPop`, `closeTomPop`, `transposeBy` (±1), `setTom` (grade), `resetTom`,
`duplicateInKey`.

### `js/i18n/pt.js` e `js/i18n/en.js`

Chaves novas nas **duas** tabelas — `i18n.test.js` cobra a paridade. Namespace `play.tom.*`.
Nada de `data-*` traduzido: a grade emite `data-id="Bb"`, que é dado, não rótulo.

### Versão

MINOR: `0.12.1` → `0.13.0`, em `js/version.js` e na linha 2 de `sw.js`
(`somaplay-0.13.0`), mantidos em sincronia por `version.test.js`. Os dois módulos novos
entram no `SHELL` — `shell.test.js` cobra, e sem isso o app quebra offline.

## O que não muda

O formato `.somaplay`, `partes.js`, `CAMPOS`, o merge, o export e o import. A transposição
não cria campo no registro da música, e a música duplicada é uma música comum. Esta é a
consequência mais valiosa da decisão de tornar a transposição efêmera, e vale registrar
explicitamente: a feature inteira não toca no caminho de compartilhamento.

`chord-notation.js` também não muda — é lido, não editado. A notação BR/intl continua sendo
preferência de exibição do que o app gera, e continua sem tocar na cifra do usuário; a
transposição é outra coisa, com a própria justificativa.

## Fora de escopo

**Cifra em imagem.** Pixel não transpõe. Foi considerado transpor só a grade "Acordes desta
música" (que é lista digitada à mão, em `cifra.acordes`), mas uma grade dizendo `Bm Em F#7`
ao lado de uma imagem escrita `Am Dm E7` é pior que ausência — e a duplicação produziria uma
música quebrada: imagem certa, acordes errados. Fica para quando existir OCR de cifra, se
existir.

**Capotraste.** É a outra metade natural do assunto — "toco em C com capo 2" — e é um
recurso diferente: não reescreve nada, só informa. Merece o próprio spec.

**Áudio transposto.** Pitch shift em tempo real no Web Audio é projeto de outra ordem, e
degrada o som de um jeito que ninguém quer no palco.

**Digitações customizadas na cópia.** `cifra.digitacoes` viaja intacto para a música nova,
mas as chaves são os nomes antigos: a busca falha e cai no catálogo. Nenhum diagrama errado
— só entradas mortas. Deslocar as formas funcionaria em pestana e falharia calado em acorde
com corda solta, que é justamente onde o violeiro repara.

**Acordes fixados persistentes.** `S.chordFavs` não é gravado em lugar nenhum hoje: some ao
recarregar o app. Durante a transposição, um `Am` fixado simplesmente não aparece na barra.
É bug próprio, anterior a esta feature, e não se conserta aqui.

## Verificação

**`node --test` (lógica pura, `app/test/transpose.test.js`):**

- fundamental e baixo deslocados; qualidade e extensões preservadas
- extensão-após-barra (`Em7/5-`, `A7/13`) não confundida com baixo
- entrada em bemol e em sustenido; saída sempre no array fixo
- volta cromática (11 → 0) e `±12` como identidade
- alinhamento preservado quando há folga; empurrão de um espaço quando não há; encolhimento
  devolvendo o espaço
- linha transposta continua aprovada por `isChordLine` e por `chordLineSegs`
- `deduzTom` pelo último acorde; `null` para cifra sem acorde
- `tituloNoTom`: acrescenta, e substitui quando já há tom entre parênteses

**Não-propriedade a registrar no módulo:** transpor `+n` e depois `−n` **não** devolve a
string original. A grafia canoniza (`A#`→`Bb`) e o espaçamento pode ter sido empurrado. O
que vale é a estabilidade da forma canônica — exatamente a mesma ressalva que
`chord-notation.js` já carrega no topo.

**`node --check`** nos módulos novos.

**Manual no navegador**, que é a camada que conta: cifra com miniaturas ligadas e desligadas,
cifra com tablatura, cifra em imagem (pílula inerte), música com stems (aviso), popover no
tablet em retrato e paisagem, duplicação de música com áudio e conferência do disco.

## Próximos passos

Plano de implementação pela skill `writing-plans`, com o motor puro e seus testes antes de
qualquer pixel — é ele que carrega o risco, e é o único pedaço testável sem navegador.
