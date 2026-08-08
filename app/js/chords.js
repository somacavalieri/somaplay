// chords.js — diagramas SVG e parser de cifra em texto.
// As formas (voicings) vivem no catálogo (chords-catalog.js); aqui só o desenho.
// Portado do design visual aprovado (Soma Play.html).
import { defaultShape } from './chordbook.js';

// Token parece um acorde? Aceita extensões entre parênteses — 7(b5), 7(13) — e,
// depois da barra, tanto o baixo (D/F#, Cm6/Eb) quanto a extensão no estilo
// CifraClub (Bm5-/7, A7/13, Em7/5-, E7/4(9)).
// O diminuto vem em dois caracteres diferentes: '°' (U+00B0, grau) e 'º' (U+00BA,
// ordinal masculino, o que o CifraClub usa). Os dois têm de valer — senão uma
// linha como "A  A7M  A#º" deixa de ser linha de acordes e a cifra desanda.
export function isChordTok(t) {
  return /^[A-G][#b]?(m|maj|min|dim|aug|sus2|sus4|sus|add\d+|M|°|º|\+|-|\d)*(\([^)]{1,7}\))*(\/([A-G][#b]?|\d+[M+\-#b]?))*(\([^)]{1,7}\))*$/.test(t);
}

// A fonte às vezes cola no acorde algo que não é acorde: asterisco ou ponto de
// nota de rodapé ("C*", "F#m7(b5)*", "E."), ou o delimitador de um trecho que
// ficou grudado ("(Dm", "Gm7)", "[A#m7"). chordName devolve o acorde limpo — é
// ele que reconhece, desenha o diagrama e abre o popover. O token cru continua
// na tela: o alinhamento acorde↔sílaba depende de cada caractere.
export function chordName(tok) {
  if (isChordTok(tok)) return tok;                      // "Bm7(b5)": parêntese é extensão
  const semNota = String(tok).replace(/[*.]+$/, '');
  if (isChordTok(semNota)) return semNota;
  const semDelim = semNota.replace(/^[([]+/, '').replace(/[)\]]+$/, '');
  return isChordTok(semDelim) ? semDelim : tok;
}

// Quando dois acordes caem em colunas vizinhas, a fonte às vezes os entrega sem
// espaço entre eles: "E7(13)E7(b13)". Um token desses não é acorde e, pela regra da
// linha (todos os tokens têm de ser acorde ou marca), derrubava a linha inteira —
// os acordes vizinhos, que estão certos, ficavam brancos e intocáveis junto com ele.
// Parte por busca gulosa da esquerda; só vale se o token todo virar 2+ acordes.
// A guarda é o que torna isso seguro: só se tenta partir token que tenha um caractere
// impossível numa palavra de letra. Sem ela, uma linha em maiúsculas feita só de notas
// A-G ("CADE FACE") viraria linha de acordes. O preço é não partir "AmD" — colagem de
// tríades simples, que é justamente onde a ambiguidade com palavra mora.
const COLAGEM = /[0-9()#°º+/]/;
export function splitChordTok(tok) {
  const s = String(tok);
  if (isChordTok(s) || !COLAGEM.test(s)) return null;
  const out = [];
  let resto = s;
  while (resto) {
    let corte = 0;
    for (let n = resto.length; n > 0; n--) if (isChordTok(resto.slice(0, n))) { corte = n; break; }
    if (!corte) return null;                    // sobra que não é acorde anula a partição
    out.push(resto.slice(0, corte));
    resto = resto.slice(corte);
  }
  return out.length > 1 ? out : null;
}

// Acordes que um token carrega: ele próprio quando é acorde, os pedaços quando é
// colagem, nenhum quando não é. A partição roda no token cru — assim os pedaços são
// sempre fatias exatas dele e o texto na tela não muda um byte.
function chordsOfTok(tok) {
  const nome = chordName(tok);
  if (isChordTok(nome)) return [nome];
  return splitChordTok(tok) || [];
}

// Marcas que dividem a linha com os acordes sem serem acorde: repetição/compasso,
// ornamentos e setas da fonte ("^^^", "->", "!---->"), delimitador de trecho que
// ficou sozinho, e digitação inline ("x2x243").
// A barra solta entra aqui porque parte das introduções do CifraClub separa os
// acordes com ela — "Introdução: D / G / Em / A7 / D6/9 / % /". Só vale a barra
// isolada: colada no acorde ela continua sendo baixo ou extensão (D6/9, Bm5-/7).
const MARK = /^(N\.C\.|%|\|+|x\d+|\(\d+x\)|[-^!>~*.…()[\]/]+|(?=[\dxX]*[xX])(?=[\dxX]*\d)[\dxX]{4,})$/i;
const isChordOrMark = (t) => chordsOfTok(t).length > 0 || MARK.test(t);

// Rótulos convivem com acordes na mesma linha no estilo CifraClub — "[Intro] Em7
// Am7", "Fm7  Bb/D  [Frase 1]". Mas um trecho entre parênteses pode ser só
// acordes: "( G  F  G  F )". Daí a regra em stripLabels: trecho cujo conteúdo é
// todo acorde/marca permanece (só os delimitadores saem); qualquer outro é rótulo
// e sai inteiro.
// Dois detalhes do casamento: (a) só conta como trecho o que abre e fecha em
// fronteira de token, porque parêntese colado no acorde é extensão dele —
// "Am7(9)/G" — e apagá-lo partiria o acorde em dois; (b) o trecho aceita um nível
// de aninhamento, senão a extensão o fecharia cedo: "( C4+(9)  C9  C2(9)  G5 )".
const LABEL = /(?<=^|\s)(?:\[[^\]]*\]|\((?:[^()]|\([^()]*\))*\))(?=\s|$)/g;

// Parte das cifras escreve o rótulo com dois-pontos em vez de colchetes —
// "Intro: Am  G  F", "INTRO : E". Só no começo da linha e só uma palavra, senão
// "Ela disse: ..." entraria na conta.
const LABEL_DOISPONTOS = /^\s*\p{L}[\p{L}\p{M}]*\s*:/u;

// Tira os rótulos da linha trocando-os por espaço do mesmo tamanho: isChordLine
// não pode deslocar as colunas, que o alinhamento acorde↔sílaba depende delas.
function stripLabels(line) {
  return String(line)
    .replace(LABEL_DOISPONTOS, (m) => ' '.repeat(m.length))
    .replace(LABEL, (span) => {
      const inner = span.slice(1, -1);
      const toks = inner.trim().split(/\s+/).filter(Boolean);
      return toks.length && toks.every(isChordOrMark) ? ` ${inner} ` : ' '.repeat(span.length);
    });
}

// Linha é "linha de acordes"? — fora os rótulos, todos os tokens são acordes ou
// marcas, e ao menos um é acorde de verdade (linha só de ornamento é letra).
function isChordLine(line) {
  const toks = stripLabels(line).trim().split(/\s+/).filter(Boolean);
  if (!toks.length) return false;
  if (!toks.some((t) => chordsOfTok(t).length)) return false;
  return toks.every(isChordOrMark);
}

// Parser de cifra colada (estilo CifraClub): [Seção] / linha de acordes / letra.
// Retorna linhas normalizadas: { isSection, section, hasChords, chords, hasLyric, lyric }
export function parseCifraText(text) {
  const out = [];
  const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (!trimmed) { out.push({ lyric: ' ' }); i++; continue; }
    if (/^\[.+\]$/.test(trimmed)) { out.push({ section: trimmed }); i++; continue; }
    if (isChordLine(raw)) {
      const next = lines[i + 1];
      if (next !== undefined && next.trim() && !isChordLine(next) && !/^\[.+\]$/.test(next.trim())) {
        out.push({ chords: raw.replace(/\s+$/, ''), lyric: next.replace(/\s+$/, '') });
        i += 2;
      } else {
        out.push({ chords: raw.replace(/\s+$/, '') });
        i++;
      }
      continue;
    }
    out.push({ lyric: raw.replace(/\s+$/, '') });
    i++;
  }
  return out.map((l) => ({
    section: l.section || '', isSection: !!l.section,
    chords: l.chords || '', hasChords: !!l.chords,
    lyric: l.lyric || '', hasLyric: !!l.lyric,
  }));
}

