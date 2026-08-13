// fontes.test.js — os atalhos do campo Fonte no formulário de adicionar/editar.
//
// A lista não é escrita à mão: vem da biblioteca. O que este teste protege é a
// ordem (mais usadas primeiro), a dedupe por grafia (uma música salva com
// "cifraclub" não pode criar um segundo chip) e o corte, que conta os fixos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  fontesSugeridas, FONTES_FIXAS,
  fontesDaBiblioteca, fonteCasa, fonteOf, SEM_FONTE, songIdsDasFontes,
  corDaFonte,
} from '../js/state.js';

const song = (fonte) => ({ fonte });

test('biblioteca vazia mostra só os dois atalhos fixos', () => {
  assert.deepEqual(fontesSugeridas([]), ['CifraClub', 'Songbook']);
  assert.deepEqual(FONTES_FIXAS, ['CifraClub', 'Songbook']);
});

test('as fontes usadas vêm depois dos fixos, mais usadas primeiro', () => {
  const songs = [song('Real Book'), song('YouTube'), song('Real Book'), song('Real Book'), song('YouTube')];
  assert.deepEqual(fontesSugeridas(songs), ['CifraClub', 'Songbook', 'Real Book', 'YouTube']);
});

test('empate na contagem desempata em ordem alfabética', () => {
  const songs = [song('YouTube'), song('Real Book'), song('Ouvido')];
  assert.deepEqual(fontesSugeridas(songs), ['CifraClub', 'Songbook', 'Ouvido', 'Real Book', 'YouTube']);
});

test('grafia diferente da mesma fonte não vira chip novo', () => {
  const songs = [song('Real Book'), song('real book'), song('REAL BOOK  ')];
  assert.deepEqual(fontesSugeridas(songs), ['CifraClub', 'Songbook', 'Real Book']);
});

test('a primeira grafia encontrada é a que aparece', () => {
  const songs = [song('real book'), song('Real Book')];
  assert.deepEqual(fontesSugeridas(songs), ['CifraClub', 'Songbook', 'real book']);
});

test('uma fonte igual a um fixo não é duplicada, em qualquer caixa', () => {
  const songs = [song('cifraclub'), song('CifraClub'), song(' Songbook ')];
  assert.deepEqual(fontesSugeridas(songs), ['CifraClub', 'Songbook']);
});

test('fonte vazia, só espaço ou ausente é ignorada', () => {
  const songs = [song(''), song('   '), song(undefined), {}, song('Ouvido')];
  assert.deepEqual(fontesSugeridas(songs), ['CifraClub', 'Songbook', 'Ouvido']);
});

test('o corte conta os dois fixos', () => {
  const songs = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(song);
  assert.deepEqual(fontesSugeridas(songs), ['CifraClub', 'Songbook', 'A', 'B', 'C', 'D', 'E', 'F']);
  assert.equal(fontesSugeridas(songs).length, 8);
});

test('o limite é ajustável', () => {
  const songs = [song('Ouvido')];
  assert.deepEqual(fontesSugeridas(songs, 3), ['CifraClub', 'Songbook', 'Ouvido']);
  assert.deepEqual(fontesSugeridas(songs, 2), ['CifraClub', 'Songbook']);
});

// --- filtro por fonte (a lente) -------------------------------------------
// fontesSugeridas alimenta o formulário e crava CifraClub/Songbook mesmo sem
// uso. fontesDaBiblioteca alimenta o filtro e não crava nada: oferecer um
// filtro que não casa com nenhuma música é entregar uma tela vazia de bandeja.

test('biblioteca vazia não oferece nenhuma fonte para filtrar', () => {
  assert.deepEqual(fontesDaBiblioteca([]), []);
});

test('as fontes vêm ordenadas por uso, desempate alfabético', () => {
  const songs = [song('YouTube'), song('Real Book'), song('YouTube'), song('Ouvido')];
  assert.deepEqual(fontesDaBiblioteca(songs), [
    { nome: 'YouTube', n: 2 },
    { nome: 'Ouvido', n: 1 },
    { nome: 'Real Book', n: 1 },
  ]);
});

test('grafias diferentes contam para a mesma fonte, e a primeira aparece', () => {
  const songs = [song('real book'), song('Real Book'), song('REAL BOOK  ')];
  assert.deepEqual(fontesDaBiblioteca(songs), [{ nome: 'real book', n: 3 }]);
});

test('as músicas sem fonte viram um balde no fim da lista', () => {
  const songs = [song(''), song('   '), song(undefined), {}, song('Songbook')];
  assert.deepEqual(fontesDaBiblioteca(songs), [
    { nome: 'Songbook', n: 1 },
    { nome: SEM_FONTE, n: 4 },
  ]);
});

