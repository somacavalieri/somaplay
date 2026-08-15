// fontestrip.test.js — a paleta da faixa de fontes.
//
// Nome de fonte é texto livre: o usuário digita o que quiser. Então a cor tem
// que sair do NOME, e não da posição na lista — por posição, a cor de uma fonte
// mudaria quando outra ganhasse músicas, e seria diferente em cada aparelho.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { corDaFonte, fonteStripHTML } from '../js/render/fontestrip.js';
import { S, SEM_FONTE } from '../js/state.js';
import { setLang } from '../js/i18n.js';

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

// ---------- fonteStripHTML() ----------
//
// Função pura de string: lê S diretamente, e um teste de node pode atribuir a
// S sem DOM nenhum — o mesmo padrão de listorder.test.js. O revisor teve que
// rodar um script ad-hoc no Node para conferir a faixa manualmente; este bloco
// é esse script, fixado como teste.
//
// setLang() fixa o idioma em cada teste: sem isso o teste depende de qual foi
// o último setLang() chamado por OUTRO arquivo de teste, e isso muda com a
// ordem de execução.
function bibliotecaDeTeste({ artists = [{ id: 'a1', name: 'Gil' }], songs = [], query = '', modeFilter = [], fonteFilter = [] } = {}) {
  S.artists = artists;
  S.songs = songs;
  S.query = query;
  S.modeFilter = modeFilter;
  S.fonteFilter = fonteFilter;
}

const song = (title, fonte, extra = {}) => ({ title, artistId: 'a1', fonte, ...extra });

test('nome de fonte com aspas escapa certo no data-id e no rótulo visível', () => {
  setLang('pt');
  bibliotecaDeTeste({ songs: [song('X', 'Caderno "do" Zé')] });
  const html = fonteStripHTML();
  assert.match(html, /data-id="Caderno &quot;do&quot; Zé"/);
  assert.match(html, /<span class="nm">Caderno &quot;do&quot; Zé<\/span>/);
});

test('aria-pressed casa com S.fonteFilter, inclusive na pílula Todas', () => {
  setLang('pt');
  bibliotecaDeTeste({
    songs: [song('a', 'VJ'), song('b', 'VJ'), song('c', 'RV')],
    fonteFilter: ['VJ'],
  });
  const html = fonteStripHTML();
  // Todas: não marcada, porque a seleção não está vazia.
  assert.match(html, /<button class="fpill todas"[^>]*aria-pressed="false"/);
  // VJ: marcada.
  assert.match(html, /data-id="VJ"[^>]*aria-pressed="true"/);
  // RV: não marcada.
  assert.match(html, /data-id="RV"[^>]*aria-pressed="false"/);
});

test('as três variantes de dica — isolar, incluir, remover — no estado certo', () => {
  setLang('pt');
  // VJ com uma música só: prende de quebra a regressão do achado 6 ("1 músicas").
  const songs = [song('a', 'VJ'), song('b', 'RV')];

  // Todas ativa: clicar em VJ isola.
  bibliotecaDeTeste({ songs, fonteFilter: [] });
  let html = fonteStripHTML();
  assert.match(html, /data-id="VJ"[^>]*title="VJ · 1 música · clique para ver somente esta"/);

  // RV marcada, VJ não: clicar em VJ inclui.
  bibliotecaDeTeste({ songs, fonteFilter: ['RV'] });
  html = fonteStripHTML();
  assert.match(html, /data-id="VJ"[^>]*title="VJ · 1 música · clique para incluir"/);

  // VJ marcada: clicar nela remove.
  bibliotecaDeTeste({ songs, fonteFilter: ['VJ'] });
  html = fonteStripHTML();
  assert.match(html, /data-id="VJ"[^>]*title="VJ · 1 música · clique para remover"/);
});

test('SEM_FONTE aparece traduzido no rótulo visível, mas cru no data-id', () => {
  bibliotecaDeTeste({ songs: [song('a', '')] });

  setLang('pt');
  let html = fonteStripHTML();
  assert.match(html, /data-id="__sem_fonte"/);
  assert.match(html, /<span class="nm">Sem fonte<\/span>/);

  setLang('en');
  html = fonteStripHTML();
  assert.match(html, /data-id="__sem_fonte"/);
  assert.match(html, /<span class="nm">No source<\/span>/);
});

test('a classe off aparece quando a faixa está desligada (aba Listas), sem espaço sobrando', () => {
  setLang('pt');
  bibliotecaDeTeste({ songs: [song('a', 'VJ')] });
  const ligada = fonteStripHTML(false);
  const desligada = fonteStripHTML(true);
  assert.match(desligada, /<div class="fonte-strip off" id="fonte-strip"/);
  // Ligada não pode sobrar espaço depois de "fonte-strip" — achado 8 (cosmético).
  assert.match(ligada, /<div class="fonte-strip" id="fonte-strip"/);
});

// A regressão do achado 1: .fpill.zero e .fpill[aria-pressed="true"] têm a
// MESMA especificidade CSS, e sem :not([aria-pressed="true"]) no lado do
// .zero, uma pílula marcada que zera perde a aparência de selecionada. O CSS
// não tem teste automático possível, mas o HTML tem que carregar as DUAS
// classes para o seletor ter o que segurar.
test('pílula marcada e zerada carrega aria-pressed=true E a classe zero', () => {
  setLang('pt');
  bibliotecaDeTeste({
    songs: [song('a', 'VJ')],
    query: 'não existe nada com isso',
    fonteFilter: ['VJ'],
  });
  const html = fonteStripHTML();
  assert.match(html, /<button class="fpill zero" data-a="toggleFonte" data-id="VJ" aria-pressed="true"/);
});
