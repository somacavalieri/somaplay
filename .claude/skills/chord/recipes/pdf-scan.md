# Recipe: `pdf-scan` — songbook escaneado

O caso caro, e o único com conhecimento acumulado grande. Tudo aqui foi medido em
livro de verdade, quase sempre depois de errar primeiro. O registro completo está
em `chords/-new-songbook/PROGRESSO.md` e nos `INDICE.md` de cada livro.

## Levantar o índice

1. **Achar o índice impresso.** Costuma estar nas primeiras páginas do PDF, e é a
   única fonte que dá título e página juntos.
2. **Quando faltar, procurar nos volumes vizinhos.** Os scans dos Bossa Nova 2 e
   3 começam direto na primeira música, sem as páginas de abertura. O que
   destravou os dois foi o **catálogo da Lumiar impresso nas págs. 2-4 do vol. 4**,
   listando as músicas dos volumes 1 a 5. Repetir o truque em qualquer coleção.
3. **Desconfiar do número da capa.** O Bossa Nova 3 anuncia "62 músicas" e tem 60.
   O catálogo lista 60 e 60 é o que fecha com a aritmética das páginas. Número de
   capa é publicidade.
4. **Ler compositor e ano na página da música**, não no índice, quando o índice
   não traz — foi o que se fez nas 101 do século XX.

## Verificar o mapa de páginas — nunca extrapolar

**Não existe offset único garantido.** O Caetano vol. 2 muda 4 vezes; o Bossa
Nova 1 muda 1; o Bossa Nova 3 muda 2, sempre por página perdida. Extrapolar de
uma calibração é o erro que o Bossa Nova 1 cometeu.

O método que funciona, e que deve ser repetido em todo livro novo:

1. ler o **fólio impresso** no rodapé de cada página (pela camada de OCR quando
   houver, ou recortando a faixa do rodapé);
2. montar o mapa;
3. **casar o título das N músicas com a página que o mapa prevê**. Nas 62 do
   Bossa Nova 1: 53 casaram sozinhas, 8 falharam só por ruído de OCR no título
   (o compositor batia) e 1 foi conferida no olho. Zero divergência real;
4. validar por código que as faixas **cobrem o intervalo sem buraco nem
   sobreposição** e que o mapa é bijetivo sobre o PDF;
5. um reforço barato quando o livro imprime `Copyright` no fim de cada música:
   conferir que ele cai exatamente onde a tabela diz que a música acaba.

`inspect_pdf.py folios` recorta a faixa 88,5%–95% da altura, **e isso não serve
para todas as coleções**: nos Bossa Nova 2 e 4 o fólio só aparece em 91,5%–100%,
e no vol. 3 em 92,5%–100%. Se o recorte sair em branco, é a faixa, não o scan.

### Classificar cada anomalia — elas não são todas iguais

| O que parece | O que é | Consequência |
|---|---|---|
| duas páginas com o mesmo fólio | re-scan duplicado | vira a virada de offset; nada se perde |
| salto no fólio | página não escaneada | se tiver cifra, é **perda real → 🚫** |
| fólio fora de ordem | páginas trocadas no PDF | usar a coluna "Pág. PDF" do índice, nunca `livro − N` cru |

No Bossa Nova 2 a p.119 do livro não foi escaneada e não há outra cópia: *Se é
tarde me perdoa* **não sai deste PDF**. É exatamente o caso do 🚫 — sai do
denominador, fica no registro.

## Medir o estado do scan antes de investir

Medir, não estimar, e registrar no `INDICE.md`. O que muda decisão:

- **resolução efetiva** — ≥280 dpi é confortável; ~150 dá para transcrever; ~100
  dpi (Bossa Nova 4) provavelmente **não sustenta leitura de grade por pixel**;
- **bitonal (1 bit)** — sem cinza não dá para separar "ponto apagado" de "célula
  vazia" na grade. A letra fina esfarela e o primeiro acorde da pauta às vezes
  sai corrompido (`G7(13)` lido como `G⁻(13)`): **não confiar na margem esquerda**;
- **inclinação por página** — o Caetano vai de 0,0° a 1,2° entre páginas; o Chico
  vol. 1 veio deskewed em todas. Um ângulo só não serve quando varia. Em 2000 px
  de bloco, 1,06° desloca ~37 px, mais que a altura de uma linha;
