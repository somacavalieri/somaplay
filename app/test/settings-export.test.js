// settings-export.test.js — a decisão pura por trás do botão Exportar (F2 do
// review final).
//
// Antes desta correção o botão só destravava com `n > 0 && temConteudo`, o
// que deixava um aparelho só de livros — três songbooks, zero músicas — sem
// nenhuma forma de fazer backup. `podeExportarBackup` isola a decisão do HTML
// em volta, para o caso "só livros" ficar coberto sem precisar de DOM.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { podeExportarBackup } from '../js/render/settings.js';

test('biblioteca comum: precisa de música E cifra/áudio marcados', () => {
  assert.equal(podeExportarBackup({ n: 5, temConteudo: true, temLivros: false }), true);
  assert.equal(podeExportarBackup({ n: 5, temConteudo: false, temLivros: false }), false);
  assert.equal(podeExportarBackup({ n: 0, temConteudo: true, temLivros: false }), false);
});

test('aparelho só de livros: zero música, zero conteúdo marcado, ainda assim exporta', () => {
  assert.equal(podeExportarBackup({ n: 0, temConteudo: false, temLivros: true }), true);
});

test('livro não substitui música: uma biblioteca sem nada continua travada', () => {
  assert.equal(podeExportarBackup({ n: 0, temConteudo: false, temLivros: false }), false);
});

test('tanto faz o valor exato de temLivros, só a veracidade importa', () => {
  assert.equal(podeExportarBackup({ n: 0, temConteudo: false, temLivros: 3 }), true);
  assert.equal(podeExportarBackup({ n: 0, temConteudo: false, temLivros: 0 }), false);
});
