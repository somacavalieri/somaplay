import { test } from 'node:test';
import assert from 'node:assert';
import { filtra, paraHTML, hrefSeguro, deTexto } from '../js/anotacoes.js';

const tx = (s) => ({ texto: s });
const el = (tag, filhos = [], atribs = {}) => ({ tag, atribs, filhos });
const limpa = (nos) => paraHTML(filtra(nos));

test('style e class do Word somem, o texto fica', () => {
  const entrada = [el('p', [el('span', [tx('estudar devagar')], { style: 'font-family:Calibri;color:#000', class: 'MsoNormal' })])];
  assert.equal(limpa(entrada), '<p>estudar devagar</p>');
});

test('b e i viram strong e em', () => {
  assert.equal(limpa([el('p', [el('b', [tx('x')]), el('i', [tx('y')])])]), '<p><strong>x</strong><em>y</em></p>');
});

test('img some, inclusive base64 colado', () => {
  const entrada = [el('p', [tx('antes'), el('img', [], { src: 'data:image/png;base64,AAAA' }), tx('depois')])];
  assert.equal(limpa(entrada), '<p>antesdepois</p>');
});

test('script some COM o conteudo', () => {
  assert.equal(limpa([el('p', [tx('ok')]), el('script', [tx('alert(1)')])]), '<p>ok</p>');
});

test('href javascript: perde o link mas mantem o texto', () => {
  assert.equal(limpa([el('p', [el('a', [tx('clique')], { href: 'javascript:alert(1)' })])]), '<p>clique</p>');
});

test('href https sobrevive', () => {
  assert.equal(limpa([el('p', [el('a', [tx('aula')], { href: 'https://ex.com/a' })])]),
    '<p><a href="https://ex.com/a">aula</a></p>');
});

test('pre preserva o alinhamento por coluna', () => {
  assert.equal(limpa([el('pre', [tx('| Am  | F   |\n| C   | G   |')])]),
    '<pre>| Am  | F   |\n| C   | G   |</pre>');
});

test('texto e escapado, nao interpretado', () => {
  assert.equal(limpa([el('p', [tx('a < b & c')])]), '<p>a &lt; b &amp; c</p>');
});

test('paragrafo vazio some, br fica', () => {
  assert.equal(limpa([el('p', []), el('p', [tx('a'), el('br')])]), '<p>a<br></p>');
});

test('hrefSeguro recusa esquema desconhecido, relativo e caractere de controle', () => {
  assert.equal(hrefSeguro('https://ex.com'), 'https://ex.com');
  assert.equal(hrefSeguro('mailto:a@b.c'), 'mailto:a@b.c');
  assert.equal(hrefSeguro('java\u0000script:alert(1)'), null);
  assert.equal(hrefSeguro('/relativo'), null);
  assert.equal(hrefSeguro(''), null);
});

test('deTexto quebra linhas em paragrafos e escapa', () => {
  assert.equal(deTexto('um\n\ndois <b>'), '<p>um</p><p>dois &lt;b&gt;</p>');
});
