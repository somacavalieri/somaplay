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
- **A margem padrão de 4% é grande demais em alguns livros.** Nas 101 do século
  XX ela comia 99 px e cortava a última barra de cinco dos sete sistemas: usar
  `--marg 0.015`.
- **`--marg-esq` maior nas páginas ímpares** quando a espiral costura a banda de
  acorde na de letra (0.075 resolveu no Chico p.69).

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
  de um espaço, `(9)`. Fundir em `E7/4(9)`. O `D⁶₉` não tem o problema porque o
  6/9 encosta no `D`.

### `measure_diagrams.py` — a grade de diagramas

```bash
python3 scripts/new_songbook/measure_diagrams.py <pdf> <pág> "<acorde,acorde,…>"
```

Mede cada caixa por pixel e resolve a casa-base pelo **teste das notas**, não pelo
OCR do algarismo romano. No Chico vol. 1 foram 71 diagramas, todos com solução
única, e a casa achada bateu com o algarismo impresso em todas as caixas que o
trazem — os dois métodos concordando é a evidência.

- **achar a caixa pelas linhas HORIZONTAIS, não pelas verticais.** A tinta das
  cordas é irregular (159 colunas numa fileira, 67 em outra) e o agrupamento por
  corda quebra; o traste atravessa a caixa inteira e é o traço mais confiável;
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

Largura não entra na conta: `wrapBlock` (`chords.js`) reflui acorde e letra
juntos, na mesma coluna.

## Decisões que se repetem

- **Barras de compasso `/`: manter.** É a notação do próprio Chediak e o parser
  do app aceita barra isolada como marca (`MARK`), desde que com espaço em volta.
  O songbook do Gil é a exceção, onde foram removidas a pedido.
- **Traço de melisma** ("Arra——sa"): remover — é recurso de gravação musical, não
  texto, e a posição da sílaba já vem da medição. Onde o traço ligava duas
  palavras, devolver o espaço.
- **Artista:** num songbook de um artista só, todas entram com o nome dele,
  inclusive as em parceria — senão a lente de Artistas quebra o livro em cinco.
  O crédito completo fica no `INDICE.md`.
- **Estilo:** quando o livro não traz, é escolha — registrar que foi escolha.
  Alguns trazem (o Caymmi vol. 2 imprime em itálico à esquerda da 1ª pauta).
- **Erro de impressão do livro:** manter o impresso e anotar. Corrigir só a
  pedido.