// Extrai acordes únicos das linhas de acordes (ordem de aparição), pelo nome limpo
export function extractChords(parsed) {
  const out = [];
  parsed.forEach((l) => {
    if (!l.hasChords) return;
    l.chords.trim().split(/\s+/).forEach((t) => {
      if (t) chordsOfTok(t).forEach((nome) => { if (!out.includes(nome)) out.push(nome); });
    });
  });
  return out;
}

// Segmentos da linha de acordes para render tocável: split preservando os
// espaços (grupos capturados) — concatenar os text reproduz a linha byte a
// byte, obrigatório para o white-space:pre não desalinhar acorde↔sílaba.
// text = o que vai na tela; name = o acorde para diagrama/popover.
// Token colado vira um segmento por acorde: os pedaços são fatias do token, então
// concatenar continua devolvendo a linha.
export function chordLineSegs(line) {
  return String(line).split(/(\s+)/).filter((t) => t !== '')
    .flatMap((t) => {
      if (/\s/.test(t[0])) return [{ text: t, name: t, isChord: false }];
      const pedacos = splitChordTok(t);
      if (pedacos) return pedacos.map((p) => ({ text: p, name: p, isChord: true }));
      const nome = chordName(t);
      return [{ text: t, name: nome, isChord: isChordTok(nome) }];
    });
}

