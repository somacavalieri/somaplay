// musica.mjs — the demo song, in one place: the record the generator writes
// into the .somaplay, and nothing else reads.
//
// The ids are FIXED, not uid(): loading the demo twice has to land on the same
// song instead of a second copy. The fields follow CAMPOS (app/js/partes.js) for
// the parts this file declares — cifra and audio — so nothing belonging to
// `pessoal` (favorita, createdAt) travels: the import stamps those itself.
export const ARTISTA = { id: 'demo-artista', name: 'Demonstração', av: 'amber' };

// Written for this project. The app ships no chart, lyric or recording it does
// not own, and that rule covers the demo.
const CIFRA = `[Groove · 100 bpm]
Am              F
  Toca junto e ouve o mix
C               G
  Cada canal no seu lugar
Am              F
  Sobe o baixo, tira a voz
C               G
  A levada vai rolar

[Refrão]
Am        F
  Play, pause e seek
C         G
  Tudo em sincronia`;

const LETRA = `Toca junto e ouve o mix
Cada canal no seu lugar
Sobe o baixo, tira a voz
A levada vai rolar

Play, pause e seek
Tudo em sincronia`;

// `name` is what the mixer shows; `arquivo` is the source on disk.
export const STEMS = [
  { id: 'demo-baixo', name: 'Baixo', arquivo: 'baixo.mp3', vol: 80 },
  { id: 'demo-violao', name: 'Violão', arquivo: 'violao.mp3', vol: 80 },
  { id: 'demo-piano', name: 'Piano', arquivo: 'piano.mp3', vol: 80 },
  { id: 'demo-bateria', name: 'Bateria', arquivo: 'bateria.mp3', vol: 80 },
];

export const MUSICA = {
  id: 'demo-groove-de-teste',
  artistId: ARTISTA.id,
  title: 'Groove de teste',
  tom: 'Am',
  fonte: 'Demo',
  estilo: 'Groove',
  cifra: { tipo: 'texto', texto: CIFRA, digitacoes: null, acordes: ['Am', 'F', 'C', 'G'] },
  letra: LETRA,
  full: [],
};