- **sujeira de borda** — espiral de fichário, faixa preta da tampa do scanner,
  ondulação perto da lombada;
- **grade de diagramas legível?** — decide se `cifra.digitacoes` é possível.

Vale medir a legibilidade das N músicas **antes** de começar, como se fez no
Caetano: mancha dentro do bloco, faixa preta, altura de linha, inclinação. Lá o
resultado foi "as 68 têm bloco legível, nenhuma perdida por qualidade", e isso
mudou a decisão de seguir.

## Extrair a cifra

### Recortar antes de medir

- **A faixa preta da tampa do scanner é tinta contínua** e costura a linha de
  acorde na de letra: medindo a página inteira saem 15 bandas em vez de 26, uma
  delas de 1166 px. Recortar a folha branca primeiro.
- **A espiral sai com corte exato na borda dela, sem margem extra** — no Caetano
  um inset de 13 px já comia a primeira letra.
- **A margem que apaga não é sempre a esquerda, e o lugar de procurar é o
  oposto.** A espiral come o PRIMEIRO token de cada banda (Cajuína, Trilhos
  Urbanos); a borda direita apagada come o ÚLTIMO — na *Vaca profana* são quatro
  palavras, uma por sistema, nas duas páginas. O sintoma é o mesmo (fragmento
  com pouca tinta), então **conferir os dois extremos de cada banda** antes de
  fechar a música. E dá para dizer quantos caracteres faltam: a folga entre o
  fim da tinta e o fim do bloco impresso (medido nas outras linhas da mesma
  página) dividida pelo px-por-caractere. Foi isso que autorizou reconstruir
  três das quatro e recusar a quarta.
- **A margem padrão de 4% é grande demais em alguns livros, e o corte é mudo.**
  Nas 101 do século XX ela comia 99 px e cortava a última barra de cinco dos sete
  sistemas (`--marg 0.015`). No João Bosco vol. 2 ela corta a p.66 inteira:
  somem quatro barras e o fim de três linhas.
  **Fazer o teste uma vez por página, antes de transcrever:** medir os tokens a
  4% e a 2% e comparar. Se a contagem ou o x final mudar, usar a menor — e
  conferir a menor contra 0,2% para saber onde parar. É barato e pega o defeito
  que não dá erro em lugar nenhum.
  Sinal barato de onde olhar: a coluna de tinta mais à direita da página. No
  João Bosco vol. 2 a p.66 vai a x=2415 e todas as outras param entre 2316 e
  2395 — a página "cheia" é a que corta.
- **`--marg-esq` maior nas páginas ímpares** quando a espiral costura a banda de
  acorde na de letra (0.075 resolveu no Chico p.69).

### Endireitar a página ANTES de medir a banda

**É o primeiro passo, e o que mais custou descobrir.** A inclinação não é só um
detalhe de qualidade: numa página a −1,10° (p.59 do Tom Jobim vol. 2) a linha
sobe 42 px ao longo de 2 200, mais de meia altura de linha. O fim da linha de
LETRA entra na faixa do acorde e **vira acorde que não existe** — ali o "A" e o
"e" de *A espera* saíram como dois acordes —, e as bandas saem grudadas sem que
nenhum limiar as separe. Endireitada, a mesma página devolve as 12 bandas
SEPARADAS e nenhum token fantasma.

`medir_bandas.py --deskew` mede o ângulo pela **variância do perfil de linhas**
(torto, o texto espalha tinta e o perfil achata) e gira antes de medir. O ângulo
é POR PÁGINA: no mesmo livro foi de +0,05° a −1,10°.

**`--deskew` SATURA EM SILÊNCIO, e a faixa é ±1,5°** (`arange(-1.5, 1.51, 0.05)`).
A p.148 do Djavan vol. 2 está a **+2,70°**: ele devolveu `+1.50°` *como se fosse
medida* e produziu 24 bandas — número plausível, todas erradas, com a mesma linha
física partida em duas. Dois sinais de que saturou, e os dois aparecem no log:

1. o ângulo impresso é exatamente `±1.50°`, o limite da faixa;
2. sai `banda ... cortada em y=... (tinta 97)` — corte forçado num ponto de tinta
   ALTA. Corte legítimo cai em tinta ~5.

