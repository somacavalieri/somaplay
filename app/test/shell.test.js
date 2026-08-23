// shell.test.js — o array SHELL do Service Worker precisa bater com o disco.
//
// Duas maneiras de quebrar o app offline, ambas silenciosas em desenvolvimento
// (onde o servidor entrega qualquer arquivo) e visíveis só depois de instalado:
//
//   1. Um caminho no SHELL que não existe → cache.addAll() rejeita inteiro e a
//      instalação do Service Worker falha.
//   2. Um módulo novo que ninguém pôs no SHELL → não é pré-cacheado, e o app
//      abre quebrado sem internet.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const APP = fileURLToPath(new URL('..', import.meta.url));
const SW = readFileSync(APP + 'sw.js', 'utf8');

const shell = [...SW.match(/const SHELL = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)]
  .map((m) => m[1]);

function modulesOnDisk(dir = 'js') {
  return readdirSync(APP + dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? (e.name === 'vendor' ? [] : modulesOnDisk(`${dir}/${e.name}`))
      : e.name.endsWith('.js') ? [`./${dir}/${e.name}`] : []);
}

const vendor = [...SW.match(/const VENDOR = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)]
  .map((m) => m[1]);

function vendorOnDisk(dir = 'js/vendor') {
  if (!existsSync(APP + dir)) return [];
  return readdirSync(APP + dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? vendorOnDisk(`${dir}/${e.name}`) : [`./${dir}/${e.name}`]);
}

test('todo caminho do SHELL existe em disco', () => {
  // './' é a raiz servida, que resolve para index.html
  const faltando = shell.filter((p) => !existsSync(APP + (p === './' ? 'index.html' : p)));
  assert.deepEqual(faltando, [], `caminhos no SHELL sem arquivo: ${faltando.join(', ')}`);
});

test('todo módulo JS do app está registrado no SHELL', () => {
  const faltando = modulesOnDisk().filter((m) => !shell.includes(m));
  assert.deepEqual(faltando, [],
    `módulos fora do SHELL (quebram o app offline): ${faltando.join(', ')}`);
});

test('o SHELL não tem entradas duplicadas', () => {
  const vistos = new Set();
  const dup = shell.filter((p) => vistos.has(p) || (vistos.add(p), false));
  assert.deepEqual(dup, [], `duplicados no SHELL: ${dup.join(', ')}`);
});

test('VERSION segue o formato somaplay-X.Y.Z', () => {
  const m = SW.match(/const VERSION = '([^']+)'/);
  assert.ok(m, 'VERSION não encontrado em sw.js');
  assert.match(m[1], /^somaplay-\d+\.\d+\.\d+$/, `VERSION fora do formato: ${m[1]}`);
});

test('todo arquivo vendorizado está no VENDOR do Service Worker', () => {
  // Sem isto, um .wasm esquecido some offline e o livro escaneado abre em branco
  // — falha que só aparece no tablet, depois de instalado.
  const naoPrecacheados = vendorOnDisk().filter((f) => !vendor.includes(f) && !f.endsWith('.md'));
  assert.deepEqual(naoPrecacheados, [],
    `arquivos em js/vendor fora do VENDOR: ${naoPrecacheados.join(', ')}`);
});

test('todo caminho do VENDOR existe em disco', () => {
  const faltando = vendor.filter((p) => !existsSync(APP + p));
  assert.deepEqual(faltando, [], `caminhos no VENDOR sem arquivo: ${faltando.join(', ')}`);
});
