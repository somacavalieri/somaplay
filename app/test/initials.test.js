import { test } from 'node:test';
import assert from 'node:assert/strict';
import { iniciais } from '../js/initials.js';

test('duas palavras dão duas iniciais', () => {
  assert.equal(iniciais('Gilberto Gil'), 'GG');
  assert.equal(iniciais('Banda Mel'), 'BM');
  assert.equal(iniciais('Caetano Veloso'), 'CV');
  assert.equal(iniciais('Legião Urbana'), 'LU');
});

test('nome de uma palavra só dá uma inicial', () => {
  assert.equal(iniciais('Djavan'), 'D');
  assert.equal(iniciais('Cartola'), 'C');
  assert.equal(iniciais('Araketu'), 'A');
});

test('artigos e preposições não contam como palavra', () => {
  assert.equal(iniciais('A Turma do Seu Lobato'), 'TS');
  assert.equal(iniciais('Batuque Na Caixa'), 'BC');
  assert.equal(iniciais('Academia da Berlinda'), 'AB');
  assert.equal(iniciais('Beth Carvalho'), 'BC');
});

test('só conectivos: cai para a primeira letra do nome cru', () => {
  assert.equal(iniciais('Os Paralamas'), 'P');
  assert.equal(iniciais('A'), 'A');
  assert.equal(iniciais('de'), 'D');
});

test('a inicial sai em maiúscula, venha como vier', () => {
  assert.equal(iniciais('tim maia'), 'TM');
  assert.equal(iniciais('bee gees'), 'BG');
});

test('espaço extra, tabulação e quebra de linha não viram palavra', () => {
  assert.equal(iniciais('  Ary   Barroso '), 'AB');
  assert.equal(iniciais('Almir\tGuinéto'), 'AG');
});

test('nome vazio ou ausente vira interrogação', () => {
  assert.equal(iniciais(''), '?');
  assert.equal(iniciais('   '), '?');
  assert.equal(iniciais(undefined), '?');
  assert.equal(iniciais(null), '?');
});

// Estilos passam pela mesma função, e é comum virem numa palavra ou em sigla.
test('estilos seguem a mesma regra', () => {
  assert.equal(iniciais('Rock Nacional'), 'RN');
  assert.equal(iniciais('Samba'), 'S');
  assert.equal(iniciais('MPB'), 'M');
  assert.equal(iniciais('Forró Pé de Serra'), 'FP');
});

// O nome é conteúdo do usuário: pode começar com pontuação, número ou emoji.
// A função nunca pode devolver string vazia — o thumb ficaria em branco.
test('nome que não começa com letra ainda rende algo visível', () => {
  assert.equal(iniciais('3 Marias'), '3M');
  assert.equal(iniciais('!!!'), '!');
});