Contorno: varrer −3° a +3° pelo mesmo critério (variância do perfil) e passar
`--rot`. As outras quatro páginas medidas nesse livro deram −0,05°, −0,15°,
−0,20° e +0,55° — a faixa padrão cobre o caso comum e falha justamente onde mais
importa.

Depois do deskew, o que ainda cola duas linhas é o **subscrito do acorde**
(`E⁷₄(9)`, `Gm6/Bb`, `Fm6/Ab`), e aí é por sistema, não por página: na p.109
daquele volume 3 dos 8 vêm colados e 5 separados. Quem decide é a altura da
banda; o colado se corta na linha de menos tinta, como sempre.

### `measure_cifra.py` — bandas e tokens

```bash
python3 scripts/new_songbook/measure_cifra.py <pdf> <pág> -y0 F -y1 F --gap G
```

- **rodar duas vezes**: `--gap 0.8` na linha de acorde (separa `/` do acorde sem
  quebrar `Gm6/Bb`) e `--gap 2.2` se quiser a letra agrupada em frases;
- **gap fino também na LETRA**, não só no acorde. Com folga larga a frase vira um
  token único (55 caracteres num caso), e aí o espaçamento passa a ser o que o
  transcritor escreveu, não o medido: as palavras do meio escorregam e levam o
  acorde para fora da sílaba. O gap fino não parte o que o livro liga com
  travessão (`ou—tra`), porque ali o traço encosta nas letras;
- **em scan bitonal, `--densidade`**. O chuvisco do 1 bit costura linha em linha:
  a p.43 do Cazuza saiu como uma banda só de 1193 px. `--densidade 0.02` devolveu
  as 14 bandas certas;
- **o número de bandas bater com o esperado não prova nada.** Num recorte um
  pouco mais largo, `--densidade 0.01` também devolvia 14 bandas — outras 14, com
  pedaços de grade e de pauta no meio. **Conferir o PNG de cada banda.**
- **`-y1` curto trunca a última banda**: em *Caçador de mim* com 0.89 a linha
  final de acordes saía com 17 px em vez de 52 e os tokens vinham picados. 0.90
  resolveu.
- **`É` na letra gruda as duas linhas** — o acento encosta na barra `/` e não
  sobra linha vazia. Cortar na mão, na linha de menos tinta.
- **Respingo de scan vira token fantasma.** `tokens_skel.py` descarta token com
  menos de 15 px de tinta e diz quais descartou (apareceram quatro de 1 a 6 px
  numas páginas; uma barra de verdade tem ~100 px).
- **Acorde empilhado pode sair em dois tokens**: o livro imprime `E⁷₄` e, depois
  de um espaço, `(9)`. Fundir num token só. O `D⁶₉` não tem o problema porque o
  6/9 encosta no `D`.
- **A grafia da tensão empilhada é `(a/b)`, dentro do parêntese**: `E7(4/9)`,
  `D7(b9/13)`, `Bb6(9)`. Não `E7/4(9)`. As duas funcionam no app — `transpose.js`
  só aceita `[A-G][#b]?` como baixo, então o `4` de `E7/4(9)` não é transposto por
  engano, e o `parseCifraText` reconhece as duas —, então o critério é outro: o
  acervo já tem 37 músicas assim no songbook do Gil (`A7(9/#11)`, `A7(b9/13)`) e
  duas nas 101 do século XX, e fora do parêntese a barra significa uma coisa só,
  baixo. Decisão registrada em `chords/pendencias.md`, linha da tensão empilhada.

### `measure_diagrams.py` — a grade de diagramas

```bash
python3 scripts/new_songbook/measure_diagrams.py <pdf> <pág> "<acorde,acorde,…>"
```

Mede cada caixa por pixel e resolve a casa-base pelo **teste das notas**, não pelo
OCR do algarismo romano. No Chico vol. 1 foram 71 diagramas, todos com solução
única, e a casa achada bateu com o algarismo impresso em todas as caixas que o
trazem — os dois métodos concordando é a evidência.

- **quando a caixa não fecha, tentar a OUTRA cópia do livro antes de desistir.**
  Onde existem duas (o Tom Jobim vol. 2 tem uma em cinza e uma bitonal), elas se
  completam **caixa a caixa**, não livro a livro: na p.25 o cinza inventa corda
  solta em 3 das 6 caixas da fileira de cima e o bitonal acerta as 6; na p.90 o
  bitonal perde a corda da direita do `Db7(9)` e é o cinza que lê a caixa
  inteira. Escolher a cópia por página é errado — a escolha é por caixa;
