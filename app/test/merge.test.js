import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergePlan } from '../js/merge.js';
import { PARTES_TODAS } from '../js/partes.js';

test('upsert por id: música existente atualiza, nova adiciona', () => {
  const existing = { artists: [{ id: 'a1', name: 'X' }], songs: [{ id: 's1', artistId: 'a1', title: 'Old' }], lists: [] };
  const incoming = { artists: [{ id: 'a1', name: 'X' }], songs: [{ id: 's1', artistId: 'a1', title: 'New' }, { id: 's2', artistId: 'a1', title: 'Nova' }], lists: [] };
  const p = mergePlan(existing, incoming);
  assert.equal(p.added, 1);
  assert.equal(p.updated, 1);
  assert.equal(p.songs.find((s) => s.id === 's1').title, 'New');
});

test('dedup de artista por nome + remap de artistId', () => {
  const existing = { artists: [{ id: 'DEV', name: 'Noel Rosa' }], songs: [], lists: [] };
  const incoming = { artists: [{ id: 'BKP', name: 'Noel Rosa' }], songs: [{ id: 's9', artistId: 'BKP', title: 'As Pastorinhas' }], lists: [] };
  const p = mergePlan(existing, incoming);
  assert.equal(p.artists.length, 0);          // não regrava o duplicado
  assert.equal(p.songs[0].artistId, 'DEV');   // remapeia pro id do aparelho
  assert.equal(p.added, 1);
});

test('artista novo é adicionado; suas músicas mantêm o id', () => {
  const existing = { artists: [], songs: [], lists: [] };
  const incoming = { artists: [{ id: 'NEW', name: 'Cartola' }], songs: [{ id: 's1', artistId: 'NEW', title: 'Disfarça' }], lists: [] };
  const p = mergePlan(existing, incoming);
  assert.equal(p.artists.length, 1);
  assert.equal(p.songs[0].artistId, 'NEW');
  assert.equal(p.added, 1);
});

test('campos ausentes não quebram', () => {
  assert.deepEqual(mergePlan({}, {}),
    { artists: [], songs: [], lists: [], books: [], booksAdded: 0, added: 0, updated: 0, remap: {} });
});

// --- partes ----------------------------------------------------------------
// mergePlan passa a devolver a música FUNDIDA com a que já existe, e não a do
// arquivo. Quem grava (importLibrary) continua fazendo DB.putSong do que vem
// daqui — a fusão é que mudou de lugar.
const comAudio = () => ({
  artists: [{ id: 'a1', name: 'Gil' }],
  songs: [{ id: 's1', artistId: 'a1', title: 'Aquele Abraço', tom: 'D', favorita: true,
            cifra: { tipo: 'texto', texto: 'D A7', imagens: [], acordes: [], digitacoes: {} },
            stems: [{ blobId: 'aud1', vol: 60 }] }],
  lists: [],
});

test('manifest sem partes se comporta como arquivo completo', () => {
  const incoming = {
    artists: [{ id: 'a1', name: 'Gil' }],
    songs: [{ id: 's1', artistId: 'a1', title: 'Novo', tom: 'E', stems: [], favorita: false }],
    lists: [],
  };
  const p = mergePlan(comAudio(), incoming);
  assert.equal(p.songs[0].title, 'Novo');
  assert.equal(p.songs[0].tom, 'E');
  // As duas asserções que fazem o teste discriminar: sem `partes`, o arquivo
  // fala de TODAS as partes. Se o default virasse ['cifra'], as duas quebram —
  // e é esse default que faz todo .somaplay anterior a esta branch importar
  // exatamente como importava.
  assert.deepEqual(p.songs[0].stems, []);
  assert.equal(p.songs[0].favorita, false);
});

test('arquivo leve não apaga o áudio nem a favorita de quem recebe', () => {
  const incoming = {
    partes: ['cifra'],
    artists: [{ id: 'a1', name: 'Gil' }],
    songs: [{ id: 's1', artistId: 'a1', title: 'Aquele Abraço', tom: 'E', cifra: { tipo: 'texto', texto: 'E B7' } }],
    lists: [],
  };
  const p = mergePlan(comAudio(), incoming);
  assert.deepEqual(p.songs[0].stems, [{ blobId: 'aud1', vol: 60 }]);
  assert.equal(p.songs[0].favorita, true);
  assert.equal(p.songs[0].cifra.texto, 'E B7');
  assert.equal(p.updated, 1);
  assert.equal(p.added, 0);
});

