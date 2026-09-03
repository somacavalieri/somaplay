// Conferência 2 das duas do /chord: todo acorde da grade TEM diagrama?
//
// O que ela acusa é o card mudo: um nome em `cifra.acordes` que abre um
// diagrama vazio no app. Acontece de dois jeitos, e os dois já morderam este
// acervo — um nome composto que o dicionário não tem (`Dm7/G7`), e um nome
// tirado da grade impressa que não existe no texto da cifra.
//
// Por que não basta comparar `acordes` com `digitacoes`: uma música pode
// legitimamente não trazer digitação nenhuma e contar com o dicionário do app
// — é o padrão do `chordSVG`, e é o caso da versão transposta, cujas formas
// impressas em sua maioria não descem de casa. A pergunta certa é a que o app
// faz ao desenhar: existe forma para este nome, venha ela de onde vier?
//
// Uso:
//   node scripts/new_songbook/check_diagramas.mjs <arquivo.somaplay>

import { readFileSync } from 'node:fs';
import { shapesOf } from '../../app/js/chordbook.js';
import { chordSVG } from '../../app/js/chords.js';

const arq = process.argv[2];
if (!arq) {
  console.error('uso: check_diagramas.mjs <arquivo.somaplay>');
  process.exit(2);
}

// Mesmo contêiner do check_parse.mjs: b'SOMAPLAY1\n' + 10 dígitos com o
// tamanho do JSON em BYTES + b'\n' + JSON, e os blobs depois.
function readSomaplay(path) {
  const buf = readFileSync(path);
  const MAGIC = 'SOMAPLAY1\n';
  if (buf.subarray(0, MAGIC.length).toString('latin1') !== MAGIC) {
    throw new Error(`${path}: não é um .somaplay`);
  }
  const ini = MAGIC.length + 10 + 1;
  const n = parseInt(buf.subarray(MAGIC.length, MAGIC.length + 10).toString('latin1'), 10);
  return JSON.parse(buf.subarray(ini, ini + n).toString('utf8'));
}

const dados = readSomaplay(arq);
const musicas = dados.songs || dados.musicas || [];
let mudos = 0;
let quebrados = 0;

for (const s of musicas) {
  const dict = s.cifra?.digitacoes || {};
  const nomes = s.cifra?.acordes || [];
  const semForma = nomes.filter((n) => !dict[n] && shapesOf(n).length === 0);
  const daMusica = nomes.filter((n) => dict[n]).length;
  const doDicionario = nomes.length - daMusica - semForma.length;

  // A pergunta acima é "existe forma para este nome?", e uma digitação com o
  // FORMATO errado responde que sim: `{'Bm7': [-1,2,...]}` é truthy. Só que o
  // app não pergunta isso, ele DESENHA — e `chordSVG` faz `d.frets.filter(...)`,
  // que numa lista crua dá TypeError no meio do render da tela de tocar. A
  // música então aparece na lista e não abre ao clique, sem erro em lugar
  // nenhum, e esta conferência dizia "0 cards mudos". Três músicas do Caetano
  // vol. 2 passaram por aqui assim. Desenhar de verdade é a única pergunta que
  // não aceita essa resposta.
  const falhas = [];
  for (const n of nomes) {
    try { chordSVG(n, false, dict); chordSVG(n, true, dict); }
    catch (e) { falhas.push(`${n}: ${e.message}`); }
  }

  const marca = (semForma.length ? '  <<< CARD MUDO' : '') + (falhas.length ? '  <<< NÃO DESENHA' : '');
  console.log(
    `  ${s.title.padEnd(24)} ${String(nomes.length).padStart(2)} acordes` +
    ` | ${String(daMusica).padStart(2)} da música` +
    ` | ${String(doDicionario).padStart(2)} do dicionário${marca}`,
  );
  if (semForma.length) console.log(`      sem forma alguma: ${semForma.join(', ')}`);
  for (const f of falhas) console.log(`      chordSVG estourou -> ${f}`);
  mudos += semForma.length;
  quebrados += falhas.length;
}

console.log(`\n${musicas.length} música(s), ${mudos} card(s) mudo(s), ${quebrados} diagrama(s) que estouram no render`);
process.exit(mudos || quebrados ? 1 : 0);
