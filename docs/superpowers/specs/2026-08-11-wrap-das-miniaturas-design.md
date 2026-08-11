# Soma_play — Wrap ciente de diagrama no modo miniatura — design

**Data:** 2026-08-11 · **Estado:** especificado
**Origem:** pendência de 2026-08-10 — *"miniaturas na música vazam da caixa... o conserto
pede um wrap próprio do modo miniatura, medindo a largura de cada diagrama."*

Fecha a única pendência marcada **IMPORTANTE** do app. Destrava a tarefa de mover as 38
formas do songbook para `cifra.digitacoes` das 8 músicas: conferir aquele trabalho é ler a
música com as miniaturas ligadas, e são justamente as músicas do songbook — densas em
acorde — que mais vazam hoje.

## O problema

O reflow (`2026-08-10-reflow-da-cifra-texto-design.md`) corta a linha por **coluna de
caractere**. O modo miniatura desenha a linha de acordes como uma **fileira de diagramas**,
posicionada em **pixel**. São duas réguas diferentes, e o spec do reflow assumiu que não:

> *"Miniaturas inline e popover de acorde: cada pedaço é uma linha de acorde normal, então
> `layoutChordRow`/`chordLineSegs` seguem valendo sem alteração, por pedaço."*

Seguem valendo para **posicionar**. Não valem para **decidir onde cortar**. Um diagrama
ocupa 64–84 px onde o nome do acorde ocupa ~44; pior, `layoutChordRow` resolve colisão
empurrando (`x = max(col × chPx, cursor)`) e o empurrão se propaga. Acordes nas colunas 0,
2, 4 e 6 pedem 72 px de texto e ocupam ~280 px de diagrama. Uma linha estreita em texto
vira uma fileira larguíssima.

Antes do reflow o estrago ficava **escondido** pelo `overflow:hidden`. Hoje a fileira rola
de lado — honesto, e ainda errado: numa estante, ninguém rola a cifra de lado no meio da
música.

### Medido, não estimado

Sobre as 295 linhas acorde+letra das 22 músicas do songbook do Gil já convertidas
(`gil-songbook-vol2-lote1.somaplay`), com `chPx ≈ 12` e o algoritmo deste spec rodando de
verdade:

| caixa | fileiras | vazam hoje | depois | cresc. | **ainda vazam** | emergência |
|---|---|---|---|---|---|---|
| 720 px (desktop) | 583 | 41 | 583 | +0% | **0** | 0 |
| 600 px | 591 | 59 | 615 | +4% | **0** | 3 |
| 480 px | 867 | 93 | 868 | +0% | **0** | 1 |
| 360 px (celular) | 1090 | 142 | 1129 | +4% | **0** | 6 |
| 300 px | 1197 | 180 | 1278 | +7% | **0** | 5 |

**Nas medições, o vazamento acaba em toda largura testada**, e o crescimento vertical fica
entre 0% e 7% — o corte recua para o corte válido anterior, que quase sempre cabe no mesmo
número de pedaços. A saída de emergência dispara pouco, e nas medições **nenhuma vez deixou
um vazamento** — mas ela segue sendo a exceção irredutível do mecanismo: uma palavra da
letra comprida demais, sem corte válido em lugar nenhum, ainda pode deixar a fileira acima
da caixa. Em fuzz adversarial fora deste corpus isso já apareceu: ~0,30% das fileiras acima
de uma caixa de 300 px, pior caso +64 px — um diagrama a mais — sempre pela mesma saída de
emergência.

Sanidade: a 720 px, exatamente **41 linhas mudam de saída** — as mesmas 41 que vazam. O
predicado está sendo consultado, não passando batido.

Duas ressalvas. O `chPx ≈ 12` é aproximação — o app mede no DOM, e em *Banda Um* a conta
deu 3 fileiras onde a pendência anotou 6; a ordem de grandeza bate, o número exato não. E
a largura do diagrama depende das **formas fixadas na música**: a do livro sobe no braço,
ganha o indicador de casa e **+12 px**. Por isso a tarefa dependente — mover 38 formas para
`cifra.digitacoes` — tende a **piorar** o vazamento antes deste conserto, e é mais um motivo
para ele vir primeiro.

