// partes.test.js — o vocabulário de "sobre o que este arquivo fala".
//
// A asserção que mais importa é a primeira: com todas as partes, o registro sai
// IDÊNTICO. É ela que garante que o backup completo — o caminho que todo
// usuário já usa — não regrediu quando as partes entraram.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { podaPorPartes, PARTES_TODAS } from '../js/partes.js';

const musica = () => ({
  id: 's1', artistId: 'ar1', title: 'Aquele Abraço',
  tom: 'D', estilo: 'Samba', fonte: 'Songbook', letra: 'la la',
  cifra: { tipo: 'texto', imagens: [{ blobId: 'img1' }], texto: 'D A7', acordes: ['D'], digitacoes: {} },
  stems: [{ blobId: 'aud1', name: 'violao', vol: 60, mute: false }],
  full: [{ id: 'f1', blobId: 'aud2' }],
  favorita: true, createdAt: 1700000000000,
});

test('todas as partes devolvem o registro idêntico', () => {
  const m = musica();
  assert.deepEqual(podaPorPartes([m], PARTES_TODAS), [m]);
});

test('partes nulo significa todas', () => {
  const m = musica();
  assert.deepEqual(podaPorPartes([m], null), [m]);
});

test('a identidade viaja em qualquer parte', () => {
  for (const p of PARTES_TODAS) {
    const [out] = podaPorPartes([musica()], [p]);
    assert.equal(out.id, 's1');
    assert.equal(out.artistId, 'ar1');
    assert.equal(out.title, 'Aquele Abraço');
  }
});

test('cifra leva o conteúdo e não leva áudio nem pessoal', () => {
  const [out] = podaPorPartes([musica()], ['cifra']);
  assert.equal(out.tom, 'D');
  assert.equal(out.estilo, 'Samba');
  assert.equal(out.fonte, 'Songbook');
  assert.equal(out.letra, 'la la');
  assert.equal(out.cifra.texto, 'D A7');
  assert.ok(!('stems' in out));
  assert.ok(!('full' in out));
  assert.ok(!('favorita' in out));
  assert.ok(!('createdAt' in out));
});

test('audio leva os stems com a mixagem dentro', () => {
  const [out] = podaPorPartes([musica()], ['audio']);
  assert.deepEqual(out.stems, [{ blobId: 'aud1', name: 'violao', vol: 60, mute: false }]);
  assert.deepEqual(out.full, [{ id: 'f1', blobId: 'aud2' }]);
  assert.ok(!('cifra' in out));
  assert.ok(!('letra' in out));
  assert.ok(!('estilo' in out));
  assert.ok(!('fonte' in out));
  assert.ok(!('favorita' in out));
});

test('pessoal leva só favorita e createdAt', () => {
  const [out] = podaPorPartes([musica()], ['pessoal']);
  assert.equal(out.favorita, true);
  assert.equal(out.createdAt, 1700000000000);
  assert.ok(!('cifra' in out));
  assert.ok(!('stems' in out));
});

test('cifra + audio é o compartilhar pesado: tudo menos o pessoal', () => {
  const [out] = podaPorPartes([musica()], ['cifra', 'audio']);
  assert.ok('cifra' in out);
  assert.ok('stems' in out);
  assert.ok(!('favorita' in out));
});

test('campo ausente na música não vira undefined no recorte', () => {
  const [out] = podaPorPartes([{ id: 's2', artistId: 'ar1', title: 'X' }], ['cifra']);
  assert.deepEqual(out, { id: 's2', artistId: 'ar1', title: 'X' });
});

test('lista vazia e entradas ausentes não quebram', () => {
  assert.deepEqual(podaPorPartes([], ['cifra']), []);
  assert.deepEqual(podaPorPartes(null, ['cifra']), []);
  assert.deepEqual(podaPorPartes([musica()], []).length, 1);
});

test('não muta a música recebida', () => {
  const m = musica();
  podaPorPartes([m], ['audio']);
  assert.equal(m.cifra.texto, 'D A7');
  assert.equal(m.favorita, true);
});