// Layout da fileira de miniaturas (spec 2026-07-20): tokens da linha de acordes
// → posição x (px) na coluna do caractere (fonte mono), colisões empurram para
// a direita e o empurrão se propaga. blockWidth(tok, isChord) → largura px.
// Rótulo entre colchetes conta como um token só: "[Frase 1]" tem espaço dentro e
// partido em dois viraria "[Frase    1]" depois que a miniatura empurra o resto.
export function layoutChordRow(chordLine, chPx, blockWidth, gap = 6) {
  const out = [];
  let cursor = 0;
  const re = /\[[^\]]*\]|\S+/g;
  let m;
  while ((m = re.exec(chordLine))) {
    const tok = m[0];
    const pedacos = splitChordTok(tok);
    // Token colado rende uma miniatura por acorde, cada uma na coluna do seu 1º caractere.
    let col = m.index;
    const partes = pedacos
      ? pedacos.map((p) => { const parte = { tok: p, name: p, isChord: true, col }; col += p.length; return parte; })
      : [{ tok, name: chordName(tok), isChord: isChordTok(chordName(tok)), col }];
    partes.forEach((p) => {
      const x = Math.max(p.col * chPx, cursor);
      out.push({ tok: p.tok, name: p.name, isChord: p.isChord, x });
      cursor = x + blockWidth(p.tok, p.isChord) + gap;
    });
  }
  return out;
}

// Margem esquerda do indicador de casa (ex.: "3ª") — 0 quando a forma começa na 1ª posição.
function diagLm(d, small) {
  if (!d) return 0;
  const FR = 4;
  const p = d.frets.filter((f) => f > 0);
  const mx = p.length ? Math.max(...p) : 1, mn = p.length ? Math.min(...p) : 1;
  return (mx <= FR ? 1 : mn) > 1 ? (small ? 12 : 15) : 0;
}

// Largura total (px) do SVG que chordSVG(name, small, dict) gera — permite ao
// layout das miniaturas inline calcular posições sem renderizar o SVG.
export function chordDiagWidth(name, small, dict) {
  const d = (dict && dict[name]) || defaultShape(name);
  return (small ? 64 : 84) + diagLm(d, small);
}

