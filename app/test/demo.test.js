// demo.test.js — o arquivo da demo, lido pelo MESMO leitor que o app usa.
//
// O gerador (scripts/demo/gerar-demo.mjs) escreve o contêiner por conta própria.
// É este teste que impede o formato de divergir: se o cabeçalho, a ordem dos
// blobs ou os campos da música saírem do lugar, lerManifest reclama aqui, e não
// no tablet de alguém.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { lerManifest } from '../js/backup.js';

const CAMINHO = fileURLToPath(new URL('../demo/soma_play-demo.somaplay', import.meta.url));
const bytes = await readFile(CAMINHO);
const arquivo = new File([bytes], 'soma_play-demo.somaplay');
const { manifest, blobsStart } = await lerManifest(arquivo);

test('o arquivo declara cifra e áudio, e nada além disso', () => {
  // 'pessoal' traria settings e trocaria o tema de quem só quis experimentar.
  assert.deepEqual(manifest.partes, ['cifra', 'audio']);
  assert.equal(manifest.settings, undefined);
  assert.equal(manifest.chordbook, undefined);
});

test('uma música, com id fixo e fonte Demo', () => {
  assert.equal(manifest.songs.length, 1);
  const s = manifest.songs[0];
  assert.equal(s.id, 'demo-groove-de-teste');
  assert.equal(s.fonte, 'Demo');
  assert.equal(s.title, 'Groove de teste');
  assert.equal(s.cifra.tipo, 'texto');
  assert.ok(s.letra.trim(), 'sem letra não há karaokê (T3)');
});

test('campos de "pessoal" não viajam', () => {
  const s = manifest.songs[0];
  assert.equal(s.favorita, undefined);
  assert.equal(s.createdAt, undefined);
});

test('os quatro canais apontam para blobs que existem no arquivo', () => {
  const s = manifest.songs[0];
  assert.equal(s.stems.length, 4);
  const ids = new Set(manifest.blobs.map((b) => b.id));
  for (const st of s.stems) assert.ok(ids.has(st.blobId), `stem sem blob: ${st.blobId}`);
});

test('os offsets fecham: cabeçalho + blobs é o arquivo inteiro', () => {
  const soma = manifest.blobs.reduce((n, b) => n + b.size, 0);
  assert.equal(blobsStart + soma, bytes.length);
});

test('o artista tem nome e avatar, como qualquer artista da biblioteca', () => {
  assert.equal(manifest.artists.length, 1);
  assert.equal(manifest.artists[0].name, 'Demonstração');
  assert.ok(manifest.artists[0].av, 'sem `av` o card do artista fica sem cor');
});
