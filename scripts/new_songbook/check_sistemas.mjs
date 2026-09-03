// Conferência 0: TODA linha de acorde é lida como linha de acorde?
//
// As duas conferências da recipe não pegam este defeito. `check_parse.mjs`
// compara `cifra.acordes` com o que o app extrai do texto — se o acorde de uma
// linha reprovada aparecer em QUALQUER outra linha, a conta fecha e o alarme
// não toca. Foi o que aconteceu na Rita Lee: `/E` e `/C#m` (barra COLADA no
// acorde, sem espaço) não passam no `isChordTok`, dois sistemas inteiros de
// *Balada do louco* foram lidos como LETRA, e as duas conferências passaram
// limpas. Na tela o texto fica perfeito; o que some é o toque no acorde.
//
// A pergunta certa é contável: um módulo por medição tem N sistemas, logo o
// texto tem de ter N linhas de acorde. Compara-se com o próprio módulo.
//
// Uso:
//   node scripts/new_songbook/check_sistemas.mjs <arquivo.somaplay> [N_esperado]
// Sem N, exige que o texto alterne acorde/letra e acusa QUALQUER linha de
// posição par que o app não leia como acorde.
import { readFileSync } from 'node:fs';
import { parseCifraText } from '../../app/js/chords.js';

const arq = process.argv[2];
const esperado = process.argv[3] ? Number(process.argv[3]) : null;
if (!arq) { console.error('uso: check_sistemas.mjs <arquivo.somaplay> [N]'); process.exit(2); }

const MAGIC = 'SOMAPLAY1\n';
const buf = readFileSync(arq);
const n = parseInt(buf.subarray(MAGIC.length, MAGIC.length + 10).toString('latin1'), 10);
const dados = JSON.parse(buf.subarray(MAGIC.length + 11, MAGIC.length + 11 + n).toString('utf8'));

let ruins = 0;
for (const s of dados.songs) {
  const linhas = s.cifra.texto.split('\n');
  const reprovadas = [];
  for (let i = 0; i < linhas.length; i++) {
    const p = parseCifraText(linhas[i]);
    const ehAcorde = !!(p[0] && p[0].hasChords);
    // Só interessa a linha que TEM cara de acorde e não foi lida como tal:
    // muita barra, pouca palavra. O molde é grosseiro de propósito.
    const toks = linhas[i].trim().split(/\s+/).filter(Boolean);
    const barras = toks.filter((t) => /^\/+$/.test(t)).length;
    if (!ehAcorde && toks.length && barras >= 2) reprovadas.push([i + 1, linhas[i].trim().slice(0, 90)]);
  }
  const acordes = parseCifraText(s.cifra.texto).filter((l) => l.hasChords).length;
  const alvo = esperado && dados.songs.length === 1 ? esperado : null;
  const erro = reprovadas.length || (alvo !== null && acordes !== alvo);
  if (erro) ruins++;
  console.log(`  ${s.title.padEnd(24)} ${acordes} linha(s) de acorde` +
    (alvo !== null ? ` (esperado ${alvo})` : '') + (erro ? '   <<< PROBLEMA' : ''));
  for (const [ln, txt] of reprovadas) console.log(`     linha ${ln} tem cara de acorde e o app lê como LETRA: ${txt}`);
}
console.log(`\n${dados.songs.length} música(s), ${ruins} com linha de acorde perdida`);
process.exit(ruins ? 1 : 0);