- **medir UMA FILEIRA POR VEZ quando a grade tem mais de uma.** Na p.117 do
  vol. 1 das 101 a página inteira devolve 13 caixas para 19 nomes, e o
  pareamento nome↔caixa desanda inteiro — nada fecha, e o diagnóstico só aparece
  se você contar caixas contra nomes. Com `-y0/-y1` por fileira, as três saem.
- **fileira que some inteira = traste não detectado, não fileira ausente.** O
  corte entre fileiras usa `passo * 1.8`; um traste faltando abre um vão de 2×
  o passo, a fileira é partida em duas metades e as duas caem no mínimo de 3
  linhas. A interpolação do traste faltante existe, mas roda DEPOIS do corte.
  O contorno é `--corrida-traste` mais baixo (50 resolveu essa fileira).
- **`--corrida-traste` quando o scan comeu os trastes.** O padrão de 80 px supõe
  que o traste é o traço mais confiável da página, e há página onde isso se
  inverte: na p.24 do vol. 1 (A paz) o scan deixou as CORDAS intactas e apagou os
  trastes — a maior corrida horizontal da grade inteira é 81 px. Baixar admite
  ruído, e o juiz continua sendo o teste das notas: ali, com 15, a grade aparece
  e **os 11 acordes não fecham** — sinal de que a grade lida é falsa, não de que
  o limiar precisa descer mais. Essa grade não sai deste scan.
- **dois furos conhecidos do teste das notas**, que reprovam desenho CERTO:
  `7M` dentro de parêntese é lido como `7` simples (`Am(7M)`, `Fm(7M)`), e
  `7(4)` entre parênteses não descarta a terça (`C7(4/9)`, `A7(4)`), embora o
  `⁷₄` empilhado do Chediak seja sus4. Nos dois casos, conferir as notas na mão
  antes de descartar o diagrama.
- **achar a caixa pelas linhas HORIZONTAIS, não pelas verticais.** A tinta das
  cordas é irregular (159 colunas numa fileira, 67 em outra) e o agrupamento por
  corda quebra; o traste atravessa a caixa inteira e é o traço mais confiável;
- **em scan BITONAL, tirar a caixa da EXTENSÃO do traste, não das cordas.** O
  `measure_diagrams.py` acha a corda como coluna com tinta em ≥75% da altura da
  caixa; no 1 bit a corda sai picada e o critério nunca fecha — na p.112 do
  Caetano vol. 2 ele devolveu 18 e 21 "caixas" onde há 5. A corrida horizontal
  do traste é a caixa, e as 6 cordas saem por divisão uniforme da largura, que
  é o que o desenho garante. Com isso as 20 caixas daquela grade saíram, 19 com
  casa-base única. **E deskew ANTES**: com 1,2° a mesma linha de traste aparece
  em dois y ao longo da fileira, cada traste sai dobrado e a caixa vira de 9
  espaços;
- **traste claro demais some** — com corrida mínima de 100 px a caixa vira de 2
  espaços. 80 px + interpolação do traste que falta resolve;
- **dois limiares**: 170 para as linhas do braço (com 128 a corda mais à direita
  some), 128 para o ponto (corrida horizontal ≥14 px no centro da casa). ○ acima
  do braço = corda solta; corda sem marca = não toca;
- **voicing sem a fundamental existe** e é idiomático quando o acorde nomeia o
  baixo (`Cm7(9)/G` = Sol-Mib-Sib-Ré). A ferramenta tenta com fundamental
  obrigatória primeiro e marca o caso;
- **o diminuto já é tratado** (`°`, `º`, `dim`, `o` → raiz, b3, b5, bb7, os quatro
  obrigatórios). O Chediak usa `°` o tempo todo.

**Quando desenho e nome divergem, distinguir dois casos:**

- o **desenho soa outro acorde** (o `G6` e o `Bbm7` do *Samba de uma nota só*):
  deixar a forma **fora** de `cifra.digitacoes` — o app cai no catálogo, ou o
  acorde aparece sem diagrama, que é ausência honesta;
- só o **algarismo romano destoa**, com desenho e nome concordando (o `A°` de
  *Rosa morena*, impresso VI quando as notas exigem IV): vale a casa que as notas
  pedem, e a prova está na própria página.

