// settings-export.test.js — the export button's disable/label logic (F2 of
// the first review, F1/F2-disagreement fix of the second).
//
// Two layers are tested on purpose. `podeExportarBackup` is the pure
// aggregator — but a unit test of it alone would NOT have caught the second
// review's bug, because the function itself was already correct; the bug
// was in what blocoExportar (render/settings.js) fed it: `S.books.length > 0`
// ("the shelf isn't empty") instead of "this export's own partes actually
// include 'livros'" (the same question partesDoExport, backup.js, answers
// when the download really happens). A books-only device that unchecked
// Cifras, or a 40-song library with one book that unchecked Cifras AND
// Áudio, both got an ENABLED button promising books in the label while the
// real export (gated by partesDoExport) would ship neither songs nor books.
// So the second half of this file drives the real renderSettings() output
// with realistic S state and reads the button's `disabled` attribute and
// its label text — the only way to pin the WIRING, not just the arithmetic.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { podeExportarBackup, renderSettings } from '../js/render/settings.js';
import { S } from '../js/state.js';
import { PARTES_DE_MUSICA } from '../js/partes.js';

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
  S.exportFontes = null;    // null = todas
  S.exportPartes = [...PARTES_DE_MUSICA];   // as caixas de Settings, sem 'livros'
  S.exportListas = true;
}

function botaoExportar(html) {
  const m = html.match(/<button class="btn-primary"[^>]*data-a="exportBackup"[^>]*>([\s\S]*?)<\/button>/);
  assert.ok(m, 'botão de exportar não encontrado no HTML');
  return { tag: m[0], texto: m[1] };
}

test('biblioteca só de livros, nada desmarcado: botão liga e promete os livros', () => {
  resetS();
  S.books = [{ id: 'b1' }, { id: 'b2' }, { id: 'b3' }];
  const { tag, texto } = botaoExportar(renderSettings());
  assert.ok(!tag.includes('disabled'), 'deveria estar habilitado');
  assert.match(texto, /3/, 'rótulo deveria citar os 3 livros');
});

test('biblioteca só de livros, Cifras desmarcada: botão desliga (era o bug)', () => {
  resetS();
  S.books = [{ id: 'b1' }, { id: 'b2' }, { id: 'b3' }];
  S.exportPartes = ['audio', 'pessoal']; // Cifras desmarcada
  const { tag } = botaoExportar(renderSettings());
  assert.ok(tag.includes('disabled'),
    'desmarcar uma parte tira o export do caso "completo" — sem isso o botão baixava um arquivo vazio');
});

test('40 músicas + 1 livro, Cifras E Áudio desmarcadas: botão desliga (era o bug)', () => {
  resetS();
  S.songs = Array.from({ length: 40 }, (_, i) => ({ id: `s${i}`, artistId: 'a1', fonte: 'X' }));
  S.books = [{ id: 'b1' }];
  S.exportPartes = ['pessoal']; // cifra e áudio desmarcadas — a guarda original
  const { tag } = botaoExportar(renderSettings());
  assert.ok(tag.includes('disabled'),
    'possuir um livro não pode reabilitar o botão que "nenhum conteúdo marcado" trava');
});

test('40 músicas + 1 livro, nada desmarcado: botão liga citando as músicas', () => {
  resetS();
  S.songs = Array.from({ length: 40 }, (_, i) => ({ id: `s${i}`, artistId: 'a1', fonte: 'X' }));
  S.books = [{ id: 'b1' }];
  const { tag, texto } = botaoExportar(renderSettings());
  assert.ok(!tag.includes('disabled'));
  assert.match(texto, /40/);
});

test('uma fonte escolhida (recorte) com livro na estante: exporta músicas, não promete livro', () => {
  resetS();
  S.songs = [{ id: 's1', artistId: 'a1', fonte: 'VJ' }, { id: 's2', artistId: 'a1', fonte: 'Outra' }];
  S.books = [{ id: 'b1' }];
  S.exportFontes = ['VJ'];
  const { tag, texto } = botaoExportar(renderSettings());
  assert.ok(!tag.includes('disabled'));
  assert.match(texto, /1/);           // 1 música da fonte VJ
  assert.doesNotMatch(texto, /livro/i);
});
