// welcome.test.js — as duas regras que decidem o que a Home mostra antes de a
// biblioteca existir: a tela de boas-vindas e o cartão da demo.
//
// Puras de propósito: a tela em si não tem teste automatizado (não há harness de
// DOM no projeto), então o que dá para blindar é a decisão.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { primeiraVisita, mostraGuiaDemo, FONTE_DEMO } from '../js/state.js';

test('a fonte da demo é "Demo", e é dado — não texto de interface', () => {
  assert.equal(FONTE_DEMO, 'Demo');
});

test('sem música e sem livro é primeira visita', () => {
  assert.equal(primeiraVisita([], []), true);
});

test('um livro sozinho já tira a tela de boas-vindas', () => {
  // Um aparelho que só tem songbook em PDF é caso real. Sem esta regra ele
  // ficaria com as abas escondidas e sem caminho de volta para a estante.
  assert.equal(primeiraVisita([], [{ id: 'b1' }]), false);
});

test('uma música sozinha também tira', () => {
  assert.equal(primeiraVisita([{ id: 's1' }], []), false);
});

test('argumentos ausentes contam como vazio', () => {
  assert.equal(primeiraVisita(undefined, undefined), true);
});

test('o cartão aparece com música da fonte Demo e o ajuste desligado', () => {
  assert.equal(mostraGuiaDemo([{ id: 's1', fonte: FONTE_DEMO }], {}), true);
});

test('a grafia da fonte segue a regra da lente: " demo " é a mesma fonte', () => {
  assert.equal(mostraGuiaDemo([{ id: 's1', fonte: ' demo ' }], {}), true);
});

test('fechado uma vez, o cartão não volta', () => {
  assert.equal(mostraGuiaDemo([{ id: 's1', fonte: FONTE_DEMO }], { guiaDemoFechado: true }), false);
});

test('sem demo na biblioteca não há cartão', () => {
  assert.equal(mostraGuiaDemo([{ id: 's1', fonte: 'VJ' }], {}), false);
});

test('settings ausente não derruba a regra', () => {
  assert.equal(mostraGuiaDemo([{ id: 's1', fonte: FONTE_DEMO }], undefined), true);
});
