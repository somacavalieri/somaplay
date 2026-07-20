// chords.js — diagramas SVG e parser de cifra em texto.
// As formas (voicings) vivem no catálogo (chords-catalog.js); aqui só o desenho.
// Portado do design visual aprovado (Soma Play.html).
import { catalogDefault } from './chords-catalog.js';

// Token parece um acorde? (aceita extensões com parênteses: 7(b5), 7(13), etc.)
export function isChordTok(t) {
  return /^[A-G][#b]?(m|maj|min|dim|aug|sus2|sus4|sus|add\d+|M|°|\+|-|\d)*(\([^)]{1,7}\))*(\/[A-G][#b]?)?$/.test(t);
}

// Linha é "linha de acordes"? — todos os tokens são acordes (ou marcas comuns)
function isChordLine(line) {
  const toks = line.trim().split(/\s+/).filter(Boolean);
  if (!toks.length) return false;
  return toks.every((t) => isChordTok(t) || /^(N\.C\.|%|\|+|x\d+|\(\d+x\))$/i.test(t));
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

// Extrai acordes únicos das linhas de acordes (ordem de aparição)
export function extractChords(parsed) {
  const out = [];
  parsed.forEach((l) => {
    if (!l.hasChords) return;
    l.chords.trim().split(/\s+/).forEach((t) => {
      if (t && isChordTok(t) && !out.includes(t)) out.push(t);
    });
  });
  return out;
}

// Layout da fileira de miniaturas (spec 2026-07-20): tokens da linha de acordes
// → posição x (px) na coluna do caractere (fonte mono), colisões empurram para
// a direita e o empurrão se propaga. blockWidth(tok, isChord) → largura px.
export function layoutChordRow(chordLine, chPx, blockWidth, gap = 6) {
  const out = [];
  let cursor = 0;
  const re = /\S+/g;
  let m;
  while ((m = re.exec(chordLine))) {
    const tok = m[0];
    const isChord = isChordTok(tok);
    const x = Math.max(m.index * chPx, cursor);
    out.push({ tok, isChord, x });
    cursor = x + blockWidth(tok, isChord) + gap;
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
  const d = (dict && dict[name]) || catalogDefault(name);
  return (small ? 64 : 84) + diagLm(d, small);
}

// Diagrama SVG do acorde (portado do design; dict = digitações da música)
export function chordSVG(name, small, dict) {
  const d = (dict && dict[name]) || catalogDefault(name);
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
