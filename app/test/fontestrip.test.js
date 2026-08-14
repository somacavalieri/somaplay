// fontestrip.test.js — a paleta da faixa de fontes.
//
// Nome de fonte é texto livre: o usuário digita o que quiser. Então a cor tem
// que sair do NOME, e não da posição na lista — por posição, a cor de uma fonte
// mudaria quando outra ganhasse músicas, e seria diferente em cada aparelho.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { corDaFonte } from '../js/render/fontestrip.js';
import { SEM_FONTE } from '../js/state.js';

test('as fontes do mapa fixo têm a cor cravada', () => {
  assert.equal(corDaFonte('VJ'), '#34D399');
  assert.equal(corDaFonte('RV'), '#F4B860');
  assert.equal(corDaFonte('CifraClub'), '#E8A23D');
  assert.equal(corDaFonte('RN'), '#60A5FA');
  assert.equal(corDaFonte('Songbook'), '#2DD4BF');
  assert.equal(corDaFonte(SEM_FONTE), '#9A9AA5');
});

test('grafia divergente dá a mesma cor', () => {
  assert.equal(corDaFonte('cifraclub'), corDaFonte('CifraClub'));
  assert.equal(corDaFonte(' songbook '), corDaFonte('Songbook'));
});

test('fonte desconhecida cai na paleta, sempre na mesma cor', () => {
  const c = corDaFonte('Real Book');
  assert.match(c, /^#[0-9A-F]{6}$/i);
  assert.equal(corDaFonte('Real Book'), c);
  assert.equal(corDaFonte('real book'), c);
});

// Um nome de fonte não pode alcançar o Object.prototype. Com um objeto literal,
// corDaFonte('constructor') devolveria a função Object — e a pílula sairia com
// style="--fc:function Object()...". Por isso o mapa é um Map.
test('nome que colide com o Object.prototype cai na paleta como qualquer outro', () => {
  for (const nome of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) {
    assert.match(corDaFonte(nome), /^#[0-9A-F]{6}$/i, `${nome} não devolveu uma cor`);
  }
});

test('nome vazio ou ausente devolve uma cor válida em vez de quebrar', () => {
  assert.match(corDaFonte(''), /^#[0-9A-F]{6}$/i);
  assert.match(corDaFonte(undefined), /^#[0-9A-F]{6}$/i);
});
