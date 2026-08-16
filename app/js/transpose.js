// transpose.js — transposição da cifra em texto. Puro, sem estado e sem DOM.
//
// IMPORTANTE: este é o único lugar do app autorizado a reescrever a cifra do
// usuário, e é exceção deliberada à regra do CLAUDE.md. Ver o porquê — e por
// que a reposição por coluna é o que a torna segura — em
// docs/superpowers/specs/2026-08-16-transposicao-design.md

import { chordLineSegs, chordName, isChordTok, parseCifraText } from './chords.js';

// Os doze nomes, sempre os mesmos. Não é armadura calculada por ciclo de
// quintas: é o array que a grade do CifraClub mostra (Am, Bbm, Bm, Cm, C#m, Dm,
// Ebm, Em, Fm, F#m, Gm, G#m) — bemol no Bb e no Eb, sustenido no C#, F# e G#.
// O preço é teórico e conhecido: uma música em F# escreve 'Bb' onde a teoria
// pede 'A#'. É o que o músico está acostumado a ler.
const NOTAS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];

// Na ENTRADA as duas grafias valem — a cifra escreve o que quiser, e o acervo
// tem as duas. Só a saída é canônica.
const INDICE = {
  C: 0, 'B#': 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, Fb: 4,
  F: 5, 'E#': 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9,
  'A#': 10, Bb: 10, B: 11, Cb: 11,
};

