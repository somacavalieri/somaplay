// chords-catalog.js — catálogo de formas (voicings). Um nome tem 1..n variações;
// a marcada `default:true` (ou a primeira) é a padrão. Só-leitura em runtime (MVP);
// cresce no repo à medida que músicas são importadas.
// forma: { frets:[Mi grave, Lá, Ré, Sol, Si, Mi agudo], barre?:{fret,from,to}, label?, default? }
//
// ATENÇÃO — o ÍNDICE de cada forma no array vira o id persistido `b:<nome>:<índice>`
// (chordbook.js:builtinShapes). Esse id é gravado como referência em vários lugares:
// lápides (`hidden`) e overrides no store `chordbook`, e o `varId` salvo em
// `digitacoes` das músicas. Inserir uma forma NO MEIO do array de um nome (ou
// reordenar/remover uma existente) desloca o índice das formas seguintes e re-liga
// silenciosamente essas referências pra formas erradas. Regra: só ACRESCENTE formas
// no FIM do array de cada nome; nunca reordene nem remova uma forma já publicada
// (pra tirar uma de circulação, esconda pelo dicionário em vez de apagar daqui).

export const CATALOG = {
  // — semente: formas antes embutidas em chords.js (cada uma vira a padrão do seu nome) —
  'C':    [{ frets: [-1, 3, 2, 0, 1, 0], default: true },
           { frets: [-1, 3, 5, 5, 5, 3],     barre: { fret: 3, from: 1, to: 5 }, label: 'forma A' },
           { frets: [8, 7, 5, 5, 5, -1],     barre: { fret: 5, from: 2, to: 4 }, label: 'forma G' },
           { frets: [8, 10, 10, 9, 8, 8],    barre: { fret: 8, from: 0, to: 5 }, label: 'forma E' },
           { frets: [-1, -1, 10, 12, 13, 12],                                    label: 'forma D' }],
  'C#m':  [{ frets: [-1, 4, 6, 6, 5, 4], barre: { fret: 4, from: 1, to: 5 }, default: true }],
  'C#m7': [{ frets: [-1, 4, 6, 4, 5, 4], barre: { fret: 4, from: 1, to: 5 }, default: true }],
  'D':    [{ frets: [-1, -1, 0, 2, 3, 2], default: true },
           { frets: [-1, 5, 4, 2, 3, 2],       barre: { fret: 2, from: 3, to: 5 },  label: 'forma C' },
           { frets: [-1, 5, 7, 7, 7, 5],       barre: { fret: 5, from: 1, to: 5 },  label: 'forma A' },
           { frets: [10, 9, 7, 7, 7, -1],      barre: { fret: 7, from: 2, to: 4 },  label: 'forma G' },
           { frets: [10, 12, 12, 11, 10, 10],  barre: { fret: 10, from: 0, to: 5 }, label: 'forma E' }],
  'D7':   [{ frets: [-1, -1, 0, 2, 1, 2], default: true }],
  'Dm':   [{ frets: [-1, -1, 0, 2, 3, 1], default: true }],
  'Dm7':  [{ frets: [-1, -1, 0, 2, 1, 1], default: true }],
  'D#m':  [{ frets: [-1, 6, 8, 8, 7, 6], barre: { fret: 6, from: 1, to: 5 }, default: true }],
  'E':    [{ frets: [0, 2, 2, 1, 0, 0], default: true },
           { frets: [-1, -1, 2, 4, 5, 4],                                       label: 'forma D' },
           { frets: [-1, 7, 6, 4, 5, 4],    barre: { fret: 4, from: 3, to: 5 }, label: 'forma C' },
           { frets: [-1, 7, 9, 9, 9, 7],    barre: { fret: 7, from: 1, to: 5 }, label: 'forma A' },
           { frets: [12, 11, 9, 9, 9, -1],  barre: { fret: 9, from: 2, to: 4 }, label: 'forma G' }],
  'Em':   [{ frets: [0, 2, 2, 0, 0, 0], default: true }],
  'Em7':  [{ frets: [0, 2, 0, 0, 0, 0], default: true }],
  'E7':   [{ frets: [0, 2, 0, 1, 0, 0], label: 'simples', default: true },
           { frets: [0, 2, 2, 1, 3, 0], label: 'com 3ª e 7ª' }],
  'F':    [{ frets: [1, 3, 3, 2, 1, 1], barre: { fret: 1, from: 0, to: 5 }, default: true }],
  'F#':   [{ frets: [2, 4, 4, 3, 2, 2], barre: { fret: 2, from: 0, to: 5 }, default: true }],
  'F#m':  [{ frets: [2, 4, 4, 2, 2, 2], barre: { fret: 2, from: 0, to: 5 }, default: true }],
  'G':    [{ frets: [3, 2, 0, 0, 0, 3], default: true },
           { frets: [3, 5, 5, 4, 3, 3],       barre: { fret: 3, from: 0, to: 5 },  label: 'forma E' },
           { frets: [-1, -1, 5, 7, 8, 7],                                          label: 'forma D' },
           { frets: [-1, 10, 9, 7, 8, 7],     barre: { fret: 7, from: 3, to: 5 },  label: 'forma C' },
           { frets: [-1, 10, 12, 12, 12, 10], barre: { fret: 10, from: 1, to: 5 }, label: 'forma A' }],
  'G7':   [{ frets: [3, 2, 0, 0, 0, 1], default: true }],
  'G/B':  [{ frets: [-1, 2, 0, 0, 3, 3], default: true }],
  'G#m':  [{ frets: [4, 6, 6, 4, 4, 4], barre: { fret: 4, from: 0, to: 5 }, default: true }],
  'Gmaj7':[{ frets: [3, 2, 0, 0, 0, 2], default: true }],
  'G7M':  [{ frets: [3, 2, 0, 0, 0, 2], default: true }],
  'Gm':   [{ frets: [3, 5, 5, 3, 3, 3], barre: { fret: 3, from: 0, to: 5 }, default: true }],
  'D7/C': [{ frets: [-1, 3, 0, 2, 1, 2], default: true }],
  'A':    [{ frets: [-1, 0, 2, 2, 2, 0], default: true },
           { frets: [5, 4, 2, 2, 2, -1],     barre: { fret: 2, from: 2, to: 4 }, label: 'forma G' },
           { frets: [5, 7, 7, 6, 5, 5],      barre: { fret: 5, from: 0, to: 5 }, label: 'forma E' },
           { frets: [-1, -1, 7, 9, 10, 9],                                       label: 'forma D' },
           { frets: [-1, 12, 11, 9, 10, 9],  barre: { fret: 9, from: 3, to: 5 }, label: 'forma C' }],
  'A7':   [{ frets: [-1, 0, 2, 0, 2, 0], default: true }],
  'Am':   [{ frets: [-1, 0, 2, 2, 1, 0], default: true }],
  'Am7':  [{ frets: [-1, 0, 2, 0, 1, 0], default: true }],
  'A#':   [{ frets: [-1, 1, 3, 3, 3, 1], barre: { fret: 1, from: 1, to: 5 }, default: true }],
  'B':    [{ frets: [-1, 2, 4, 4, 4, 2], barre: { fret: 2, from: 1, to: 5 }, default: true }],
  'B7':   [{ frets: [-1, 2, 1, 2, 0, 2], default: true }],
  'Bm':   [{ frets: [-1, 2, 4, 4, 3, 2], barre: { fret: 2, from: 1, to: 5 }, default: true }],
  'Bm7':  [{ frets: [-1, 2, 4, 2, 3, 2], barre: { fret: 2, from: 1, to: 5 }, default: true }],
  'Cmaj7':[{ frets: [-1, 3, 2, 0, 0, 0], default: true }],
  'C7M':  [{ frets: [-1, 3, 2, 0, 0, 0], default: true }],
  // — novas formas de As Pastorinhas (Noel Rosa), conferidas contra o CifraClub —
  'C/E':    [{ frets: [0, 3, 2, 0, 1, 0], default: true }],
  'Cm':     [{ frets: [-1, 3, 5, 5, 4, 3], barre: { fret: 3, from: 1, to: 5 }, label: 'pestana 3ª', default: true }],
  'Cm6/Eb': [{ frets: [-1, -1, 1, 2, 1, 3], default: true }],
  'G/D':    [{ frets: [-1, 5, 5, 4, 3, -1], label: 'baixo em Ré', default: true }],
  'G7/B':   [{ frets: [-1, 2, 3, 0, 3, -1], default: true }],
  'Gm6/Bb': [{ frets: [-1, 1, 2, 0, 3, 0], default: true }],
  // — cauda longa (MPB/samba/jazz): Queremos Saber, Disfarça e Chora, Me Dê Motivo.
  //   Voicings derivados e verificados por notas; podem diferir do CifraClub — ajustáveis no app.
  'Cm6':     [{ frets: [-1, 3, 1, 2, 1, 3], default: true }],
  'G/F':     [{ frets: [1, -1, 0, 0, 0, 3], default: true }],
  'D7(4)':   [{ frets: [-1, -1, 0, 2, 1, 3], default: true }],
  'F7M':     [{ frets: [-1, -1, 3, 2, 1, 0], default: true }],
  // A forma de índice 0 é a antiga e continua sendo a padrão: o índice vira o id
  // persistido `b:C#°:0`. A segunda vem da tabela de diminutos do autor, lida por
  // pixel e conferida pelas notas — é a que fecha a família com E°, G° e A#°.
  'C#°':     [{ frets: [-1, 4, 5, 3, 5, 3], default: true },
              { frets: [-1, 4, 5, 3, 5, -1] }],
  'C/D':     [{ frets: [-1, -1, 0, 0, 1, 0], default: true }],
  'Bb7M':    [{ frets: [-1, 1, 3, 2, 3, -1], default: true }],
  'C#7':     [{ frets: [-1, 4, 3, 4, 2, 4], default: true }],
  'C7':      [{ frets: [-1, 3, 2, 3, 1, 0], default: true }],
  'Am/E':    [{ frets: [0, 0, 2, 2, 1, 0], default: true }],
  'Cm/Eb':   [{ frets: [-1, -1, 1, 0, 1, 3], default: true }],
  'Gm7':     [{ frets: [3, 5, 3, 3, 3, 3], barre: { fret: 3, from: 0, to: 5 }, default: true }],
  'C7/E':    [{ frets: [0, 3, 2, 3, 1, 0], default: true }],
  'Am7(5-)': [{ frets: [-1, 0, 1, 0, 1, -1], default: true }],
  'Am7/E':   [{ frets: [0, 0, 2, 0, 1, 0], default: true }],
  'C7(4)':   [{ frets: [-1, 3, 3, 3, 1, 1], default: true }],
  'C7(9-)':  [{ frets: [-1, 3, 2, 3, 2, 3], default: true }],
  'Em7(5-)': [{ frets: [-1, -1, 2, 3, 3, 3], default: true }],
  'C#m5-':   [{ frets: [-1, 4, 2, 0, -1, -1], default: true }],
  'Dm7/C':   [{ frets: [-1, 3, 0, 2, 1, 1], default: true }],
  'D7/F#':   [{ frets: [2, 0, 0, 2, 1, 2], default: true }],
  // — diminutos: tabela do autor (chords/_diagramas/diminutos.png), lida por pixel
  //   e conferida nota a nota. São 12 posições dos mesmos três acordes, cada uma
  //   com a fundamental no baixo: C°=D#°=F#°=A°, C#°=E°=G°=A#°, D°=F°=G#°=B°.
  //   O 'A#°' usa o Sol solto — a tabela não desenha corda solta, e sem ele
  //   faltaria a 7ª diminuta. O 'D°' vem da posição marcada '4ª' na tabela. —
  'C°':      [{ frets: [-1, 3, 4, 2, 4, -1], default: true }],
  'D°':      [{ frets: [-1, 5, 6, 4, 6, -1], default: true }],
  'D#°':     [{ frets: [-1, -1, 1, 2, 1, 2], default: true }],
  'E°':      [{ frets: [-1, -1, 2, 3, 2, 3], default: true }],
  'F°':      [{ frets: [-1, -1, 3, 4, 3, 4], default: true }],
  'F#°':     [{ frets: [2, -1, 1, 2, 1, -1], default: true }],
  'G°':      [{ frets: [3, -1, 2, 3, 2, -1], default: true }],
  'G#°':     [{ frets: [4, -1, 3, 4, 3, -1], default: true }],
  'A°':      [{ frets: [5, -1, 4, 5, 4, -1], default: true }],
  'A#°':     [{ frets: [-1, 1, 2, 0, 2, -1], default: true }],
  'B°':      [{ frets: [-1, 2, 3, 1, 3, -1], default: true }],

  // — lote 1 do catálogo (spec 2026-08-11): tríades, sétimas, sétimas maiores,
  //   sus/add9/6 que o acervo usa e o catálogo não tinha. Geradas por busca de
  //   digitação e conferidas pelas notas — todas soam exatamente o acorde do nome,
  //   com a fundamental no baixo, vão de no máximo 3 casas e nada acima da 7ª.
  //   Prioridade: menor vão, depois posição mais baixa; da 5ª casa em diante a
  //   forma é móvel e não mistura corda solta. —
  'A#(4)': [{ frets: [-1, 1, 1, 3, 4, 1], default: true }],
  'A#6':   [{ frets: [-1, 1, 3, 3, 3, 3], default: true }],
  'A#7':   [{ frets: [-1, 1, 3, 1, 3, 1], default: true }],
  'A#7M':  [{ frets: [-1, 1, 3, 2, 3, 1], default: true }],
  'A#m':   [{ frets: [-1, 1, 3, 3, 2, 1], default: true }],
  'A#m6':  [{ frets: [-1, 1, 3, 3, 2, 3], default: true }],
  'A#m7':  [{ frets: [-1, 1, 3, 1, 2, 1], default: true }],
  'A#m7M': [{ frets: [-1, 1, 3, 2, 2, 1], default: true }],
  'A(4)':  [{ frets: [-1, 0, 0, 2, 3, 0], default: true }],
  'A(9)':  [{ frets: [-1, 0, 2, 4, 2, 0], default: true }],
  'A6':    [{ frets: [-1, 0, 2, 2, 2, 2], default: true }],
  'A7M':   [{ frets: [-1, 0, 2, 1, 2, 0], default: true }],
  'Am(9)': [{ frets: [5, 7, 7, 5, 5, 7], default: true }],
  'Am6':   [{ frets: [-1, 0, 2, 2, 1, 2], default: true }],
  'Am7M':  [{ frets: [-1, 0, 2, 1, 1, 0], default: true }],
  'B(4)':  [{ frets: [-1, 2, 2, 4, 0, 2], default: true }],
  'B(9)':  [{ frets: [-1, 2, 1, 4, 2, 2], default: true }],
  'B6':    [{ frets: [-1, 2, 1, 1, 0, 2], default: true }],
  'B7M':   [{ frets: [-1, 2, 1, 3, 0, 2], default: true }],
  'Bm(9)': [{ frets: [-1, 2, 0, 4, 2, 2], default: true }],
  'Bm6':   [{ frets: [-1, 2, 0, 1, 0, 2], default: true }],
  'Bm7M':  [{ frets: [-1, 2, 0, 3, 0, 2], default: true }],
  'C#':    [{ frets: [-1, 4, 6, 6, 6, 4], default: true }],
  'C#(4)': [{ frets: [-1, 4, 4, 1, 2, 2], default: true }],
  'C#(9)': [{ frets: [-1, 4, 1, 1, 4, 1], default: true }],
  'C#6':   [{ frets: [-1, 4, 3, 3, 2, 4], default: true }],
  'C#7M':  [{ frets: [-1, 4, 6, 5, 6, 4], default: true }],
  'C#m6':  [{ frets: [-1, 4, 2, 3, 2, 4], default: true }],
  'C#m7M': [{ frets: [-1, 4, 6, 5, 5, 4], default: true }],
  'C(4)':  [{ frets: [-1, 3, 3, 0, 1, 1], default: true }],
  'C(9)':  [{ frets: [-1, 3, 0, 0, 3, 0], default: true }],
  'C6':    [{ frets: [-1, 3, 2, 2, 1, 3], default: true }],
  'Cm(9)': [{ frets: [-1, 3, 0, 0, 4, 3], default: true }],
  'Cm7':   [{ frets: [-1, 3, 1, 3, 1, 3], default: true }],
  'Cm7M':  [{ frets: [-1, 3, 1, 0, 0, 3], default: true }],
  'D#':    [{ frets: [-1, -1, 1, 3, 4, 3], default: true }],
  'D#(4)': [{ frets: [-1, -1, 1, 3, 4, 4], default: true }],
  'D#6':   [{ frets: [-1, -1, 1, 3, 1, 3], default: true }],
  'D#7':   [{ frets: [-1, -1, 1, 3, 2, 3], default: true }],
  'D#7M':  [{ frets: [-1, -1, 1, 3, 3, 3], default: true }],
  'D#m6':  [{ frets: [-1, -1, 1, 3, 1, 2], default: true }],
  'D#m7':  [{ frets: [-1, -1, 1, 3, 2, 2], default: true }],
  'D#m7M': [{ frets: [-1, -1, 1, 3, 3, 2], default: true }],
  'D(4)':  [{ frets: [-1, -1, 0, 2, 3, 3], default: true }],
  'D(9)':  [{ frets: [-1, 5, 2, 2, 5, 2], default: true }],
  'D6':    [{ frets: [-1, -1, 0, 2, 0, 2], default: true }],
  'D7M':   [{ frets: [-1, -1, 0, 2, 2, 2], default: true }],
  'Dm(9)': [{ frets: [-1, 5, 3, 2, 5, 5], default: true }],
  'Dm6':   [{ frets: [-1, -1, 0, 2, 0, 1], default: true }],
  'Dm7M':  [{ frets: [-1, -1, 0, 2, 2, 1], default: true }],
  'E(4)':  [{ frets: [0, 0, 2, 2, 0, 0], default: true }],
  'E(9)':  [{ frets: [0, 2, 2, 1, 0, 2], default: true }],
  'E6':    [{ frets: [0, 2, 2, 1, 2, 0], default: true }],
  'E7M':   [{ frets: [0, 2, 1, 1, 0, 0], default: true }],
  'Em(9)': [{ frets: [0, 2, 2, 0, 0, 2], default: true }],
  'Em6':   [{ frets: [0, 2, 2, 0, 2, 0], default: true }],
  'Em7M':  [{ frets: [0, 2, 1, 0, 0, 0], default: true }],
  'F#(4)': [{ frets: [2, 2, 4, 4, 2, 2], default: true }],
  'F#6':   [{ frets: [2, 1, 1, 3, 2, 2], default: true }],
  'F#7':   [{ frets: [2, 1, 2, 3, 2, 2], default: true }],
  'F#7M':  [{ frets: [2, 1, 3, 3, 2, 1], default: true }],
  'F#m6':  [{ frets: [2, 0, 1, 2, 2, 2], default: true }],
  'F#m7':  [{ frets: [2, 0, 2, 2, 2, 0], default: true }],
  'F#m7M': [{ frets: [2, 0, 3, 2, 2, 2], default: true }],
  'F(4)':  [{ frets: [1, 1, 3, 3, 1, 1], default: true }],
  'F(9)':  [{ frets: [1, 0, 3, 0, 1, 1], default: true }],
  'F6':    [{ frets: [1, 0, 0, 2, 1, 1], default: true }],
  'F7':    [{ frets: [1, 0, 1, 2, 1, 1], default: true }],
  'Fm':    [{ frets: [1, 3, 3, 1, 1, 1], default: true }],
  'Fm6':   [{ frets: [1, 3, 3, 1, 3, 1], default: true }],
  'Fm7':   [{ frets: [1, 3, 1, 1, 1, 1], default: true }],
  'Fm7M':  [{ frets: [1, 3, 3, 1, 1, 0], default: true }],
  'G#':    [{ frets: [4, 6, 6, 5, 4, 4], default: true }],
  'G#(4)': [{ frets: [4, 4, 6, 6, 4, 4], default: true }],
  'G#6':   [{ frets: [4, 3, 3, 5, 4, 4], default: true }],
  'G#7':   [{ frets: [4, 3, 4, 5, 4, 4], default: true }],
  'G#7M':  [{ frets: [4, 3, 5, 5, 4, 3], default: true }],
  'G#m6':  [{ frets: [4, 2, 3, 4, 4, 4], default: true }],
  'G#m7':  [{ frets: [4, 2, 4, 4, 4, 2], default: true }],
  'G#m7M': [{ frets: [4, 6, 5, 4, 4, 4], default: true }],
  'G(4)':  [{ frets: [3, 3, 0, 0, 3, 3], default: true }],
  'G(9)':  [{ frets: [3, 0, 0, 0, 0, 3], default: true }],
  'G6':    [{ frets: [3, 2, 0, 0, 0, 0], default: true }],
  'Gm(9)': [{ frets: [3, 0, 0, 3, 3, 3], default: true }],
  'Gm6':   [{ frets: [3, 1, 0, 0, 3, 0], default: true }],
  'Gm7M':  [{ frets: [3, 1, 0, 0, 3, 2], default: true }],


  // — formas acrescentadas para o repertório dos songbooks Chediak (v0.14.3) —
  // Estas são formas do DICIONÁRIO DO APP, não as digitações que o livro
  // desenhou: quando a música traz `cifra.digitacoes`, ela ganha destas. Entram
  // porque o catálogo tinha 80 formas e as 101 do Século XX abriram 31 nomes sem
  // forma alguma — o "card mudo", um diagrama vazio no popover.
  // Cada uma foi ESCOLHIDA POR BUSCA e validada pelo `notas_do_nome` de
  // scripts/new_songbook/measure_diagrams.py: as notas obrigatórias do nome
  // presentes, nenhuma nota estranha, fundamental no baixo (ou o baixo que o nome
  // manda), no máximo 4 casas de vão e sem corda muda no meio.
  // Duas exigiram decisão fora do validador, que tem dois limites conhecidos:
  //   * `7M` DENTRO de parêntese é lido como `7` simples, então `Am(7M)` passaria
  //     com Sol natural. A forma abaixo tem Sol# — o certo para a sétima maior.
  //   * `7(4)` entre parênteses NÃO descarta a terça (só `7/4` fora descarta),
  //     mas o `⁷₄` empilhado do Chediak é sus4. As três `7(4/9)` abaixo estão sem
  //     terça, como o impresso pede.
  'G6/B':       [{ frets: [-1, 2, 0, 0, 0, 0], default: true }],
  'Dm/F':       [{ frets: [1, 0, 0, 2, 3, 1], default: true }],
  'Dm/C':       [{ frets: [-1, 3, 0, 2, 1, 1], default: true }],
  'D/C':        [{ frets: [-1, 3, 0, 2, 3, 2], default: true }],
  'Gm/F':       [{ frets: [1, 1, 0, 0, 3, 1], default: true }],
  'E7/G#':      [{ frets: [4, 2, 0, 4, 0, 0], default: true }],
  'E7/B':       [{ frets: [-1, 2, 0, 1, 0, 0], default: true }],
  'A7/C#':      [{ frets: [-1, 4, 2, 2, 2, 3], default: true }],
  'A/G':        [{ frets: [3, 0, 2, 0, 2, 0], default: true }],
  'Bb(add9)/D': [{ frets: [-1, -1, 0, 3, 1, 1], default: true }],
  'D7(9)':      [{ frets: [-1, 5, 4, 5, 5, 0], default: true }],
  'D7(b9)':     [{ frets: [-1, 5, 4, 5, 4, 5], default: true }],
  'D7(b9/13)':  [{ frets: [-1, 5, 4, 5, 4, 7], default: true }],
  'D7(#5)':     [{ frets: [-1, -1, 0, 3, 1, 2], default: true }],
  'E7(b9)':     [{ frets: [0, 2, 0, 1, 0, 1], default: true }],
  'G7(#5)':     [{ frets: [3, 2, 1, 0, 0, 1], default: true }],
  'F7(9)':      [{ frets: [1, 0, 1, 0, 1, 1], default: true }],
  'Gm7(9)':     [{ frets: [3, 0, 3, 3, 3, 3], default: true }],
  'Cm7(9)':     [{ frets: [-1, 3, 1, 3, 3, 3], default: true }],
  'Cm7(b5)':    [{ frets: [-1, 3, 1, 3, 1, 2], default: true }],
  'C7M(9)':     [{ frets: [-1, 3, 0, 0, 0, 0], default: true }],
  'C6(9)':      [{ frets: [-1, 3, 0, 2, 3, 0], default: true }],
  'Db7M(9)':    [{ frets: [-1, 4, 1, 1, 1, 1], default: true }],
  'Bb6(9)':     [{ frets: [-1, 1, 0, 0, 1, 1], default: true }],
  'A7(13)':     [{ frets: [-1, 0, 2, 0, 2, 2], default: true }],
  'A7(b13)':    [{ frets: [-1, 0, 2, 0, 2, 1], default: true }],
  'A7(b9)':     [{ frets: [-1, 0, 2, 3, 2, 3], default: true }],
  'Am(7M)':     [{ frets: [-1, 0, 2, 1, 1, 0], default: true }],
  'F7(4/9)':    [{ frets: [1, -1, 1, 3, 1, 3], default: true }],
  'E7(4/9)':    [{ frets: [0, 0, 0, 2, 0, 2], default: true }],
  'Bb7(4/9)':   [{ frets: [6, -1, 6, 8, 6, 8], default: true }],
};

export function catalogShapes(name) {
  return CATALOG[name] ? CATALOG[name].slice() : [];
}

export function catalogDefault(name) {
  const v = CATALOG[name];
  if (!v || !v.length) return null;
  return v.find((s) => s.default) || v[0];
}
