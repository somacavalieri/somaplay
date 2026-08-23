// changelog-precache.test.js — o número do precache no CHANGELOG bate com o
// disco (F13 do review final).
//
// A entrada da 0.16.0 dizia "o precache vai de ~1 MB para ~5,7 MB". Medido: o
// "1 MB" media a pasta app/ inteira (fontes, ícones, tudo), não o SHELL do
// Service Worker — uma medida diferente da que decide o tamanho real do
// precache. Este teste mede SHELL e VENDOR do jeito que shell.test.js já mede
// (regex sobre sw.js + tamanho em disco) e verifica que o CHANGELOG cita os
// números certos, não a estimativa antiga.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const APP = fileURLToPath(new URL('..', import.meta.url));
const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SW = readFileSync(APP + 'sw.js', 'utf8');
const CHANGELOG = readFileSync(ROOT + 'CHANGELOG.md', 'utf8');

function paths(nome) {
  const m = SW.match(new RegExp(`const ${nome} = \\[([\\s\\S]*?)\\];`));
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

function totalBytes(lista) {
  return lista.reduce((soma, p) => {
    const rel = p === './' ? 'index.html' : p;
    if (!existsSync(APP + rel)) return soma; // shell.test.js já cobre "existe"
    return soma + statSync(APP + rel).size;
  }, 0);
}

// MB decimal (1e6), a mesma escala que a spec e o CHANGELOG usam para "MB".
const mb = (bytes) => bytes / 1e6;

// A tolerância que este teste aceita entre o número escrito e o disco de
// verdade — NÃO igualdade a centésimo de MB. SHELL pesa ~769 KB: bastam
// ~700 bytes a mais (um módulo novo, a regra do próprio projeto — "todo
// módulo novo entra no SHELL") para o `.toFixed(2)` mudar de "0.77" para
// "0.78", e a única correção que esse tipo de comparação aceitaria seria
// reescrever uma nota de release já publicada, o que este projeto trata como
// registro histórico, não como algo para editar a cada byte. 5% cobre
// arredondamento de exibição e um punhado de arquivos indo e vindo do SHELL/
// VENDOR sem deixar de pegar a regressão que interessa: alguém trocando o
// número de volta para a estimativa antiga (uma discrepância de dezenas de
// por cento, não de fração de um).
const TOLERANCIA = 0.05;
const dentroDaFaixa = (medido, escrito) => Math.abs(escrito - medido) <= medido * TOLERANCIA;

// Todo número "~X MB" (X com ponto OU vírgula decimal) escrito no bloco.
function numerosEmMB(texto) {
  return [...texto.matchAll(/~(\d+(?:[.,]\d+)?) ?MB/g)].map((m) => parseFloat(m[1].replace(',', '.')));
}

test('a entrada 0.16.0 do CHANGELOG não repete a estimativa antiga (~1 MB / ~5,7 MB)', () => {
  const bloco = CHANGELOG.slice(CHANGELOG.indexOf('## [0.16.0]'), CHANGELOG.indexOf('## [0.15.0]'));
  assert.ok(!/~1[.,]0? ?MB/.test(bloco), 'ainda cita "~1 MB" — essa era a pasta app/ inteira, não o SHELL');
  assert.ok(!/5[.,]7 ?MB/.test(bloco), 'ainda cita "~5,7 MB" — o total medido é outro');
});

test('a entrada 0.16.0 do CHANGELOG cita SHELL, VENDOR e o total dentro de 5% do disco', () => {
  const shellMB = mb(totalBytes(paths('SHELL')));
  const vendorMB = mb(totalBytes(paths('VENDOR')));
  const totalMB = shellMB + vendorMB;
  const bloco = CHANGELOG.slice(CHANGELOG.indexOf('## [0.16.0]'), CHANGELOG.indexOf('## [0.15.0]'));
  const escritos = numerosEmMB(bloco);
  assert.ok(escritos.length >= 3,
    `esperava pelo menos 3 números "~X MB" no bloco (SHELL, VENDOR, total); achei ${escritos.length}: ${bloco}`);
  // Cada medida real precisa ter PELO MENOS UM número escrito perto dela —
  // não comparamos posição a posição porque a frase pode reordenar os três
  // sem deixar de estar certa. O que este teste pretende pegar é a prosa se
  // afastando dos bytes de verdade — em qualquer direção, em qualquer ordem.
  for (const [rotulo, medido] of [['SHELL', shellMB], ['VENDOR', vendorMB], ['total', totalMB]]) {
    assert.ok(escritos.some((e) => dentroDaFaixa(medido, e)),
      `nenhum número do CHANGELOG está a ${TOLERANCIA * 100}% do ${rotulo} medido `
      + `(~${medido.toFixed(2)} MB); números citados: ${escritos.join(', ')}`);
  }
});