// Diagrama SVG do acorde (portado do design; dict = digitações da música)
export function chordSVG(name, small, dict) {
  const d = (dict && dict[name]) || defaultShape(name);
  const W0 = small ? 64 : 84, H = small ? 80 : 104;
  const padX = small ? 9 : 11, padTop = small ? 17 : 21, padBot = small ? 7 : 9;
  const S = 6, FR = 4, gh = H - padTop - padBot;
  const lm = diagLm(d, small);
  const W = W0 + lm, gw = W0 - padX * 2;
  const cs = gw / (S - 1), rs = gh / FR, xOf = (i) => padX + lm + i * cs;
  const strCol = 'var(--muted2)', dotCol = 'var(--accent)', nutCol = 'var(--muted3)', mkCol = 'var(--muted3)', txtCol = 'var(--muted)';
  let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" fill="none" xmlns="http://www.w3.org/2000/svg">';
  if (!d) {
    for (let r = 0; r <= FR; r++) { const y = padTop + r * rs; s += '<line x1="' + xOf(0) + '" y1="' + y + '" x2="' + xOf(S - 1) + '" y2="' + y + '" stroke="' + strCol + '" stroke-width="1"/>'; }
    for (let i = 0; i < S; i++) s += '<line x1="' + xOf(i) + '" y1="' + padTop + '" x2="' + xOf(i) + '" y2="' + (padTop + gh) + '" stroke="' + strCol + '" stroke-width="1"/>';
    s += '<text x="' + (W / 2) + '" y="' + (padTop + gh / 2 + 5) + '" text-anchor="middle" font-size="18" fill="' + txtCol + '" font-family="Sora">?</text></svg>';
    return s;
  }
  const fr = d.frets, pos = fr.filter((f) => f > 0);
  const minPos = pos.length ? Math.min(...pos) : 1;
  const maxPos = pos.length ? Math.max(...pos) : 1;
  const base = maxPos <= FR ? 1 : minPos;
  for (let r = 0; r <= FR; r++) {
    const y = padTop + r * rs;
    const sw = (base === 1 && r === 0) ? (small ? 3 : 4) : 1;
    s += '<line x1="' + xOf(0) + '" y1="' + y + '" x2="' + xOf(S - 1) + '" y2="' + y + '" stroke="' + nutCol + '" stroke-width="' + sw + '"/>';
  }
  for (let i = 0; i < S; i++) s += '<line x1="' + xOf(i) + '" y1="' + padTop + '" x2="' + xOf(i) + '" y2="' + (padTop + gh) + '" stroke="' + strCol + '" stroke-width="1"/>';
  if (base > 1) s += '<text x="' + (padX + lm - 4) + '" y="' + (padTop + rs * 0.72) + '" text-anchor="end" font-size="' + (small ? 9 : 11) + '" fill="' + txtCol + '" font-family="Inter">' + base + 'ª</text>';
  for (let i = 0; i < S; i++) {
    const f = fr[i], x = xOf(i), y = padTop - (small ? 6 : 8);
    if (f === -1) {
      const r = small ? 2.5 : 3.1;
      s += '<line x1="' + (x - r) + '" y1="' + (y - r) + '" x2="' + (x + r) + '" y2="' + (y + r) + '" stroke="' + mkCol + '" stroke-width="1.4"/><line x1="' + (x - r) + '" y1="' + (y + r) + '" x2="' + (x + r) + '" y2="' + (y - r) + '" stroke="' + mkCol + '" stroke-width="1.4"/>';
    } else if (f === 0) {
      const r = small ? 2.7 : 3.3;
      s += '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" stroke="' + mkCol + '" stroke-width="1.3"/>';
    }
  }
  if (d.barre) {
    const row = d.barre.fret - base + 1;
    if (row >= 1 && row <= FR) {
      const y = padTop + (row - 0.5) * rs, x1 = xOf(d.barre.from), x2 = xOf(d.barre.to), th = small ? 7 : 9;
      s += '<rect x="' + (x1 - th / 2) + '" y="' + (y - th / 2) + '" width="' + (x2 - x1 + th) + '" height="' + th + '" rx="' + (th / 2) + '" fill="' + dotCol + '"/>';
    }
  }
  const rDot = small ? 4 : 5;
  for (let i = 0; i < S; i++) {
    const f = fr[i];
    if (f > 0) {
      if (d.barre && f === d.barre.fret && i >= d.barre.from && i <= d.barre.to) continue;
      const row = f - base + 1;
      if (row >= 1 && row <= FR) {
        const y = padTop + (row - 0.5) * rs;
        s += '<circle cx="' + xOf(i) + '" cy="' + y + '" r="' + rDot + '" fill="' + dotCol + '"/>';
      }
    }
  }
  return s + '</svg>';
}
