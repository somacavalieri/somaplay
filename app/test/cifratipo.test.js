// cifratipo.test.js — a migração do campo que tinha nome ambíguo.
//
// song.fonte é de ONDE a cifra veio ('CifraClub', 'VJ'); song.cifra.fonte era o
// TIPO dela ('imagem' | 'texto'). Dois campos com o mesmo nome no mesmo
// registro. O tipo virou cifra.tipo; a leitura aceita os dois para que
// biblioteca antiga e arquivo .somaplay antigo continuem abrindo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizaCifra } from '../js/db.js';

test('registro antigo com cifra.fonte vira cifra.tipo', () => {
  const s = normalizaCifra({ id: 'a', cifra: { fonte: 'imagem', imagens: ['x'], texto: '' } });
  assert.equal(s.cifra.tipo, 'imagem');
});

test('registro novo com cifra.tipo passa intacto', () => {
  const s = normalizaCifra({ id: 'a', cifra: { tipo: 'texto', imagens: [], texto: 'C G' } });
  assert.equal(s.cifra.tipo, 'texto');
  assert.equal(s.cifra.texto, 'C G');
});

test('cifra.tipo ganha de cifra.fonte quando os dois existem', () => {
  const s = normalizaCifra({ id: 'a', cifra: { tipo: 'texto', fonte: 'imagem' } });
  assert.equal(s.cifra.tipo, 'texto');
});

test('a procedência da música (song.fonte) não é tocada', () => {
  const s = normalizaCifra({ id: 'a', fonte: 'VJ', cifra: { fonte: 'texto' } });
  assert.equal(s.fonte, 'VJ');
  assert.equal(s.cifra.tipo, 'texto');
});

test('música sem cifra e sem tipo não quebram', () => {
  assert.equal(normalizaCifra({ id: 'a' }).cifra, undefined);
  assert.equal(normalizaCifra({ id: 'a', cifra: {} }).cifra.tipo, null);
  assert.equal(normalizaCifra(null), null);
});
