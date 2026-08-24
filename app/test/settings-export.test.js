// settings-export.test.js — the export button's disable/label logic.
//
// Two layers are tested on purpose. `podeExportarBackup` is the pure
// aggregator, and a unit test of it alone would not have caught the bug the
// second review found: the function was already right; what fed it was wrong.
// So the second half of this file drives the real renderSettings() output with
// realistic S state and reads the button's `disabled` attribute and its label
// text — the only way to pin the WIRING, not just the arithmetic.
//
// Since the "Livros" checkbox (2026-08-24) the question the wiring must answer
// is no longer "is this export unrestricted?" but simply "is the box checked
// and is there a book to send". The heuristic those older tests defended —
// books ride along only on a totally unrestricted backup — is gone, replaced by
// a box the user can see. What survived is the invariant it was protecting, and
// it is asserted at the bottom: the button is enabled if and only if the label
// names something the file will actually carry.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { podeExportarBackup, renderSettings } from '../js/render/settings.js';
import { S } from '../js/state.js';
import { PARTES_TODAS } from '../js/partes.js';

// ---------- podeExportarBackup: the pure predicate ----------

test('biblioteca comum: precisa de música E cifra/áudio marcados', () => {
  assert.equal(podeExportarBackup({ n: 5, temConteudo: true, exportaLivros: false }), true);
  assert.equal(podeExportarBackup({ n: 5, temConteudo: false, exportaLivros: false }), false);
  assert.equal(podeExportarBackup({ n: 0, temConteudo: true, exportaLivros: false }), false);
});

test('exportaLivros=true libera o botão mesmo sem música', () => {
  assert.equal(podeExportarBackup({ n: 0, temConteudo: false, exportaLivros: true }), true);
});

test('sem música e sem exportaLivros o botão continua travado', () => {
  assert.equal(podeExportarBackup({ n: 0, temConteudo: false, exportaLivros: false }), false);
});

test('tanto faz o valor exato de exportaLivros, só a veracidade importa', () => {
  assert.equal(podeExportarBackup({ n: 0, temConteudo: false, exportaLivros: 3 }), true);
  assert.equal(podeExportarBackup({ n: 0, temConteudo: false, exportaLivros: 0 }), false);
});

// ---------- renderSettings(): the real wiring, end to end ----------
//
// Every test resets the fields blocoExportar reads, since S is a shared
// singleton module — leaving one dirty would make test order matter.
function resetS() {
  S.songs = [];
  S.books = [];
  S.exportFontes = null;                   // null = todas
  S.exportPartes = [...PARTES_TODAS];      // as cinco caixas, 'livros' entre elas
  S.exportListas = true;
}

// `texto` vem SEM o ícone: o SVG do download traz números no `viewBox` e no
// `path`, e uma asserção de contagem sobre o rótulo inteiro passaria por causa
// deles — inclusive com o rótulo errado.
function botaoExportar(html) {
  const m = html.match(/<button class="btn-primary"[^>]*data-a="exportBackup"[^>]*>([\s\S]*?)<\/button>/);
  assert.ok(m, 'botão de exportar não encontrado no HTML');
  return { tag: m[0], texto: m[1].replace(/<svg[\s\S]*?<\/svg>/g, '') };
}

const semLivros = () => PARTES_TODAS.filter((p) => p !== 'livros');

test('a caixa Livros aparece em O QUE INCLUIR, com a contagem da estante', () => {
  resetS();
  S.books = [{ id: 'b1' }, { id: 'b2' }];
  const html = renderSettings();
  const m = html.match(/data-a="toggleExportParte" data-id="livros"[\s\S]*?<\/button>/);
  assert.ok(m, 'a linha da caixa Livros não foi encontrada');
  assert.match(m[0], /\b2\b/, 'a linha deveria mostrar quantos livros vão junto');
});

test('biblioteca só de livros, nada desmarcado: botão liga e promete os livros', () => {
  resetS();
  S.books = [{ id: 'b1' }, { id: 'b2' }, { id: 'b3' }];
  const { tag, texto } = botaoExportar(renderSettings());
  assert.ok(!tag.includes('disabled'), 'deveria estar habilitado');
  assert.match(texto, /3/, 'rótulo deveria citar os 3 livros');
});

test('biblioteca só de livros com a caixa Livros desmarcada: botão desliga', () => {
  resetS();
  S.books = [{ id: 'b1' }, { id: 'b2' }, { id: 'b3' }];
  S.exportPartes = semLivros();
  const { tag } = botaoExportar(renderSettings());
  assert.ok(tag.includes('disabled'),
    'sem música e sem livro marcado não há o que exportar');
});

