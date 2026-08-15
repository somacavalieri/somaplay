// sharesheet.test.js — as duas peças puras da folha de compartilhar.
//
// OPCOES é o contrato: cada opção da folha vira um conjunto de partes, e é ele
// que chega no exportLibrary. Se alguém trocar 'ambos' por ['cifra'], nenhum
// teste de UI pega — este pega.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OPCOES, formataTamanho } from '../js/render/sharesheet.js';

test('cada opção da folha mapeia para as partes certas', () => {
  const porId = Object.fromEntries(OPCOES.map((o) => [o.id, o.partes]));
  assert.deepEqual(porId.cifras, ['cifra']);
  assert.deepEqual(porId.ambos, ['cifra', 'audio']);
  assert.deepEqual(porId.audio, ['audio']);
});

test('nenhuma opção da folha compartilha o pessoal', () => {
  // Compartilhar é dar conteúdo a alguém, não despejar o gosto de quem mandou.
  for (const o of OPCOES) assert.ok(!o.partes.includes('pessoal'), o.id);
});

test('o tamanho é legível na escala que importa', () => {
  assert.equal(formataTamanho(0), '0 KB');
  assert.equal(formataTamanho(1536), '2 KB');          // KB é sempre inteiro
  assert.equal(formataTamanho(1_800_000), '1,8 MB');
  assert.equal(formataTamanho(184_000_000), '184 MB');
  assert.equal(formataTamanho(2_500_000_000), '2,5 GB');
});

test('tamanho desconhecido não vira zero', () => {
  assert.equal(formataTamanho(null), '');
});
