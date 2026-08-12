// colisao.test.js — o qualificador que distingue duas músicas de mesmo título.
//
// A regra tem um lado invisível que é o mais importante: fora de colisão a
// função retorna '' e a listagem não muda em NADA. O sufixo '(v2)' no título
// existia porque essa informação não tinha onde aparecer; agora tem, e sai do
// título — que volta a ser só o título, para busca e ordenação.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { qualificadorDe, chaveDeColisao, SEM_FONTE } from '../js/state.js';

// createdAt entra porque o desempate ordinal usa ele; id desempata o empate.
const song = (id, artistId, title, fonte = '', createdAt = 0) =>
  ({ id, artistId, title, fonte, createdAt });

test('título único não ganha qualificador nenhum', () => {
  const songs = [song('a', 'gil', 'Aquele Abraço', 'CifraClub')];
  assert.equal(qualificadorDe(songs[0], songs), '');
});

test('mesmo título no mesmo artista qualifica pelos dois lados', () => {
  const songs = [
    song('a', 'caetano', 'Sampa', 'CifraClub'),
    song('b', 'caetano', 'Sampa', 'VJ'),
  ];
  assert.equal(qualificadorDe(songs[0], songs), 'CifraClub');
  assert.equal(qualificadorDe(songs[1], songs), 'VJ');
});

test('mesmo título em artistas diferentes NÃO é colisão', () => {
  const songs = [
    song('a', 'caetano', 'Sampa', 'CifraClub'),
    song('b', 'outro', 'Sampa', 'VJ'),
  ];
  assert.equal(qualificadorDe(songs[0], songs), '');
  assert.equal(qualificadorDe(songs[1], songs), '');
});

test('título com caixa e espaço diferentes colide como o usuário espera', () => {
  const songs = [
    song('a', 'caetano', 'Sampa', 'CifraClub'),
    song('b', 'caetano', ' sampa ', 'VJ'),
  ];
  assert.equal(qualificadorDe(songs[0], songs), 'CifraClub');
  assert.equal(qualificadorDe(songs[1], songs), 'VJ');
});

test('três fontes com o mesmo título qualificam as três', () => {
  const songs = [
    song('a', 'gil', 'Domingo no Parque', 'CifraClub'),
    song('b', 'gil', 'Domingo no Parque', 'Songbook'),
    song('c', 'gil', 'Domingo no Parque', 'VJ'),
  ];
  assert.deepEqual(songs.map((s) => qualificadorDe(s, songs)),
    ['CifraClub', 'Songbook', 'VJ']);
});

test('só um lado com fonte: o outro cai no sentinela de sem-fonte', () => {
  const songs = [
    song('a', 'caetano', 'Sampa', ''),
    song('b', 'caetano', 'Sampa', 'VJ'),
  ];
  assert.equal(qualificadorDe(songs[0], songs), SEM_FONTE);
  assert.equal(qualificadorDe(songs[1], songs), 'VJ');
});

test('nenhum lado com fonte cai no ordinal, por createdAt', () => {
  const songs = [
    song('a', 'caetano', 'Sampa', '', 200),
    song('b', 'caetano', 'Sampa', '', 100),
  ];
  assert.equal(qualificadorDe(songs[1], songs), '1'); // mais antiga
  assert.equal(qualificadorDe(songs[0], songs), '2');
});

test('ordinal com createdAt empatado desempata por id, sem indeterminação', () => {
  const songs = [
    song('b', 'caetano', 'Sampa', '', 100),
    song('a', 'caetano', 'Sampa', '', 100),
  ];
  assert.equal(qualificadorDe(songs[1], songs), '1'); // id 'a'
  assert.equal(qualificadorDe(songs[0], songs), '2'); // id 'b'
});

test('mesma fonte nos dois lados ainda qualifica — é o que existe para mostrar', () => {
  const songs = [
    song('a', 'caetano', 'Sampa', 'CifraClub'),
    song('b', 'caetano', 'Sampa', 'CifraClub'),
  ];
  assert.equal(qualificadorDe(songs[0], songs), 'CifraClub');
});

test('lista vazia ou música solta não quebram', () => {
  assert.equal(qualificadorDe(song('a', 'gil', 'X'), []), '');
  assert.equal(qualificadorDe(song('a', 'gil', 'X'), null), '');
});

test('a chave de colisão junta artista e título normalizado', () => {
  assert.equal(
    chaveDeColisao(song('a', 'gil', ' Sampa ')),
    chaveDeColisao(song('b', 'gil', 'sampa')),
  );
  assert.notEqual(
    chaveDeColisao(song('a', 'gil', 'Sampa')),
    chaveDeColisao(song('b', 'caetano', 'Sampa')),
  );
});