## Decisão

**Quebrar mais cedo, não encolher o diagrama.** Diagrama que não dá para ler de pé, a um
metro da estante, não serve para nada — e o tamanho passaria a variar de linha para linha
sem o usuário entender por quê. O custo é a música ficar ~7% mais comprida.

**Acorde e letra continuam cortando na mesma coluna.** É o que mantém o diagrama em cima
da sílaba dele, e é a decisão que o reflow tomou. Nada aqui a revoga.

**`chords.js` não aprende o que é diagrama.** `wrapBlock` recebe um predicado; quem sabe
medir diagrama é o `play.js`, que já tem `layoutChordRow`, `chordDiagWidth` e a medição da
caixa. Mesma divisão do export por fonte: o núcleo puro recebe o critério pronto, o
chamador conhece o domínio.

**Efeito colateral bom, que vale registrar:** cortar mais cedo reduz o empurrão acumulado
do `layoutChordRow`, então o diagrama fica **mais** perto da sílaba, não menos. O conserto
melhora o alinhamento em vez de sacrificá-lo.

## Componentes

### `js/chords.js` — `wrapBlock` ganha um predicado opcional

```js
export function wrapBlock(chords, lyric, cols, cabe)
```

`cabe(trechoDeAcordes) → boolean` pergunta se aquele trecho, montado como fileira, cabe na
caixa. **Omitido, o comportamento é idêntico ao de hoje** — e isso é asserção de teste, não
esperança: é a mesma trava que `recorteParaExport(null)` usa.

Duas mudanças no corpo, e a primeira é a que se esquece:

1. **O atalho do início também consulta `cabe`.** Hoje `if (!(n > 1) || end <= n) return
   [{chords, lyric}]` devolve a linha inteira quando ela cabe em colunas. É exatamente o
   caso da maioria das fileiras que vazam: cabem em 60 colunas e não cabem em 720 px.
   Passa a ser `if (!(n > 1)) return …` e, em seguida,
   `if (end <= n && (!cabe || cabe(c))) return …`.

   **Repare que o atalho testa `c` cru, e não o `serve`/`peca` que o laço usa.** É de
   propósito, e a regra é uma só: **testar o que se devolve**. Este atalho devolve `c`
   com o recuo esquerdo intacto; o laço devolve o pedaço já sem recuo. Testar o pedaço
   sem recuo aqui aprovaria uma fileira mais estreita do que a desenhada — e **50 das 295
   linhas do songbook (17%) têm recuo comum às duas linhas, até 9 colunas**, o que a 12 px
   por coluna são ~108 px invisíveis ao predicado: mais que um diagrama inteiro.

   A alternativa — o atalho passar a devolver o pedaço sem recuo, para casar com o teste —
   foi medida e descartada: ela faz `wrapBlock(x, y, n, () => true)` divergir de
   `wrapBlock(x, y, n)`, quebrando a equivalência que o teste cobra.

   **O caminho da rejeição também é intencional.** Quando `cabe` rejeita `c` cru só por
   causa do recuo comum, o laço entra, e o primeiro candidato (`k = lim = end`, onde as
   duas `ok()` são triviais) já serve — porque `serve` testa `peca(pos, end)`, que sai com
   o `pad` descontado. A linha volta **num pedaço só, com o recuo removido**: é reparo por
   deslocamento à esquerda, não quebra em dois pedaços (nas medições, isso disparou em 27
   linhas na caixa de 720 px e em 9 na de 328 px). O acorde continua sobre a sílaba certa
   porque `peca` tira o mesmo `pad` das duas linhas; o efeito visível é só que **um bloco
   recuado fica mais à esquerda no modo miniatura do que no modo texto** — na verificação
   manual isso pode parecer regressão, não é defeito, e "consertar" traria o vazamento de
   volta.