### Escala: por MÚSICA, não por livro

`scale` (px por coluna) é campo do `SONGS`. **Critério: a MAIOR escala que não
empurra acorde nem sílaba.** Escala maior dá linha mais curta, o que é melhor no
tablet, mas aproxima os tokens até transbordarem — e empurrão é o único jeito de
o acorde sair de cima da sílaba. Barra de compasso empurrada uma coluna é
aceitável: ela não marca sílaba.

Os valores medidos até agora vão de **15.4 a 21**, e variam dentro do mesmo
livro: o gravador aperta a linha quando o verso é longo. Medir com o próprio
módulo antes de fechar a música; `check_cifra.py` escolhe a escala, prova que
ninguém foi empurrado e mostra o que ficou embaixo de cada acorde.

**Quando o corpo é proporcional demais, o critério se inverte — e aí a conta é
outra.** Empurrão é um *proxy* de desalinhamento, não o desalinhamento. Numa
página cujo px-por-caractere varia muito (em *Baby*, Caetano vol. 2: de 9 a 25,
mediana 17,8 — `sei` dá 12 e `um` dá 25), a escala que não empurra ninguém tem
de caber na palavra mais ESTREITA, e aí as largas encolhem: o acorde que no
impresso está sobre a última sílaba sai fora da palavra. Medir então o
**deslocamento acorde↔sílaba contra o impresso** — comparar a posição do acorde
dentro da palavra na página (`(x − x_palavra) / largura × n_caracteres`) com a
coluna renderizada:

| escala | empurrões | erro médio | erro máximo |
| ------ | --------- | ---------- | ----------- |
| 13,0   | 0         | 0,91 car   | **4,9 car** |
| 16,0   | 23 (de 1 coluna) | **0,36 car** | 1,3 car |
| 19,0   | 98        | 2,75 car   | 8,4 car     |

A curva tem fundo, e não é onde os empurrões zeram. Empurrão de uma coluna é
barato; sílaba errada não é. Só vale a pena fazer essa medida quando a escala
sem empurrão sair bem abaixo da mediana de px-por-caractere da página — se as
duas baterem, a regra simples já está certa.

Largura não entra na conta: `wrapBlock` (`chords.js`) reflui acorde e letra
juntos, na mesma coluna.

## Decisões que se repetem

- **Barras de compasso `/`: manter.** É a notação do próprio Chediak e o parser
  do app aceita barra isolada como marca (`MARK`), desde que com espaço em volta.
  O songbook do Gil é a exceção, onde foram removidas a pedido.
- **Traço de melisma** ("Arra——sa"): remover — é recurso de gravação musical, não
  texto, e a posição da sílaba já vem da medição.
  **A condição dessa regra é que nenhum acorde caia DENTRO de palavra esticada
  pelo traço**, e ela não vale sempre. A medição dá a posição do INÍCIO do token;
  o que o acorde faz no meio de uma palavra esticada não vem dela. No Djavan
  vol. 2 sete acordes caem aí, e removendo o traço o acorde escorrega 3,4
  caracteres em média e 5,5 no pior — em 4 dos 7 para FORA da palavra. O pior é
  `D7M/F#` sobre `besou————ro`, refrão que repete 4×: no impresso está sobre
  `sou`, sem o traço cai depois do `ro`.
  Quando um acorde cair dentro, **devolver o traço dimensionado pela largura
  medida**: `n = round(largura/escala) − nº de letras`, podendo dar zero. O erro
  cai de 5,5 para 0,8 caractere. A mesma fórmula devolve 2 traços onde o livro
  imprime um curto (`assombra–ção`) e 14 onde imprime um longo.
- **Palavra com DOIS traços** (`Es——quece————ra`, `o———cea——no`,
  `irre———medi——ável`) não fecha pela largura total — a largura não diz como ela
  se reparte entre os vãos. Medir os **trechos de letra** por pixel (coluna de
  tinta alta contra a do traço, que é fino: limiar de altura ~6 px na banda) e
  dimensionar cada traço para o trecho seguinte cair na coluna medida. Usar o
  **x0 da LINHA**, não o da palavra: os dois arredondamentos divergem e erram uma
  coluna.
