// gerar-demo.mjs — writes app/demo/soma_play-demo.somaplay from the sources in
// this folder. Run it from the repo root:
//
//   node scripts/demo/gerar-demo.mjs
//
// The container is the one app/js/backup.js writes: MAGIC, the JSON length in
// ten digits, a newline, the JSON, then the blobs back to back in the order of
// manifest.blobs. app/test/demo.test.js reads the result with the app's own
// lerManifest, which is what keeps this writer honest.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARTISTA, MUSICA, STEMS } from './musica.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..', '..');
const SAIDA = join(RAIZ, 'app', 'demo', 'soma_play-demo.somaplay');
const MAGIC = 'SOMAPLAY1\n';

const bytesPorStem = [];
const stems = [];
for (const s of STEMS) {
  const bytes = await readFile(join(AQUI, 'stems', s.arquivo));
  const blobId = `demo-blob-${s.arquivo.replace('.mp3', '')}`;
  bytesPorStem.push({ bytes, meta: { id: blobId, size: bytes.length, type: 'audio/mpeg' } });
  stems.push({ id: s.id, name: s.name, blobId, fileName: s.arquivo, vol: s.vol, muted: false });
}

const manifest = {
  version: 1,
  app: 'soma_play',
  partes: ['cifra', 'audio'],
  artists: [ARTISTA],
  songs: [{ ...MUSICA, stems }],
  lists: [],
  books: [],
  blobs: bytesPorStem.map((b) => b.meta),
};

const json = JSON.stringify(manifest);
const cabecalho = MAGIC + String(Buffer.byteLength(json)).padStart(10, '0') + '\n' + json;
const arquivo = Buffer.concat([Buffer.from(cabecalho), ...bytesPorStem.map((b) => b.bytes)]);
await mkdir(dirname(SAIDA), { recursive: true });
await writeFile(SAIDA, arquivo);
console.log(`${SAIDA}\n${stems.length} canais · ${(arquivo.length / 1e6).toFixed(2)} MB`);
