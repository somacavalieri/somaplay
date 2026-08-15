// partes.test.js — o vocabulário de "sobre o que este arquivo fala".
//
// A asserção que mais importa é a primeira: com todas as partes, o registro sai
// IDÊNTICO. É ela que garante que o backup completo — o caminho que todo
// usuário já usa — não regrediu quando as partes entraram.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { podaPorPartes, fundeMusica, PARTES_TODAS } from '../js/partes.js';

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

// --- a fusão -------------------------------------------------------------
// A regra inteira: um campo de parte NÃO declarada nunca é tocado. É o que faz
// o pacote de áudio sobreviver a um arquivo leve importado depois, e as
// favoritas de quem recebe sobreviverem a uma atualização de repertório.
const CIFRA_VAZIA = { tipo: null, imagens: [], texto: '', acordes: [], digitacoes: {} };

test('arquivo leve não encosta no áudio que já existe', () => {
  const atual = musica();
  const leve = { id: 's1', artistId: 'ar1', title: 'Aquele Abraço', tom: 'E', cifra: { tipo: 'texto', texto: 'E B7' } };
  const out = fundeMusica(atual, leve, ['cifra']);
  assert.equal(out.tom, 'E');
  assert.equal(out.cifra.texto, 'E B7');
  assert.deepEqual(out.stems, atual.stems);
});

test('arquivo compartilhado não encosta nas favoritas de quem recebe', () => {
  const atual = { ...musica(), favorita: true };
  const compartilhado = { id: 's1', artistId: 'ar1', title: 'Aquele Abraço', favorita: false, tom: 'E' };
  const out = fundeMusica(atual, compartilhado, ['cifra']);
  assert.equal(out.favorita, true);
  assert.equal(out.tom, 'E');
});

test('pacote de áudio não encosta na cifra que já existe', () => {
  const atual = musica();
  const pacote = { id: 's1', artistId: 'ar1', title: 'Aquele Abraço', stems: [{ blobId: 'novo', vol: 80 }] };
  const out = fundeMusica(atual, pacote, ['audio']);
  assert.deepEqual(out.stems, [{ blobId: 'novo', vol: 80 }]);
  assert.equal(out.cifra.texto, 'D A7');
  assert.equal(out.letra, 'la la');
});

test('backup completo sobrescreve tudo', () => {
  const atual = musica();
  const doBackup = { ...musica(), tom: 'G', favorita: false, stems: [] };
  const out = fundeMusica(atual, doBackup, PARTES_TODAS);
  assert.equal(out.tom, 'G');
  assert.equal(out.favorita, false);
  assert.deepEqual(out.stems, []);
});

test('música nova de pacote de áudio nasce com cifra VAZIA, nunca ausente', () => {
  const pacote = { id: 'novo', artistId: 'ar1', title: 'Refazenda', stems: [{ blobId: 'a' }] };
  const out = fundeMusica(null, pacote, ['audio']);
  assert.deepEqual(out.cifra, CIFRA_VAZIA);
  assert.deepEqual(out.stems, [{ blobId: 'a' }]);
});

test('música nova de arquivo leve mantém a cifra que veio', () => {
  const leve = { id: 'novo', artistId: 'ar1', title: 'Refazenda', cifra: { tipo: 'texto', texto: 'C G' } };
  const out = fundeMusica(null, leve, ['cifra']);
  assert.equal(out.cifra.texto, 'C G');
});

// A PROPRIEDADE que sustenta a extensão: as duas ordens chegam no mesmo lugar.
// Se este teste cair, o pacote de áudio deixou de ser uma extensão.
test('leve→pacote e pacote→leve chegam no mesmo registro', () => {
  const leve = { id: 's9', artistId: 'ar1', title: 'Domingo no Parque', tom: 'A', cifra: { tipo: 'texto', texto: 'A E' }, letra: 'oi', estilo: 'MPB', fonte: 'VJ' };
  const pacote = { id: 's9', artistId: 'ar1', title: 'Domingo no Parque', stems: [{ blobId: 'x', vol: 70 }], full: [] };

  const leveDepoisPacote = fundeMusica(fundeMusica(null, leve, ['cifra']), pacote, ['audio']);
  const pacoteDepoisLeve = fundeMusica(fundeMusica(null, pacote, ['audio']), leve, ['cifra']);

  assert.deepEqual(leveDepoisPacote, pacoteDepoisLeve);
  assert.equal(leveDepoisPacote.cifra.texto, 'A E');
  assert.deepEqual(leveDepoisPacote.stems, [{ blobId: 'x', vol: 70 }]);
});

test('partes vazio não explode: só a identidade e a invariante da cifra', () => {
  const out = fundeMusica(null, { id: 'z', artistId: 'a', title: 'T', tom: 'C' }, []);
  assert.equal(out.id, 'z');
  assert.ok(!('tom' in out));
  assert.deepEqual(out.cifra, CIFRA_VAZIA);
});

test('não muta nenhum dos dois lados', () => {
  const atual = musica();
  const doArquivo = { id: 's1', artistId: 'ar1', title: 'X', stems: [] };
  fundeMusica(atual, doArquivo, ['audio']);
  assert.equal(atual.stems.length, 1);
  assert.equal(atual.title, 'Aquele Abraço');
});