2. **O recuo do corte passa a exigir as duas condições.** Hoje o laço tem dois ramos — o
   último pedaço corta em `end` sem procurar corte válido, porque o resto cabe. Com
   `cabe`, esse ramo também precisa ser verificado, então os dois ramos viram um só:

```js
// `peca` é o que já existia no fim do laço, extraído: monta o pedaço que será
// desenhado — apara a direita e remove o recuo comum às duas linhas.
const peca = (pos, cut) => { … };                       // devolve { chords, lyric }
const serve = (pos, cut) => !cabe || cabe(peca(pos, cut).chords);

for (let pos = 0; pos < end;) {
  const lim = Math.min(pos + n, end);
  let k = lim;
  while (k > pos + 1 && !((ok(c, k) && ok(l, k)) && serve(pos, k))) k--;
  const cut = k > pos + 1 ? k : lim;
  …                                    // o resto do corpo não muda
}
```

Sem `cabe`, isto é o de hoje linha por linha: quando `end - pos <= n`, `lim` é `end`, e
`ok(c, end) && ok(l, end)` passa de primeira porque `i >= s.length` — o `while` nem gira.
Quando não cabe, `lim` é `pos + n` e a varredura é a mesma. O fallback `lim` é o antigo
`pos + n`. É isso que o teste de não-regressão cobra.

A ordem dos operandos importa por custo: `serve` só é avaliado quando `ok` já passou nas
duas linhas, ou seja, **só nos cortes válidos** — não a cada caractere.

**`serve` precisa testar o que será desenhado, não a fatia crua.** Este é o detalhe fácil
de errar: `wrapBlock` apara a direita e remove o recuo esquerdo comum às duas linhas antes
de guardar o pedaço, e é essa string que vai para `layoutChordRow`. Testar
`c.slice(pos, cut)` mediria espaços que não serão desenhados e cortaria mais do que o
preciso. Por isso a montagem do pedaço, que hoje está solta no fim do laço, sai de lá e
vira a função `peca(pos, cut)`, usada nos dois lugares — uma fonte de verdade só, como o
`blockWidth` logo abaixo.

**A saída de emergência é a que já existe.** Se o recuo chega em `k <= pos + 1`, corta na
largura mesmo e aceita o vazamento, igual ao que `wrapBlock` já faz com um token único mais
largo que a tela. Sem isso, dois acordes colados na mesma sílaba travariam o laço.

### `js/render/play.js` — medir a caixa, e um só medidor de largura

`measureCifraCols` já mede `el.clientWidth` e o `chPx` com uma sonda dentro da própria
`.cifra-text`; hoje descarta os dois e devolve só as colunas. Passa a devolver
`{ cols, px }` — `px` é o `clientWidth` — e `reflowCifra` guarda `cifraBoxPx` ao lado de
`cifraCols`. Em erro de medição devolve `{ cols: 0, px: 0 }`, e o `cols: 0` continua
significando "ainda não medido, não quebra nada".

O gatilho do re-render continua sendo a mudança de **colunas**, e o amortecedor de
oscilação (`cifraColsPrev`) segue como está: uma variação de largura menor que um
caractere não vale um re-render, e a fileira tem 6 px de folga entre blocos para absorver
isso.

Em `cifraTextHTML`, **um único `blockWidth` serve o predicado e o desenho**:

```js
const blockWidth = (tok, isChord) =>
  isChord ? Math.max(chordDiagWidth(chordName(tok), true, dict), meas.label(tok))
          : meas.tok(tok);

const cabe = (trecho) => {
  const itens = layoutChordRow(trecho, meas.chPx, blockWidth);
  if (!itens.length) return true;
  const u = itens[itens.length - 1];
  return u.x + blockWidth(u.tok, u.isChord) <= cifraBoxPx;
};
```

Duas medidas diferentes para "largura de um bloco" divergiriam no dia em que uma mudasse —
e a fileira voltaria a vazar, sem ninguém entender por quê. Hoje esse cálculo vive dentro
de `chordDiagRowHTML`; ele sai de lá e passa a ser recebido.

