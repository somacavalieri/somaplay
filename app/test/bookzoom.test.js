// bookzoom.test.js — a régua do zoom do leitor de livros.
//
// O leitor mede o zoom contra "a página inteira cabe", não contra a largura do
// container. Este arquivo cobre as duas metades dessa régua: a geometria do
// "caber" (pdf.js) e a faixa/passo que o livro usa (panzoom.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { larguraQueCabe } from '../js/pdf.js';
import {
  clampZoom, escalaDaPinca, passoZoomLivro, LIVRO_ZOOM_MIN, LIVRO_ZOOM_MAX,
} from '../js/panzoom.js';

test('página retrato numa tela deitada: quem manda é a altura', () => {
  // 1900×700 de área útil, página A4 retrato (595×842). Caber pela largura
  // deixaria a página com 2690 px de altura — quase quatro telas. É esse o
  // caso que abria o livro cortado.
  const w = larguraQueCabe(1900, 700, 595, 842);
  assert.ok(w < 1900, 'não pode usar a largura toda');
  assert.equal(Math.round(w), Math.round(700 * (595 / 842)));
  assert.ok(w * (842 / 595) <= 700 + 0.001, 'a altura resultante tem de caber');
});

test('página deitada numa tela em pé: quem manda é a largura', () => {
  const w = larguraQueCabe(800, 1200, 842, 595);
  assert.equal(w, 800);
});

test('mesma proporção da tela: os dois limites empatam', () => {
  assert.equal(larguraQueCabe(1000, 500, 800, 400), 1000);
});

test('medida de página inválida não vira NaN nem Infinity', () => {
  // Um PDF corrompido pode devolver 0. Sem a guarda, a divisão produz
  // Infinity e o canvas nasce com largura inválida.
  for (const [pw, ph] of [[0, 842], [595, 0], [NaN, 842], [595, undefined]]) {
    const w = larguraQueCabe(1000, 700, pw, ph);
    assert.ok(Number.isFinite(w), `larguraQueCabe(1000,700,${pw},${ph}) = ${w}`);
    assert.equal(w, 1000, 'sem proporção confiável, volta a caber na largura');
  }
});

test('altura útil zerada (tela ainda sem layout) volta a caber na largura', () => {
  assert.equal(larguraQueCabe(1000, 0, 595, 842), 1000);
});

test('o livro tem faixa própria, sem mexer na da cifra', () => {
  // A tela de cifra continua em 0.4–4; o livro vai mais fundo e mais alto
  // porque 100% ali significa "a página inteira", não "a largura da tela".
  assert.equal(clampZoom(0.1), 0.4);
  assert.equal(clampZoom(99), 4);
  assert.equal(clampZoom(0.1, LIVRO_ZOOM_MIN, LIVRO_ZOOM_MAX), LIVRO_ZOOM_MIN);
  assert.equal(clampZoom(99, LIVRO_ZOOM_MIN, LIVRO_ZOOM_MAX), LIVRO_ZOOM_MAX);
  assert.ok(LIVRO_ZOOM_MAX > 4, 'o livro precisa passar do teto da cifra');
});

test('a pinça respeita o clamp que o chamador passar', () => {
  const clampLivro = (z) => clampZoom(z, LIVRO_ZOOM_MIN, LIVRO_ZOOM_MAX);
  assert.equal(escalaDaPinca(3, 400, 100, clampLivro), LIVRO_ZOOM_MAX);
  assert.equal(escalaDaPinca(1, 1, 100, clampLivro), LIVRO_ZOOM_MIN);
  // Sem o quarto argumento, nada muda para quem já usava a função.
  assert.equal(escalaDaPinca(3, 400, 100), 4);
});

test('o passo do zoom do livro é proporcional, não somado', () => {
  // Somando 0,2 por toque, ir de 0,5 a 5 custaria 23 toques.
  assert.equal(passoZoomLivro(1, 1), 1.25);
  assert.equal(passoZoomLivro(4, 1), 5);
  assert.equal(passoZoomLivro(1, -1), 0.8);
  // E o passo não escapa da faixa em nenhuma das pontas.
  assert.equal(passoZoomLivro(LIVRO_ZOOM_MAX, 1), LIVRO_ZOOM_MAX);
  assert.equal(passoZoomLivro(LIVRO_ZOOM_MIN, -1), LIVRO_ZOOM_MIN);
  // Sobe e desce do mesmo lugar volta ao mesmo lugar (dentro da faixa).
  assert.equal(passoZoomLivro(passoZoomLivro(2, 1), -1), 2);
});
