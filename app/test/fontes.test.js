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
  fonteCasaAlguma, toggleFonte, podaFontes, contagensPorFonte,
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

// ---------- multisseleção: casamento com um conjunto de fontes ----------

test('array de filtros vazio passa qualquer música', () => {
  assert.equal(fonteCasaAlguma('VJ', []), true);
  assert.equal(fonteCasaAlguma('', []), true);
  assert.equal(fonteCasaAlguma('VJ', undefined), true);
});

test('duas fontes marcadas passam as duas e barram a terceira', () => {
  const f = ['CifraClub', 'VJ'];
  assert.equal(fonteCasaAlguma('CifraClub', f), true);
  assert.equal(fonteCasaAlguma('VJ', f), true);
  assert.equal(fonteCasaAlguma('Songbook', f), false);
});

test('grafia divergente casa dentro do conjunto', () => {
  assert.equal(fonteCasaAlguma('songbook ', ['Songbook']), true);
});

test('SEM_FONTE dentro do conjunto pega só as músicas sem fonte', () => {
  assert.equal(fonteCasaAlguma('', [SEM_FONTE]), true);
  assert.equal(fonteCasaAlguma('VJ', [SEM_FONTE]), false);
  assert.equal(fonteCasaAlguma('VJ', [SEM_FONTE, 'VJ']), true);
});

// ---------- a regra de clique ----------

const bib = (...nomes) => nomes.map((nome) => ({ nome, n: 1 }));

test('primeiro clique a partir de Todas isola a fonte', () => {
  assert.deepEqual(toggleFonte([], 'CifraClub', bib('CifraClub', 'VJ', 'RV')), ['CifraClub']);
});

test('clique seguinte soma a fonte ao conjunto', () => {
  assert.deepEqual(toggleFonte(['CifraClub'], 'VJ', bib('CifraClub', 'VJ', 'RV')), ['CifraClub', 'VJ']);
});

test('clicar numa fonte marcada remove ela', () => {
  assert.deepEqual(toggleFonte(['CifraClub', 'VJ'], 'VJ', bib('CifraClub', 'VJ', 'RV')), ['CifraClub']);
});

test('tirar a última fonte volta para Todas', () => {
  assert.deepEqual(toggleFonte(['VJ'], 'VJ', bib('CifraClub', 'VJ', 'RV')), []);
});

test('marcar todas as fontes da biblioteca colapsa para Todas', () => {
  assert.deepEqual(toggleFonte(['CifraClub', 'VJ'], 'RV', bib('CifraClub', 'VJ', 'RV')), []);
});

test('a regra de clique compara por grafia, e guarda a grafia recebida', () => {
  assert.deepEqual(toggleFonte(['Songbook'], 'songbook ', bib('Songbook', 'VJ')), []);
  assert.deepEqual(toggleFonte([], 'songbook ', bib('Songbook', 'VJ')), ['songbook ']);
});

// ---------- poda no boot ----------

test('grafia órfã cai fora da seleção salva', () => {
  assert.deepEqual(podaFontes(['VJ', 'Fonte Apagada'], bib('VJ', 'RV')), ['VJ']);
});

test('grafia divergente se corrige para a da biblioteca', () => {
  assert.deepEqual(podaFontes(['songbook '], bib('Songbook')), ['Songbook']);
});

test('seleção inteiramente órfã volta para Todas', () => {
  assert.deepEqual(podaFontes(['Fonte Apagada'], bib('VJ')), []);
});

test('seleção vazia continua vazia, e a poda não inventa fonte', () => {
  assert.deepEqual(podaFontes([], bib('VJ', 'RV')), []);
  assert.deepEqual(podaFontes(undefined, bib('VJ')), []);
});

test('a poda não duplica quando duas grafias salvas apontam para a mesma fonte', () => {
  assert.deepEqual(podaFontes(['VJ', 'vj'], bib('VJ')), ['VJ']);
});

// ---------- contagens das pílulas ----------

const m = (title, fonte, extra = {}) => ({ title, fonte, artistId: 'a1', ...extra });
const nomeFixo = () => 'Gil';

test('sem busca nem modo, a contagem é a da biblioteca', () => {
  const songs = [m('Aquele Abraço', 'VJ'), m('Domingo', 'VJ'), m('Drão', 'RV')];
  const { itens, total } = contagensPorFonte(songs, { nomeDoArtista: nomeFixo });
  assert.deepEqual(itens, [{ nome: 'VJ', n: 2 }, { nome: 'RV', n: 1 }]);
  assert.equal(total, 3);
});

test('a busca reduz as contagens mas não o conjunto de pílulas', () => {
  const songs = [m('Aquele Abraço', 'VJ'), m('Domingo', 'VJ'), m('Drão', 'RV')];
  const { itens, total } = contagensPorFonte(songs, { query: 'dr', nomeDoArtista: nomeFixo });
  assert.deepEqual(itens, [{ nome: 'VJ', n: 0 }, { nome: 'RV', n: 1 }]);
  assert.equal(total, 1);
});

test('a busca também casa pelo nome do artista', () => {
  const songs = [m('Drão', 'RV')];
  const { total } = contagensPorFonte(songs, { query: 'gil', nomeDoArtista: nomeFixo });
  assert.equal(total, 1);
});

test('a lente de modos reduz as contagens', () => {
  const songs = [
    m('Aquele Abraço', 'VJ', { stems: [{ id: 's1' }] }),
    m('Domingo', 'VJ'),
  ];
  const { itens, total } = contagensPorFonte(songs, { modeFilter: ['T2'], nomeDoArtista: nomeFixo });
  assert.deepEqual(itens, [{ nome: 'VJ', n: 1 }]);
  assert.equal(total, 1);
});

test('SEM_FONTE entra por último, com a contagem das músicas sem fonte', () => {
  const songs = [m('Drão', 'RV'), m('Palco', ''), m('Refazenda', '  ')];
  const { itens, total } = contagensPorFonte(songs, { nomeDoArtista: nomeFixo });
  assert.deepEqual(itens, [{ nome: 'RV', n: 1 }, { nome: SEM_FONTE, n: 2 }]);
  assert.equal(total, 3);
});

test('o total é sempre a soma dos itens', () => {
  const songs = [m('a', 'VJ'), m('b', 'RV'), m('c', ''), m('d', 'VJ')];
  const { itens, total } = contagensPorFonte(songs, { nomeDoArtista: nomeFixo });
  assert.equal(itens.reduce((acc, i) => acc + i.n, 0), total);
});

test('grafias divergentes da mesma fonte somam na mesma pílula', () => {
  const songs = [m('a', 'Songbook'), m('b', 'songbook'), m('c', 'SONGBOOK ')];
  const { itens } = contagensPorFonte(songs, { nomeDoArtista: nomeFixo });
  assert.deepEqual(itens, [{ nome: 'Songbook', n: 3 }]);
});

test('a ordem das pílulas não muda quando a busca entra', () => {
  const songs = [m('Drão', 'RV'), m('Palco', ''), m('Refazenda', ''), m('Retiros', '')];
  const nomes = (opts) => contagensPorFonte(songs, { nomeDoArtista: nomeFixo, ...opts }).itens.map((i) => i.nome);
  assert.deepEqual(nomes({}), nomes({ query: 'dr' }));
});