test('40 músicas + 1 livro, nada desmarcado: o rótulo cita os DOIS', () => {
  resetS();
  S.songs = Array.from({ length: 40 }, (_, i) => ({ id: `s${i}`, artistId: 'a1', fonte: 'X' }));
  S.books = [{ id: 'b1' }];
  const { tag, texto } = botaoExportar(renderSettings());
  assert.ok(!tag.includes('disabled'));
  assert.match(texto, /40/);
  assert.match(texto, /livro/i, 'o arquivo leva o livro junto — o rótulo tem de dizer');
});

// O pedido que originou a caixa: um backup organizável, sem centenas de MB de
// PDF dentro. O rótulo não pode continuar prometendo o que foi desmarcado.
test('Livros desmarcada: exporta as músicas e não fala em livro', () => {
  resetS();
  S.songs = Array.from({ length: 40 }, (_, i) => ({ id: `s${i}`, artistId: 'a1', fonte: 'X' }));
  S.books = [{ id: 'b1' }];
  S.exportPartes = semLivros();
  const { tag, texto } = botaoExportar(renderSettings());
  assert.ok(!tag.includes('disabled'));
  assert.match(texto, /40/);
  assert.doesNotMatch(texto, /livro/i);
});

// O outro lado do mesmo pedido: um arquivo SÓ de livros.
test('só a caixa Livros marcada: botão liga citando os livros, não as músicas', () => {
  resetS();
  S.songs = Array.from({ length: 40 }, (_, i) => ({ id: `s${i}`, artistId: 'a1', fonte: 'X' }));
  S.books = [{ id: 'b1' }, { id: 'b2' }];
  S.exportPartes = ['livros'];
  const { tag, texto } = botaoExportar(renderSettings());
  assert.ok(!tag.includes('disabled'));
  assert.match(texto, /2/);
  assert.doesNotMatch(texto, /40/,
    'sem cifra nem áudio a música não viaja — prometer 40 seria a mentira que o review anterior tirou daqui');
});

test('cifra, áudio E livros desmarcados: botão desliga', () => {
  resetS();
  S.songs = Array.from({ length: 40 }, (_, i) => ({ id: `s${i}`, artistId: 'a1', fonte: 'X' }));
  S.books = [{ id: 'b1' }];
  S.exportPartes = ['pessoal'];
  const { tag } = botaoExportar(renderSettings());
  assert.ok(tag.includes('disabled'));
});

// Mudança deliberada de comportamento: ANTES da caixa, escolher uma fonte
// tirava os livros do arquivo por regra escondida. Agora quem decide é a caixa,
// e ela está visível na tela — um recorte por fonte leva os livros se estiver
// marcada.
test('uma fonte escolhida com Livros marcada: leva as duas coisas', () => {
  resetS();
  S.songs = [{ id: 's1', artistId: 'a1', fonte: 'VJ' }, { id: 's2', artistId: 'a1', fonte: 'Outra' }];
  S.books = [{ id: 'b1' }];
  S.exportFontes = ['VJ'];
  const { tag, texto } = botaoExportar(renderSettings());
  assert.ok(!tag.includes('disabled'));
  assert.match(texto, /1/);              // 1 música da fonte VJ
  assert.match(texto, /livro/i);
});

test('estante vazia com a caixa marcada não promete livro nenhum', () => {
  resetS();
  S.songs = [{ id: 's1', artistId: 'a1', fonte: 'VJ' }];
  const { tag, texto } = botaoExportar(renderSettings());
  assert.ok(!tag.includes('disabled'));
  assert.doesNotMatch(texto, /livro/i);
});

// A invariante que sobreviveu à troca da heurística pela caixa, e a razão de
// este arquivo dirigir o render de verdade: um botão habilitado que baixa um
// arquivo vazio, ou um rótulo que promete o que não vai, são o mesmo bug visto
// de dois lados. Varrer as combinações é o que impede a próxima caixa de
// reabrir um deles.
test('botão habilitado ⟺ o rótulo nomeia alguma coisa', () => {
  const combos = [
    [], ['cifra'], ['audio'], ['pessoal'], ['livros'],
    ['cifra', 'livros'], ['audio', 'pessoal'], ['pessoal', 'livros'], [...PARTES_TODAS],
  ];
  for (const partes of combos) {
    for (const nBooks of [0, 2]) {
      for (const nSongs of [0, 5]) {
        resetS();
        S.songs = Array.from({ length: nSongs }, (_, i) => ({ id: `s${i}`, artistId: 'a1', fonte: 'X' }));
        S.books = Array.from({ length: nBooks }, (_, i) => ({ id: `b${i}` }));
        S.exportPartes = partes;
        const { tag, texto } = botaoExportar(renderSettings());
        const ligado = !tag.includes('disabled');
        const promete = /\d/.test(texto);
        assert.equal(ligado, promete,
          `partes=${JSON.stringify(partes)} livros=${nBooks} músicas=${nSongs}: botão=${ligado} rótulo=${JSON.stringify(texto)}`);
      }
    }
  }
});