- **Quando o traço de melisma depende da escala, a escala deixa de ser monótona**
  no número de empurrões: aproximação sucessiva não converge (fica oscilando
  entre dois valores). Varrer a faixa inteira de 0,1 em 0,1 e ficar com o maior
  valor com zero empurrão. No Djavan vol. 2 as cinco deram 17.4, 20.2, 19.1, 17.2
  e 17.6 — e em *Açaí* 17.4 tem zero empurrão enquanto 17.3 tem três e 17.5 tem
  dois. Onde o traço ligava duas
  palavras, devolver o espaço.
  **Não é "traço dentro de palavra sai"; é "traço LONGO dentro de palavra sai".**
  Comprimento e altura distinguem melisma de hífen, e os dois aparecem na mesma
  palavra: em `ca—na-du————ra` (Siri recheado, João Bosco vol. 2) o traço do
  meio é curto e na altura do hífen — a palavra é **`cana-dura`**, e o hífen
  fica. Conferir a 300 dpi lado a lado com os traços longos vizinhos.
- **Travessão de diálogo FICA** — é pontuação, não melisma: `— Não bebo mais!`,
  `noite — sua mãe`. O tokenizador junta o travessão com a palavra seguinte
  (folga de ~10 px, abaixo do limiar de 15); separar os dois medindo de novo a
  `gap=10`. Numa linha de **letra** separar não corre risco nenhum, e devolve a
  coluna certa à sílaba.
- **Artista:** num songbook de um artista só, todas entram com o nome dele,
  inclusive as em parceria — senão a lente de Artistas quebra o livro em cinco.
  O crédito completo fica no `INDICE.md`.
- **Estilo:** quando o livro não traz, é escolha — registrar que foi escolha.
  Alguns trazem (o Caymmi vol. 2 imprime em itálico à esquerda da 1ª pauta).
- **Erro de impressão do livro:** manter o impresso e anotar. Corrigir só a
  pedido.
- **Texto CORTADO pela caixa não é erro de impressão — é outra categoria.**
  Quando a linha transborda o quadro de texto, o fim dela some da página:
  `Aqualou` por `Aqualouca`, `D7(` por `D7(9/13)`, `pra` por `prazer` (João
  Bosco vol. 2, p.86). Não há juízo editorial em devolver os caracteres: **a
  partitura das páginas seguintes traz o mesmo texto inteiro**, com a sílaba
  embaixo da nota, impressa pela mesma editora na mesma edição.
  **Completar, citando a fonte no `INDICE.md`, trecho a trecho.** Num deles a
  escolha nem existe: `D7(` faz o `isChordLine` reprovar a **linha inteira** —
  medido, 8 acordes perdidos contra 8 recuperados.
  Como reconhecer: os finais cortados terminam todos na mesma coluna (~x=2400 na
  p.86), que é onde o quadro fecha. Um erro de digitação não se alinha assim.
- **Acorde com ESPAÇO interno derruba a linha inteira.** `isChordLine` parte a
  linha por espaço e reprova quando um token não é acorde nem marca — e em
  `D7M (omit 3)` os tokens `omit` e `3)` não são. Medido no Djavan vol. 2: 8 das
  10 linhas de acorde de *Açaí* sumiriam. Escrever `D7M(omit3)`, sem o espaço
  interno: é o mesmo nome, e não é renotação.
- **O travessão de margem da página vira token, e faz o mesmo estrago.** Largura
  de 12 a 48 px, fora da mancha (à esquerda em *Açaí*, *Fato consumado* e
  *Oceano*; à direita em *Lambada de serpente* e *Sina* — o mesmo livro usa os
  dois lados). Numa linha de LETRA é só ruído; numa de ACORDE reprova a linha
  toda. **Conferir os dois lados de toda página.** Exceção útil: `Introdução:`
  seguido de acordes passa, porque `stripLabels` reconhece rótulo com
  dois-pontos — mas só se o travessão não vier antes.
- **Glifo musical no meio da cifra (pausa `𝄽`, e afins): não entra, e não se
  troca por outro.** `parseCifraText` reprova a linha inteira que contenha um —
  o `MARK` do `chords.js` não o aceita — e todos os acordes dela somem. Trocar
  por `%` passa no parser e **diz outra coisa** (`%` é "repete o compasso
  anterior", não pausa). Deixar o **vão**: a coluna de cada acorde continua
  exata e nada falso é afirmado. Anotar quantos foram no `INDICE.md`.