test('sem música sem fonte, o balde não aparece', () => {
  assert.deepEqual(fontesDaBiblioteca([song('Songbook')]), [{ nome: 'Songbook', n: 1 }]);
});

test('filtro nulo passa tudo', () => {
  assert.equal(fonteCasa('Songbook', null), true);
  assert.equal(fonteCasa('', null), true);
});

test('o filtro casa apesar da grafia', () => {
  assert.equal(fonteCasa('Songbook', 'songbook'), true);
  assert.equal(fonteCasa(' songbook ', 'Songbook'), true);
  assert.equal(fonteCasa('CifraClub', 'Songbook'), false);
});

test('o balde sem fonte só casa com quem não tem fonte', () => {
  assert.equal(fonteCasa('', SEM_FONTE), true);
  assert.equal(fonteCasa('   ', SEM_FONTE), true);
  assert.equal(fonteCasa('Songbook', SEM_FONTE), false);
});

test('fonteOf tira o espaço das pontas e tolera música sem o campo', () => {
  assert.equal(fonteOf({ fonte: '  Songbook ' }), 'Songbook');
  assert.equal(fonteOf({}), '');
  assert.equal(fonteOf(null), '');
});

// --- a seleção que a exportação usa ---------------------------------------
// O motor de export não sabe o que é fonte: ele recebe um conjunto de ids.
// Esta é a função que traduz o eixo "fonte" nesse conjunto — e é aqui que um
// eixo novo (artista, lista) entraria amanhã, sem tocar em backup.js.

test('nenhuma fonte marcada não seleciona nada', () => {
  assert.deepEqual([...songIdsDasFontes([{ id: 'a', fonte: 'Songbook' }], [])], []);
});

test('marca as músicas da fonte escolhida, apesar da grafia', () => {
  const songs = [
    { id: 'a', fonte: 'Songbook' },
    { id: 'b', fonte: ' songbook ' },
    { id: 'c', fonte: 'CifraClub' },
  ];
  assert.deepEqual([...songIdsDasFontes(songs, ['Songbook'])], ['a', 'b']);
});

test('o balde sem fonte pega só quem não tem fonte', () => {
  const songs = [{ id: 'a', fonte: 'Songbook' }, { id: 'b', fonte: '   ' }, { id: 'c' }];
  assert.deepEqual([...songIdsDasFontes(songs, [SEM_FONTE])], ['b', 'c']);
});

test('várias fontes somam, sem repetir id', () => {
  const songs = [
    { id: 'a', fonte: 'Songbook' },
    { id: 'b', fonte: 'CifraClub' },
    { id: 'c', fonte: 'VJ' },
  ];
  const sel = songIdsDasFontes(songs, ['Songbook', 'CifraClub']);
  assert.equal(sel.size, 2);
  assert.deepEqual([...sel], ['a', 'b']);
});

test('fonte que não existe mais na biblioteca não contribui e não quebra', () => {
  assert.deepEqual([...songIdsDasFontes([{ id: 'a', fonte: 'Songbook' }], ['Fonte Apagada'])], []);
});

test('devolve um Set, não um array', () => {
  assert.ok(songIdsDasFontes([], []) instanceof Set);
});

test('tolera biblioteca e seleção ausentes', () => {
  assert.equal(songIdsDasFontes(null, null).size, 0);
});

// corDaFonte: a cor do badge é função do NOME, não do ranking de uso — uso
// muda a cada import e a cor não pode dançar. Hash do lowercase: grafias da
// mesma fonte (regra de dedupe da biblioteca) recebem a mesma cor.
test('corDaFonte é determinística e ignora caixa e espaços', () => {
  assert.equal(corDaFonte('CifraClub'), corDaFonte('cifraclub'));
  assert.equal(corDaFonte('  Songbook  '), corDaFonte('songbook'));
  assert.equal(corDaFonte('VJ'), corDaFonte('vj'));
});

test('os três nomes reais do acervo caem nas cores do mockup', () => {
  assert.equal(corDaFonte('CifraClub'), 1); // f1 = âmbar
  assert.equal(corDaFonte('Songbook'), 2);  // f2 = teal
  assert.equal(corDaFonte('VJ'), 4);        // f4 = neutro
});

test('corDaFonte devolve sempre um índice inteiro 0–4', () => {
  for (const nome of ['', 'Real Book', 'YouTube', 'Ouvido', 'x', 'Bossa Nova 1 - Almir Chediak']) {
    const i = corDaFonte(nome);
    assert.ok(Number.isInteger(i) && i >= 0 && i <= 4, `${nome} → ${i}`);
  }
});
