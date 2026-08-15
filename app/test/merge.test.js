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
  assert.deepEqual(mergePlan({}, {}), { artists: [], songs: [], lists: [], added: 0, updated: 0, remap: {} });
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
  const incoming = { artists: [{ id: 'a1', name: 'Gil' }], songs: [{ id: 's1', artistId: 'a1', title: 'Novo', tom: 'E' }], lists: [] };
  const p = mergePlan(comAudio(), incoming);
  assert.equal(p.songs[0].title, 'Novo');
  assert.equal(p.songs[0].tom, 'E');
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
