// chords-catalog.js — catálogo de formas (voicings). Um nome tem 1..n variações;
// a marcada `default:true` (ou a primeira) é a padrão. Só-leitura em runtime (MVP);
// cresce no repo à medida que músicas são importadas.
// forma: { frets:[Mi grave, Lá, Ré, Sol, Si, Mi agudo], barre?:{fret,from,to}, label?, default? }

export const CATALOG = {
  // — semente: formas antes embutidas em chords.js (cada uma vira a padrão do seu nome) —
  'C':    [{ frets: [-1, 3, 2, 0, 1, 0], default: true }],
  'C#m':  [{ frets: [-1, 4, 6, 6, 5, 4], barre: { fret: 4, from: 1, to: 5 }, default: true }],
  'D':    [{ frets: [-1, -1, 0, 2, 3, 2], default: true }],
  'D7':   [{ frets: [-1, -1, 0, 2, 1, 2], default: true }],
  'Dm':   [{ frets: [-1, -1, 0, 2, 3, 1], default: true }],
  'Dm7':  [{ frets: [-1, -1, 0, 2, 1, 1], default: true }],
  'D#m':  [{ frets: [-1, 6, 8, 8, 7, 6], barre: { fret: 6, from: 1, to: 5 }, default: true }],
  'E':    [{ frets: [0, 2, 2, 1, 0, 0], default: true }],
  'Em':   [{ frets: [0, 2, 2, 0, 0, 0], default: true }],
  'Em7':  [{ frets: [0, 2, 0, 0, 0, 0], default: true }],
  'E7':   [{ frets: [0, 2, 0, 1, 0, 0], label: 'simples', default: true },
           { frets: [0, 2, 2, 1, 3, 0], label: 'com 3ª e 7ª' }],
  'F':    [{ frets: [1, 3, 3, 2, 1, 1], barre: { fret: 1, from: 0, to: 5 }, default: true }],
  'F#':   [{ frets: [2, 4, 4, 3, 2, 2], barre: { fret: 2, from: 0, to: 5 }, default: true }],
  'F#m':  [{ frets: [2, 4, 4, 2, 2, 2], barre: { fret: 2, from: 0, to: 5 }, default: true }],
  'G':    [{ frets: [3, 2, 0, 0, 0, 3], default: true }],
  'G7':   [{ frets: [3, 2, 0, 0, 0, 1], default: true }],
  'G/B':  [{ frets: [-1, 2, 0, 0, 3, 3], default: true }],
  'G#m':  [{ frets: [4, 6, 6, 4, 4, 4], barre: { fret: 4, from: 0, to: 5 }, default: true }],
  'Gmaj7':[{ frets: [3, 2, 0, 0, 0, 2], default: true }],
  'G7M':  [{ frets: [3, 2, 0, 0, 0, 2], default: true }],
  'Gm':   [{ frets: [3, 5, 5, 3, 3, 3], barre: { fret: 3, from: 0, to: 5 }, default: true }],
  'D7/C': [{ frets: [-1, 3, 0, 2, 1, 2], default: true }],
  'A':    [{ frets: [-1, 0, 2, 2, 2, 0], default: true }],
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
};

export function catalogShapes(name) {
  return CATALOG[name] ? CATALOG[name].slice() : [];
}

export function catalogDefault(name) {
  const v = CATALOG[name];
  if (!v || !v.length) return null;
  return v.find((s) => s.default) || v[0];
}
