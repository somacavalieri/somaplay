// version.test.js — a versão do app aparece em dois lugares e não pode divergir.
//
// O número é ao mesmo tempo o que o usuário lê em Ajustes e a chave do cache do
// Service Worker. Se os dois literais saírem de sincronia, a tela passa a mentir
// sobre qual versão está cacheada — que é exatamente o problema que o
// versionamento existe para resolver.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { VERSION } from '../js/version.js';

const APP = fileURLToPath(new URL('..', import.meta.url));
const SW = readFileSync(APP + 'sw.js', 'utf8');

test('a versão é X.Y.Z, só dígitos', () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/, `versão fora do formato: ${VERSION}`);
});

test('a chave de cache do Service Worker é somaplay-<versão>', () => {
  const m = SW.match(/const VERSION = '([^']+)';/);
  assert.ok(m, 'não achei `const VERSION = ...` em sw.js');
  assert.equal(m[1], `somaplay-${VERSION}`,
    `sw.js está em '${m[1]}' e js/version.js em '${VERSION}'`);
});

test('o CHANGELOG tem entrada para a versão atual', () => {
  const changelog = readFileSync(APP + '../CHANGELOG.md', 'utf8');
  assert.ok(changelog.includes(`## [${VERSION}]`),
    `CHANGELOG.md não tem "## [${VERSION}]" — subiu o número sem registrar o que mudou?`);
});