`cabe` é passado ao `wrapBlock` **só quando a linha vira fileira** — `mini && ln.hasLyric`,
exatamente a condição que já decide isso. Fora disso o quarto argumento não vai, e o
caminho é o de sempre.

### `sw.js`

`VERSION` sobe de `somaplay-v29` para `somaplay-v30`. Desta vez o bump é necessário: `v29`
já está publicado em `main`. O `SHELL` **não muda** — nenhum módulo novo.

## O que não muda

- O texto salvo da música. O wrap é de exibição.
- O modo texto (miniaturas desligadas), byte a byte.
- Linha só de acorde: continua texto mesmo com miniaturas ligadas, como o spec de
  2026-07-20 decidiu.
- Bloco de tablatura: continua fora do reflow, encolhendo pelo CSS.
- `layoutChordRow`, `chordDiagWidth` e a regra de colisão.
- O tamanho do diagrama.

## Fora de escopo

- Encolher o diagrama para caber, em qualquer circunstância.
- Fazer o diagrama acompanhar o zoom da cifra. Hoje o texto escala e o diagrama não
  (`chordDiagWidth` devolve 64/84 fixos, `.ch-diag .nm` é 13 px fixo). É comportamento
  atual, é coerente — o diagrama é um ícone, não texto — e mexer nisso é outro spec.
- Fileira de diagramas em linha sem letra.
- Reduzir o vazamento mudando a regra de colisão do `layoutChordRow`.

## Verificação

**Automática** (`cd app && node --test`), em `test/cifrawrap.test.js`, sobre `wrapBlock`:

- **sem o 4º argumento, a saída é idêntica à de hoje** — a asserção que garante que o modo
  texto não regrediu. Já verificada durante o design, fora da suíte: 315 pares de linha
  reais do songbook × 121 larguras = **38.115 comparações, saída idêntica em todas**. O
  teste no repo fixa o caso, não descobre;
- `cabe` que sempre devolve `true` → idêntico a não passar nada;
- `cabe` que rejeita trecho acima de N caracteres → corta mais cedo, e **acorde e letra
  saem cortados na mesma coluna** em todos os pedaços;
- linha que cabe em colunas mas é rejeitada pelo `cabe` → é quebrada mesmo assim (o atalho
  do início não escapa). Sem este teste, o bug volta silencioso: é o caso da maioria das
  fileiras que vazam hoje;
- **no laço, `cabe` recebe o pedaço já aparado**, não a fatia crua — uma linha com recuo à
  esquerda prova a diferença;
- **no atalho, `cabe` recebe exatamente a string que o atalho devolve** — o mesmo teste com
  recuo comum, comparando o que o predicado viu com o que voltou. É o caso que 17% das
  linhas do songbook exercitam;
- **o contador de chamadas do predicado precisa de limite apertado.** Nesta fixture a ordem
  certa dá 2 chamadas e a invertida dá 6; um limite frouxo deixa as duas passarem e não
  guarda nada;
- pedaço que não dá para cortar mais → volta inteiro, sem laço infinito;
- `cabe` só é chamado em cortes válidos — contador de chamadas, para provar que a ordem dos
  operandos não regrediu.

E sobre a composição real, com `layoutChordRow` + `chordDiagWidth` (ambos puros): uma linha
de acordes densa, com uma caixa estreita declarada no teste, produz mais de um pedaço, e
nenhum deles excede a caixa.

**Manual, no navegador** (`cd app && python3 -m http.server 8137`) — o que o teste não
alcança:

- *Bat Macumba* do songbook, miniaturas ligadas: **nenhuma fileira rola de lado**, e é a
  música que hoje vaza 200 px.
- *Banda Um*: idem, e o diagrama continua em cima da sílaba certa.
- Desligar as miniaturas: a cifra volta exatamente ao que era.
- Estreitar a janela até o celular: quebra mais, não vaza.
- Zoom em 70% e em 180%: sem vazamento nos dois extremos.
- Uma música com dois acordes colados na mesma sílaba: não trava, não some nada.
- Aba de cifra por imagem: sem efeito nenhum.
