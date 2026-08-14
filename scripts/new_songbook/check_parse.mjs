// Conferência 1 das duas do /chord: a cifra está BEM FORMADA?
//
// Passa cada música de um .somaplay pelo `parseCifraText` do PRÓPRIO app — não
// por uma reimplementação — e acusa o defeito que não dá erro em lugar nenhum:
// linha que é de acordes na página e o app lê como letra. Quando isso acontece
// os acordes daquela linha somem da grade "Acordes desta música" e ficam
// intocáveis no player, embora o texto na tela pareça perfeito.
//
// A medida é a diferença entre dois conjuntos:
//   `cifra.acordes`  — o que o extrator viu ao montar a cifra
//   `extractChords`  — o que o app enxerga lendo o texto final
// Acorde no primeiro e não no segundo é linha reprovada pelo parser.
//
// Uso:
//   node scripts/new_songbook/check_parse.mjs <arquivo.somaplay> [-v]
import { readFileSync } from 'node:fs';
import { parseCifraText, extractChords, isChordTok, chordName } from '../../app/js/chords.js';

// Segunda medida, e a que acha o defeito que a primeira não pode achar.
//
// A primeira compara o que o extrator viu com o que o app vê — e desde que os
// dois passaram a usar o MESMO critério de acorde, ela só prova que estão de
// acordo, não que estão certos. Falta perguntar o que os DOIS estão perdendo.
//
// Estes cadernos não trazem grade de diagramas impressa, então a conferência
// "completa?" da recipe não tem contra o que cruzar. O substituto: varrer o
// texto com um molde LARGO de acorde e listar o que casa nele e o `isChordTok`
// recusa. É assim que se acha grafia que o app não lê — e foi assim que
// apareceu o `Bm7b5` destes cadernos.
// O molde exige um dígito ou acidente depois da raiz — sem isso "Ex" e "Bem"
// entram na conta. E a pergunta é feita ao `chordName`, não ao `isChordTok`
// cru: `chordName` já limpa o delimitador que ficou grudado ("F#m7)" → "F#m7"),
// e esses o app REGISTRA na grade. O que sobra é grafia que ele de fato não lê.
const MOLDE_LARGO = /^[A-G][#b]?(m|M|maj|min|dim|aug|sus|add)?[0-9#b][0-9#b()/+\-º°]*$/;

function readSomaplay(path) {
  const buf = readFileSync(path);
  // b'SOMAPLAY1\n' + 10 dígitos com o tamanho do JSON em BYTES + b'\n' + JSON;
  // os blobs vêm depois. São DOIS '\n', um em cada lado do tamanho, e errar
  // qualquer um dos dois faz o JSON.parse morrer longe daqui — com
  // "Unterminated string", que não parece erro de offset.
  const MAGIC = 'SOMAPLAY1\n';
  if (buf.subarray(0, MAGIC.length).toString('latin1') !== MAGIC) {
    throw new Error(`${path}: não é um .somaplay`);
  }
  const ini = MAGIC.length + 10 + 1;
  const n = parseInt(buf.subarray(MAGIC.length, MAGIC.length + 10).toString('latin1'), 10);
  return JSON.parse(buf.subarray(ini, ini + n).toString('utf8'));
}

const path = process.argv[2];
const verbose = process.argv.includes('-v');
const m = readSomaplay(path);
const artista = Object.fromEntries(m.artists.map((a) => [a.id, a.name]));

let ruins = 0;
let semAcorde = 0;
let totalLinhas = 0;
let linhasAcorde = 0;
const naoLidos = new Map();      // grafia recusada -> Set de músicas onde aparece

for (const s of m.songs) {
  const texto = s.cifra.texto || '';
  const parsed = parseCifraText(texto);
  const vistos = extractChords(parsed);
  const esperados = s.cifra.acordes || [];
  totalLinhas += texto.split('\n').length;
  linhasAcorde += parsed.filter((l) => l.hasChords).length;

  // Comparar como CONJUNTO e por NOME limpo: o extrator lista o token cru
  // ('Dm5-/7'), o app lista o nome que reconhece. A pergunta é se sumiu algum.
  const faltando = esperados.filter((c) => !vistos.includes(c));
  if (!vistos.length) semAcorde++;
  if (faltando.length) {
    ruins++;
    console.log(`  ⚠ ${s.title} (${artista[s.artistId]}) — ${faltando.length} acorde(s) que o app não vê: ${faltando.slice(0, 8).join(' ')}`);
    if (verbose) {
      for (const linha of texto.split('\n')) {
        const toks = linha.trim().split(/\s+/).filter(Boolean);
        if (toks.some((t) => faltando.includes(t))) console.log(`      |${linha}|`);
      }
    }
  }

  for (const tok of texto.split(/\s+/)) {
    if (!tok || isChordTok(chordName(tok)) || !MOLDE_LARGO.test(tok)) continue;
    if (!naoLidos.has(tok)) naoLidos.set(tok, new Set());
    naoLidos.get(tok).add(s.title);
  }
}

console.log(`\n${path.split('/').pop()}`);
console.log(`  ${m.songs.length} músicas, ${m.artists.length} artistas`);
console.log(`  ${totalLinhas} linhas, ${linhasAcorde} lidas como linha de acordes`);
console.log(`  ${semAcorde} música(s) sem acorde nenhum aos olhos do app`);
console.log(`  ${ruins} música(s) com acorde que o extrator viu e o app não`);

const afetadas = new Set([...naoLidos.values()].flatMap((v) => [...v]));
console.log(`  ${naoLidos.size} grafia(s) que parecem acorde e o app recusa, em ${afetadas.size} música(s):`);
for (const [tok, onde] of [...naoLidos].sort((a, b) => b[1].size - a[1].size)) {
  console.log(`      ${tok.padEnd(12)} ${onde.size}×  ${[...onde].slice(0, 3).join(', ')}${onde.size > 3 ? ', …' : ''}`);
}
process.exit(ruins || semAcorde ? 1 : 0);