const RE_FUND = /^[A-G][#b]?/;

// A mesma regex que chord-notation.js usa para separar baixo de extensão. Na
// notação do CifraClub a barra tem os dois sentidos — 'D/F#' é baixo, 'Em7/5-'
// e 'A7/13' são extensão — e só o baixo se transpõe.
const NOTA = /^[A-G][#b]?$/;

// Desloca uma fundamental isolada. null quando não é nota.
function transporNota(nota, semitons) {
  const i = INDICE[nota];
  if (i === undefined) return null;
  return NOTAS[(((i + semitons) % 12) + 12) % 12];
}

// Desloca fundamental e baixo; qualidade, extensões e parênteses viajam
// intactos. Corta em TODAS as barras (há acorde com mais de uma) e desloca só
// os pedaços que são nota sozinha.
export function transporAcorde(nome, semitons) {
  // Deslocamento zero devolve o nome COMO ESTÁ. Sem isto, abrir a música já
  // renotava 'Db' para 'C#' — o app reescrevendo a grafia do usuário sem que
  // ninguém tivesse transposto nada. É a mesma guarda que transporLinha tem, e
  // a assimetria entre as duas era o bug.
  if (!semitons) return String(nome);
  const s = String(nome);
  const partes = s.split('/');
  const m = partes[0].match(RE_FUND);
  if (!m) return s;
  const raiz = transporNota(m[0], semitons);
  if (raiz === null) return s;
  partes[0] = raiz + partes[0].slice(m[0].length);
  for (let k = 1; k < partes.length; k++) {
    if (NOTA.test(partes[k])) partes[k] = transporNota(partes[k], semitons);
  }
  return partes.join('/');
}

// Transpõe uma linha de acordes REPONDO cada token na coluna original.
//
// O alinhamento da cifra é posicional: acorde e sílaba se encontram pela coluna
// do caractere, e 'C' tem 1 caractere enquanto 'C#' tem 2. Reescrever no lugar
// empurraria a linha inteira. Aqui cada token volta para a coluna de onde saiu,
// e só anda quando o vizinho anterior cresceu a ponto de encostar.
//
// A folga mínima é UM espaço: sem ela 'C' e 'G' em colunas vizinhas virariam
// 'C#G#' e deixariam de ser dois acordes — inclusive para o parser, que perderia
// a linha toda e com ela os acordes que estavam certos.
//
// Os segmentos de espaço são descartados de propósito: quem recria o espaçamento
// é o preenchimento até a coluna alvo. O acorde vem de `sg.name` (o nome limpo) e
// é costurado de volta em `sg.text`, que pode ter decoração — 'C*', '(Dm', 'Gm7)'.
export function transporLinha(linha, semitons) {
  const s = String(linha);
  if (!semitons) return s;
  let out = '';
  let col = 0;
  for (const sg of chordLineSegs(s)) {
    const larg = sg.text.length;
    if (!/\S/.test(sg.text)) { col += larg; continue; }
    const texto = sg.isChord
      ? sg.text.replace(sg.name, transporAcorde(sg.name, semitons))
      : sg.text;
    const alvo = out.length === 0 ? col : Math.max(col, out.length + 1);
    out += ' '.repeat(alvo - out.length) + texto;
    col += larg;
  }
  return out;
}

// Fundamental e modo de um tom. O 'm' do modo menor não pode ser o 'm' de
// 'maj7' — daí o lookahead negativo.
const RE_TOM = /^([A-G][#b]?)(m(?!aj))?/;

// O campo `tom` é texto livre (render/addedit.js:160). Só vale o que o parser já
// reconhece como acorde — 'Am', 'C', 'C#m', 'Am7'. Qualquer outra coisa ('E com
// capuz na 2ª', vazio) não é tom, e quem chama cai na regra do palpite.
export function leTom(tom) {
  const s = String(tom == null ? '' : tom).trim();
  if (!s || !isChordTok(s)) return null;
  const m = s.match(RE_TOM);
  return m ? { raiz: m[1], menor: !!m[2] } : null;
}

// Rótulo do tom depois de deslocar. Preserva o modo: C#m +2 = Ebm.
export function tomDeSemitons(tom, semitons) {
  const p = leTom(tom);
  if (!p) return null;
  return transporNota(p.raiz, semitons) + (p.menor ? 'm' : '');
}

// Ordem ALFABÉTICA, não cromática — é a ordem da grade na referência.
const ALFABETICA = ['A', 'Bb', 'B', 'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#'];

// Os doze tons da grade, no modo do tom original: 'C#m' mostra doze menores.
export function gradeDeTons(tom) {
  const p = leTom(tom);
  if (!p) return [];
  return ALFABETICA.map((n) => n + (p.menor ? 'm' : ''));
}

// Quantos semitons separam dois tons, em 0–11. É o que a grade precisa: tocar
// em 'Ebm' com o original em 'C#m' define S.transpose = 2.
export function semitonsEntre(tomOrigem, tomDestino) {
  const a = leTom(tomOrigem);
  const b = leTom(tomDestino);
  if (!a || !b) return null;
  return (((INDICE[b.raiz] - INDICE[a.raiz]) % 12) + 12) % 12;
}

// Palpite de tom pelo último acorde: cifra popular quase sempre termina no tom.
// Reduz a fundamental mais modo e descarta o resto — 'G7' vira 'G', 'F#m7(b5)'
// vira 'F#m'. É palpite de TOM, não catalogação de acorde.
//
// Erra na relativa menor: 'Em' e 'G' têm os mesmos acordes, e nada no texto
// separa os dois. Por isso quem exibe marca como chute — ver render/play.js.
export function deduzTom(parsed) {
  const linhas = parsed || [];
  for (let i = linhas.length - 1; i >= 0; i--) {
    if (!linhas[i].hasChords) continue;
    const toks = String(linhas[i].chords).trim().split(/\s+/).filter(Boolean);
    for (let k = toks.length - 1; k >= 0; k--) {
      const nome = chordName(toks[k]);
      if (!isChordTok(nome)) continue;
      const m = nome.match(RE_TOM);
      if (m && INDICE[m[1]] !== undefined) return m[1] + (m[2] ? 'm' : '');
    }
  }
  return null;
}

// Tom entre parênteses no fim do título. SUBSTITUI quando já há um: testar três
// tons em sequência produziria 'Wave (Bb) (C) (D)'. Só casa o que parece tom —
// 'Wave (ao vivo)' fica inteiro.
const RE_TOM_NO_TITULO = /\s*\([A-G][#b]?m?\)\s*$/;

export function tituloNoTom(title, tom) {
  return `${String(title).replace(RE_TOM_NO_TITULO, '')} (${tom})`;
}

// Transpõe uma cifra inteira preservando tudo o que não é linha de acordes.
// Quem decide o que é linha de acordes é o parser, não uma heurística nova — e
// ele devolve as linhas normalizadas, então o texto é remontado a partir delas
// na mesma ordem em que o parser as separa: seção, acordes, tab, letra.
export function textoTransposto(texto, semitons) {
  if (!semitons) return texto;
  return parseCifraText(texto).map((l) => {
    const partes = [];
    if (l.isSection) partes.push(l.section);
    if (l.hasChords) partes.push(transporLinha(l.chords, semitons));
    if (l.isTab) partes.push(...l.tab);
    if (l.hasLyric) partes.push(l.lyric);
    return partes.join('\n');
  }).join('\n');
}