test('pacote de áudio não apaga a cifra de quem recebe', () => {
  const incoming = {
    partes: ['audio'],
    artists: [{ id: 'a1', name: 'Gil' }],
    songs: [{ id: 's1', artistId: 'a1', title: 'Aquele Abraço', stems: [{ blobId: 'novo', vol: 80 }] }],
    lists: [],
  };
  const p = mergePlan(comAudio(), incoming);
  assert.deepEqual(p.songs[0].stems, [{ blobId: 'novo', vol: 80 }]);
  assert.equal(p.songs[0].cifra.texto, 'D A7');
});

test('música nova de pacote de áudio nasce com cifra vazia e artista remapeado', () => {
  const existing = { artists: [{ id: 'DEV', name: 'Gil' }], songs: [], lists: [] };
  const incoming = {
    partes: ['audio'],
    artists: [{ id: 'BKP', name: 'Gil' }],
    songs: [{ id: 's7', artistId: 'BKP', title: 'Refazenda', stems: [{ blobId: 'x' }] }],
    lists: [],
  };
  const p = mergePlan(existing, incoming);
  assert.equal(p.added, 1);
  assert.equal(p.songs[0].artistId, 'DEV');
  assert.deepEqual(p.songs[0].cifra, { tipo: null, imagens: [], texto: '', acordes: [], digitacoes: {} });
});

test('backup completo continua sobrescrevendo tudo', () => {
  const incoming = {
    partes: PARTES_TODAS,
    artists: [{ id: 'a1', name: 'Gil' }],
    songs: [{ id: 's1', artistId: 'a1', title: 'Aquele Abraço', tom: 'G', favorita: false, stems: [], cifra: { tipo: 'texto', texto: 'G D' } }],
    lists: [],
  };
  const p = mergePlan(comAudio(), incoming);
  assert.equal(p.songs[0].tom, 'G');
  assert.equal(p.songs[0].favorita, false);
  assert.deepEqual(p.songs[0].stems, []);
});

test('o remap alcança o registro fundido de uma música que o aparelho já tem', () => {
  const existing = {
    artists: [{ id: 'DEV', name: 'Gil' }],
    songs: [{ id: 's1', artistId: 'OLD', title: 'Aquele Abraço', tom: 'D',
              cifra: { tipo: 'texto', texto: 'D A7', imagens: [], acordes: [], digitacoes: {} } }],
    lists: [],
  };
  const incoming = {
    partes: ['cifra'],
    artists: [{ id: 'BKP', name: 'Gil' }],
    songs: [{ id: 's1', artistId: 'BKP', title: 'Aquele Abraço', tom: 'E' }],
    lists: [],
  };
  const p = mergePlan(existing, incoming);
  assert.equal(p.songs[0].artistId, 'DEV');
  assert.equal(p.songs[0].tom, 'E');
  assert.equal(p.updated, 1);
});

// O relógio do import atravessa o plano. Um Date.now() por música faria o
// repertório escorrer alguns milissegundos e chegar embaralhado no topo de
// Recentes; um só, injetado, faz o lote inteiro chegar junto.
test('o relógio do import carimba as músicas novas que chegaram sem data', () => {
  const AGORA = 1800000000000;
  const existing = { artists: [], songs: [], lists: [] };
  const incoming = {
    partes: ['cifra'],
    artists: [{ id: 'a1', name: 'Gil' }],
    songs: [
      { id: 's1', artistId: 'a1', title: 'Aquele Abraço', tom: 'D' },
      { id: 's2', artistId: 'a1', title: 'Refazenda', tom: 'C' },
    ],
    lists: [],
  };
  const p = mergePlan(existing, incoming, AGORA);
  assert.equal(p.songs[0].createdAt, AGORA);
  assert.equal(p.songs[1].createdAt, AGORA);   // o LOTE inteiro, com a mesma data
});

test('o relógio não encosta em quem já tinha data', () => {
  const AGORA = 1800000000000;
  const existing = { artists: [], songs: [{ id: 's1', artistId: 'a1', title: 'X', createdAt: 1700000000000 }], lists: [] };
  const incoming = { partes: ['cifra'], artists: [], songs: [{ id: 's1', artistId: 'a1', title: 'X', tom: 'E' }], lists: [] };
  assert.equal(mergePlan(existing, incoming, AGORA).songs[0].createdAt, 1700000000000);
});

// O quarto leitor de `partes`, que era o único sem guarda: um arquivo corrompido
// derrubava o merge aqui dentro em vez de ser lido como completo.
test('um partes corrompido no manifest não derruba o merge', () => {
  const incoming = {
    partes: 'cifra',
    artists: [{ id: 'a1', name: 'Gil' }],
    songs: [{ id: 's1', artistId: 'a1', title: 'Aquele Abraço', tom: 'D', favorita: true }],
    lists: [],
  };
  const p = mergePlan({ artists: [], songs: [], lists: [] }, incoming);
  assert.equal(p.songs[0].tom, 'D');
  assert.equal(p.songs[0].favorita, true);     // lido como arquivo completo
});
