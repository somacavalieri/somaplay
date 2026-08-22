// books.test.js — a lógica de livro que dá para testar sem navegador.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tituloDeArquivo, blobIdsDosLivros, fundeLivros } from '../js/books.js';
import { mergePlan } from '../js/merge.js';

test('tira a extensão e troca separador por espaço', () => {
  assert.equal(tituloDeArquivo('O-Melhor-de-Gonzaguinha.pdf'), 'O Melhor de Gonzaguinha');
  assert.equal(tituloDeArquivo('livro_de_cifras.PDF'), 'livro de cifras');
});

test('tira o id numérico que o Scribd cola na frente', () => {
  // Quase todo arquivo de chords/_a-identificar/ chega assim.
  assert.equal(tituloDeArquivo('555027200-The-Beatles-Essential-Songs.pdf'),
    'The Beatles Essential Songs');
  assert.equal(tituloDeArquivo('889817455-Michael-Jackson-Complete-Songbook.pdf'),
    'Michael Jackson Complete Songbook');
});

test('não come um número que é o título', () => {
  // "101 Músicas" é nome de songbook de verdade; o corte só vale para o id
  // longo do Scribd seguido de hífen.
  assert.equal(tituloDeArquivo('101-Musicas-do-Seculo-XX.pdf'), '101 Musicas do Seculo XX');
});

test('a fronteira do id do Scribd é 6 dígitos', () => {
  // O regex é /^\d{6,}[-_]/. Sem este teste, afrouxar para \d{4,} continuaria
  // verde nos dois testes acima (3 dígitos sobrevive, 9 dígitos é cortado) e
  // comeria o "1969-" de um nome de arquivo de verdade, tipo um ano de disco.
  // 5 dígitos ainda é título; 6 já é o id que o Scribd cola na frente.
  assert.equal(tituloDeArquivo('12345-Not-An-Id.pdf'), '12345 Not An Id');
  assert.equal(tituloDeArquivo('123456-Is-An-Id.pdf'), 'Is An Id');
});

test('nome vazio ou sem miolo devolve string vazia', () => {
  assert.equal(tituloDeArquivo(''), '');
  assert.equal(tituloDeArquivo('.pdf'), '');
  assert.equal(tituloDeArquivo(null), '');
});

test('colhe os dois blobs de cada livro, sem buraco', () => {
  const books = [
    { id: 'a', blobId: 'b1', capaBlobId: 'c1' },
    { id: 'b', blobId: 'b2' },                   // livro cuja capa não foi gerada
  ];
  assert.deepEqual(blobIdsDosLivros(books), ['b1', 'c1', 'b2']);
  assert.deepEqual(blobIdsDosLivros([]), []);
  assert.deepEqual(blobIdsDosLivros(null), []);
});

test('fusão: livro novo entra', () => {
  const r = fundeLivros([{ id: 'a', titulo: 'A' }], [{ id: 'b', titulo: 'B' }]);
  assert.deepEqual(r.books.map((b) => b.id), ['a', 'b']);
  assert.equal(r.added, 1);
  assert.equal(r.updated, 0);
});

test('fusão: livro que o aparelho já tem é PRESERVADO, não reescrito', () => {
  // 300 MB reescritos por um import é o custo que esta regra evita — e o
  // registro local pode ter título corrigido à mão e ultimaPagina de verdade.
  const atual = { id: 'a', titulo: 'Corrigido à mão', ultimaPagina: 42, blobId: 'b1' };
  const r = fundeLivros([atual], [{ id: 'a', titulo: 'Nome do arquivo', ultimaPagina: 1, blobId: 'b9' }]);
  assert.deepEqual(r.books, [atual]);
  assert.equal(r.added, 0);
  assert.equal(r.updated, 0);
});

test('fusão: arquivo sem livro nenhum não mexe na estante', () => {
  const atuais = [{ id: 'a', titulo: 'A' }];
  const r = fundeLivros(atuais, []);
  assert.deepEqual(r.books, atuais);
  const r2 = fundeLivros(atuais, undefined);
  assert.deepEqual(r2.books, atuais);
});

// --- mergePlan ponta a ponta -------------------------------------------------
// mergePlan é puro e já é testado assim em test/merge.test.js; aqui é só o eixo
// dos livros, que fundeLivros sozinho não exercita (mergePlan é quem lê
// `existing.books` / `incoming.books` e monta o plano inteiro).
test('mergePlan traz o livro novo e preserva o que o aparelho já tem', () => {
  const atual = { artists: [], songs: [], lists: [], books: [{ id: 'l1', titulo: 'Meu', ultimaPagina: 88 }] };
  const arquivo = { artists: [], songs: [], lists: [], partes: ['livros'],
    books: [{ id: 'l1', titulo: 'Do arquivo', ultimaPagina: 1 }, { id: 'l2', titulo: 'Novo' }] };
  const plano = mergePlan(atual, arquivo);
  assert.deepEqual(plano.books.map((b) => b.titulo), ['Meu', 'Novo']);
  assert.equal(plano.booksAdded, 1);
});

test('mergePlan de arquivo antigo (sem books) não mexe na estante', () => {
  const atual = { artists: [], songs: [], lists: [], books: [{ id: 'l1', titulo: 'Meu' }] };
  const plano = mergePlan(atual, { artists: [], songs: [], lists: [] });
  assert.deepEqual(plano.books, atual.books);
});
