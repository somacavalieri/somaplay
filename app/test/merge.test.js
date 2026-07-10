import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergePlan } from '../js/merge.js';

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
