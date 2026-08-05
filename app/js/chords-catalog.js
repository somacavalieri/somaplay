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
  'C#°':     [{ frets: [-1, 4, 5, 3, 5, 3], default: true }],
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
};

export function catalogShapes(name) {
  return CATALOG[name] ? CATALOG[name].slice() : [];
}

export function catalogDefault(name) {
  const v = CATALOG[name];
  if (!v || !v.length) return null;
  return v.find((s) => s.default) || v[0];
}
