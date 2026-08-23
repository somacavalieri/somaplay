// books.test.js — a lógica de livro que dá para testar sem navegador.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tituloDeArquivo, blobIdsDosLivros, fundeLivros } from '../js/books.js';
import { mergePlan } from '../js/merge.js';
import { DB } from '../js/db.js';
import { criarLivro } from '../js/state.js';

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

// --- criarLivro: uma falha no registro não pode deixar os blobs órfãos -----
// (F3 do review final) DB é um objeto simples exportado por db.js; os testes
// trocam seus métodos por dublês e devolvem o original no finally, sem tocar
// em IndexedDB/OPFS de verdade.
test('putBook rejeitando apaga o PDF e a capa que já tinham sido escritos', async () => {
  const saved = [];
  const deleted = [];
  const orig = { saveBlob: DB.saveBlob, putBook: DB.putBook, deleteBlob: DB.deleteBlob };
  DB.saveBlob = async (id) => { saved.push(id); return { id, store: 'opfs' }; };
  DB.deleteBlob = async (id) => { deleted.push(id); };
  DB.putBook = async () => { throw new Error('quota exceeded'); };
  try {
    await assert.rejects(
      () => criarLivro({ name: 'x.pdf', size: 301_000_000 }, { paginas: 10, capaBlob: { size: 9 } }),
      /quota exceeded/,
    );
    assert.equal(saved.length, 2, 'o PDF e a capa foram escritos antes do registro falhar');
    assert.deepEqual(deleted.sort(), saved.slice().sort(), 'os dois blobs escritos foram apagados');
  } finally {
    Object.assign(DB, orig);
  }
});

test('putBook rejeitando sem capa apaga só o blob do PDF', async () => {
  const saved = [];
  const deleted = [];
  const orig = { saveBlob: DB.saveBlob, putBook: DB.putBook, deleteBlob: DB.deleteBlob };
  DB.saveBlob = async (id) => { saved.push(id); return { id, store: 'opfs' }; };
  DB.deleteBlob = async (id) => { deleted.push(id); };
  DB.putBook = async () => { throw new Error('connection closed'); };
  try {
    await assert.rejects(
      () => criarLivro({ name: 'x.pdf', size: 1000 }, { paginas: 1 }),
      /connection closed/,
    );
    assert.equal(saved.length, 1);
    assert.deepEqual(deleted, saved);
  } finally {
    Object.assign(DB, orig);
  }
});

test('saveBlob do PDF rejeitando não deixa nada para apagar', async () => {
  const deleted = [];
  const orig = { saveBlob: DB.saveBlob, deleteBlob: DB.deleteBlob };
  DB.saveBlob = async () => { throw new Error('quota exceeded'); };
  DB.deleteBlob = async (id) => { deleted.push(id); };
  try {
    await assert.rejects(
      () => criarLivro({ name: 'x.pdf', size: 1000 }, { paginas: 1, capaBlob: { size: 9 } }),
      /quota exceeded/,
    );
    // A capa nunca chega a ser escrita, e o PDF que falhou não precisa de
    // "apagar" (nada foi persistido) — mas a chamada de melhor esforço para o
    // blobId do PDF é inofensiva mesmo que o id nunca tenha existido.
    assert.ok(deleted.length <= 1);
  } finally {
    Object.assign(DB, orig);
  }
});
