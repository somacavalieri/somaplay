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
const mb = (bytes) => (bytes / 1e6).toFixed(2);

test('a entrada 0.16.0 do CHANGELOG não repete a estimativa antiga (~1 MB / ~5,7 MB)', () => {
  const bloco = CHANGELOG.slice(CHANGELOG.indexOf('## [0.16.0]'), CHANGELOG.indexOf('## [0.15.0]'));
  assert.ok(!/~1[.,]0? ?MB/.test(bloco), 'ainda cita "~1 MB" — essa era a pasta app/ inteira, não o SHELL');
  assert.ok(!/5[.,]7 ?MB/.test(bloco), 'ainda cita "~5,7 MB" — o total medido é outro');
});

test('a entrada 0.16.0 do CHANGELOG cita o SHELL e o VENDOR medidos de verdade', () => {
  const shellMB = mb(totalBytes(paths('SHELL')));
  const vendorMB = mb(totalBytes(paths('VENDOR')));
  const totalMB = mb(totalBytes(paths('SHELL')) + totalBytes(paths('VENDOR')));
  const bloco = CHANGELOG.slice(CHANGELOG.indexOf('## [0.16.0]'), CHANGELOG.indexOf('## [0.15.0]'));
  // Comparado a duas casas decimais: o objetivo é pegar uma REGRESSÃO da
  // correção (alguém troca o número de volta para uma estimativa), não travar
  // o teste toda vez que um arquivo do SHELL mudar um byte — daí a tolerância
  // de duas casas, e não uma comparação byte a byte.
  assert.ok(bloco.includes(`~${shellMB.replace('.', ',')} MB`) || bloco.includes(`~${shellMB} MB`),
    `CHANGELOG não cita o SHELL medido (~${shellMB} MB): ${bloco}`);
  assert.ok(bloco.includes(`~${vendorMB.replace('.', ',')} MB`) || bloco.includes(`~${vendorMB} MB`),
    `CHANGELOG não cita o VENDOR medido (~${vendorMB} MB): ${bloco}`);
  assert.ok(bloco.includes(`~${totalMB.replace('.', ',')} MB`) || bloco.includes(`~${totalMB} MB`),
    `CHANGELOG não cita o total medido (~${totalMB} MB): ${bloco}`);
});
