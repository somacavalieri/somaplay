import { test } from 'node:test';
import assert from 'node:assert/strict';
import { t, setLang, getLang, detectLang } from '../js/i18n.js';
import { PT } from '../js/i18n/pt.js';
import { EN } from '../js/i18n/en.js';

test('paridade: toda chave de pt.js existe em en.js', () => {
  const missing = Object.keys(PT).filter((k) => !(k in EN));
  assert.deepEqual(missing, [], `faltam em en.js: ${missing.join(', ')}`);
});

test('paridade: toda chave de en.js existe em pt.js', () => {
  const missing = Object.keys(EN).filter((k) => !(k in PT));
  assert.deepEqual(missing, [], `faltam em pt.js: ${missing.join(', ')}`);
});

test('nenhuma string vazia', () => {
  for (const [name, table] of [['pt', PT], ['en', EN]]) {
    for (const [k, v] of Object.entries(table)) {
      assert.ok(String(v).trim().length > 0, `string vazia em ${name}.js: ${k}`);
    }
  }
});

test('t() devolve a string do idioma ativo', () => {
  setLang('pt');
  assert.equal(t('common.back'), 'Voltar');
  setLang('en');
  assert.equal(t('common.back'), 'Back');
});

test('t() interpola parâmetros nomeados', () => {
  setLang('pt');
  assert.equal(t('storage.used', { used: '1,5', total: '8' }), '1,5 GB de 8 GB usados');
});

test('t() ignora parâmetro não usado e mantém chave não passada', () => {
  setLang('pt');
  assert.equal(t('storage.used', { used: '1,5' }), '1,5 GB de {total} GB usados');
});

test('chave ausente no idioma ativo cai para português', () => {
  setLang('en');
  const original = EN['common.back'];
  delete EN['common.back'];
  assert.equal(t('common.back'), 'Voltar');
  EN['common.back'] = original;
});

test('chave inexistente devolve a própria chave em vez de quebrar', () => {
  setLang('pt');
  assert.equal(t('nao.existe.nada'), 'nao.existe.nada');
});

test('setLang com valor inválido cai para português', () => {
  assert.equal(setLang('klingon'), 'pt');
  assert.equal(getLang(), 'pt');
});

test('detectLang lê o idioma do navegador', () => {
  assert.equal(detectLang('pt-BR'), 'pt');
  assert.equal(detectLang('PT'), 'pt');
  assert.equal(detectLang('en-US'), 'en');
  assert.equal(detectLang('fr-FR'), 'en');
  assert.equal(detectLang(undefined), 'en');
});
