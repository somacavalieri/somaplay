// chords.js — diagramas SVG e parser de cifra em texto.
// As formas (voicings) vivem no catálogo (chords-catalog.js); aqui só o desenho.
// Portado do design visual aprovado (Soma Play.html).
import { defaultShape } from './chordbook.js';

// Token parece um acorde? Aceita extensões entre parênteses — 7(b5), 7(13) — e,
// depois da barra, tanto o baixo (D/F#, Cm6/Eb) quanto a extensão no estilo
// CifraClub (Bm5-/7, A7/13, Em7/5-, E7/4(9)).
// O diminuto vem em três grafias: '°' (U+00B0, grau), 'º' (U+00BA, ordinal
// masculino, o que o CifraClub usa) e a letra 'o' minúscula — o que sai de quem
// digita a cifra num teclado comum ("Ebo", "Fo"). As três têm de valer: senão uma
// linha como "A  A7M  A#º" ou "C  Ebo  Dm  G" deixa de ser linha de acordes e leva
// junto os acordes vizinhos, que o app conhece perfeitamente.
// O 'o' fica FORA do grupo de qualidade, como sufixo terminal opcional. Dentro dele
// valeria em qualquer posição e as palavras "Com", "Bom", "Como", "Dom" — nota
// seguida de 'o' e mais letra — passariam a ser acorde. Ver o spec
// 2026-08-10-diminuto-com-o-design.md; a segunda guarda mora em isChordLine.
// Depois da barra cabe um ACORDE INTEIRO, não só a nota do baixo: o Chediak
// imprime `Dm7/G7` (22 vezes só em "Beleza pura"), e antes disso o token não
// casava — o que derrubava a LINHA toda pela regra de isChordLine e fazia a
// música abrir sem acorde nenhum, em silêncio. Por isso o corpo do acorde é um
// pedaço nomeado, reusado dos dois lados da barra. A guarda contra palavra de
// letra continua sendo a nota inicial: "Como", "Bom", "Dom" e "C/Como" seguem
// fora, porque sobra letra depois do 'o' terminal.
const QUAL = '(?:m|maj|min|dim|aug|sus2|sus4|sus|add\\d+|M|°|º|\\+|-|\\d)*';
const PAREN = '(?:\\([^)]{1,7}\\))*';
const CORPO = `[A-G][#b]?${QUAL}o?${PAREN}`;
const EXT_CC = '\\d+[M+\\-#b]?';        // extensão estilo CifraClub: /7, /13, /5-
const RE_ACORDE = new RegExp(`^${CORPO}(?:\\/(?:${CORPO}|${EXT_CC}))*${PAREN}$`);
export function isChordTok(t) {
  return RE_ACORDE.test(t);
}

// Token que, sozinho, tanto pode ser diminuto quanto palavra: feito só de letras e
// terminado em 'o'. Pega "Do", "Ao", "Amo", "Fo", "Ebo" (o bemol é a letra 'b', não
// desambigua nada); não pega "F#o" nem "A#o", que têm '#', caractere que não existe
// em palavra. No acervo "Do" aparece 150 vezes e "Ao" 48, quase sempre como letra —
// contra 29 de "Ebo". Sem isso, a grafia mais comum viraria acorde por engano.
const DIM_AMBIGUO = /^[A-G][a-z]*o$/;

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

// Alfabeto de tablatura: nome da corda opcional, barra ou dois-pontos, e daí em
// diante só traço, dígito, barra de compasso e os símbolos de técnica e
// ornamento. Maiúscula fora do nome da corda derruba o casamento — é o que
// mantém "C ---- G" como linha de acordes e "Ela disse: ---" como letra.
const TAB_ALFABETO = /^[A-Ga-g]?[#b]?\s*[|:]{0,2}[-\d|:hpbsrtvx~^*.+()<>\\/ ]+$/;

// Linha de tablatura — a pauta de uma corda ("E|-0---0---|", "|---3---|").
// Não é letra nem linha de acordes: é grade de largura fixa, onde a coluna
// carrega a informação, e quebrar a linha destrói a grade.
// O critério de traço é proporção, não corrida: tab curta tem corrida curta
// ("E|--0--2--3--|" não tem nenhum "---"), e a proporção pega as duas. É ela
// também que separa a pauta da digitação inline "0221xx", que não tem traço.
// O piso é 30% porque tab densa de técnica é pouco tracejada — em
// "G|--5h7p5--7b9--5/7--|" o traço é só 36% da linha.
export function isTabLine(line) {
  const s = String(line).trim();
  if (!TAB_ALFABETO.test(s)) return false;
  const tracos = (s.match(/-/g) || []).length;
  return tracos >= 3 && tracos >= s.length * 0.3;
}

// Âncora: linha de tab que se decide sozinha. Rótulo de corda seguido de barra
// (com ou sem espaço), rótulo grudado num traço, ou dígito de casa em qualquer
// lugar. O A/B contra o acervo mediu 98,2% das linhas de tab nesta situação.
// A âncora por dígito não vale quando a linha já é linha de acordes: "D7 ------"
// e "A7 ---------------" têm dígito só porque a extensão do acorde tem (D7, A7),
// e sem a guarda isso promovia a linha a bloco de tab e o acorde SUMIA da grade
// "Acordes desta música". As outras duas formas de âncora continuam valendo
// incondicionalmente — é isso que preserva "E---------12-10---", que TAMBÉM
// casa como acorde em isChordTok e por isso não pode depender desta guarda.
const isTabAnchor = (line) => {
  const s = String(line).trim();
  if (/^[A-Ga-g][#b]?(?:\s?[|:]|-)/.test(s)) return true;
  return /\d/.test(s) && !isChordLine(line);
};

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
  if (!toks.every(isChordOrMark)) return false;
  // Segunda guarda do diminuto com 'o': token ambíguo só vale acompanhado de um
  // acorde inequívoco. Numa cifra o diminuto nunca anda sozinho — há sempre outro
  // acorde na linha. Numa letra, "Amo" ou "Ao" vem cercado de palavras, que já
  // reprovam a linha; o que sobra é a linha curta feita só dessas palavras, e é
  // exatamente ela que isto barra.
  if (toks.some((t) => DIM_AMBIGUO.test(t))) {
    return toks.some((t) => chordsOfTok(t).length && !DIM_AMBIGUO.test(t));
  }
  return true;
}

// Parser de cifra colada (estilo CifraClub): [Seção] / linha de acordes / letra /
// bloco de tablatura.
// Retorna linhas normalizadas:
// { isSection, section, hasChords, chords, hasLyric, lyric, isTab, tab }
export function parseCifraText(text) {
  const out = [];
  const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
  const semRabo = (s) => s.replace(/\s+$/, '');
  // Corrida de linhas de tab a partir de i, sem julgar âncora — só varre. As
  // cordas de um mesmo bloco têm de sair juntas: elas compartilham a fonte, e
  // fonte diferente desalinha coluna. Corrida sem âncora nenhuma não é
  // tablatura — uma linha só de traços é indistinguível de uma corda muda, e
  // só a vizinhança separa as duas; quem julga isso agora é cada chamador.
  const corridaTab = (i) => {
    const run = [];
    while (i < lines.length && isTabLine(lines[i])) run.push(semRabo(lines[i++]));
    return run;
  };
  // Fim (exclusivo) da última corrida sem âncora já julgada. O julgamento é
  // monotônico: se a corrida inteira não tem âncora, nenhum sufixo dela tem.
  // Sem isso, uma corrida de k linhas sem âncora custa O(k²) — cada linha
  // dispararia corridaTab de novo, reescaneando o resto da corrida só para
  // redescobrir que continua sem âncora.
  let semAncoraAte = 0;
  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (!trimmed) { out.push({ lyric: ' ' }); i++; continue; }
    if (/^\[.+\]$/.test(trimmed)) { out.push({ section: trimmed }); i++; continue; }
    if (i >= semAncoraAte && isTabLine(raw)) {
      const run = corridaTab(i);
      if (run.some(isTabAnchor)) { out.push({ tab: run }); i += run.length; continue; }
      // corrida sem âncora: lembra até onde ela vai para não reescanear linha a
      // linha, e cai no fluxo normal — esta linha ainda pode ser letra ou,
      // grudada num acorde, linha de acordes.
      semAncoraAte = i + run.length;
    }
    if (isChordLine(raw)) {
      const next = lines[i + 1];
      // Tab logo abaixo: a linha de acordes entra no bloco em vez de virar par
      // acorde/letra. Ela marca a coluna onde o acorde vale — fora do bloco, o
      // bloco encolheria e ela não, e a coluna se perderia.
      if (next !== undefined && (i + 1) >= semAncoraAte && isTabLine(next)) {
        const run = corridaTab(i + 1);
        if (run.some(isTabAnchor)) {
          out.push({ chords: semRabo(raw), tab: run });
          i += 1 + run.length;
          continue;
        }
        semAncoraAte = i + 1 + run.length;
        // corrida sem âncora: segue para o pareamento acorde/letra normal
      }
      if (next !== undefined && next.trim() && !isChordLine(next) && !/^\[.+\]$/.test(next.trim())) {
        out.push({ chords: semRabo(raw), lyric: semRabo(next) });
        i += 2;
      } else {
        out.push({ chords: semRabo(raw) });
        i++;
      }
      continue;
    }
    out.push({ lyric: semRabo(raw) });
    i++;
  }
  return out.map((l) => ({
    section: l.section || '', isSection: !!l.section,
    chords: l.chords || '', hasChords: !!l.chords,
    lyric: l.lyric || '', hasLyric: !!l.lyric,
    tab: l.tab || [], isTab: !!(l.tab && l.tab.length),
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
// a direita e o empurrão se propaga. blockWidth(tok, isChord, isRepeat) → largura px.
// Rótulo entre colchetes conta como um token só: "[Frase 1]" tem espaço dentro e
// partido em dois viraria "[Frase    1]" depois que a miniatura empurra o resto.
// `dedup` (spec 2026-08-12, linha só-de-acorde): só a 1ª ocorrência de cada nome
// NESSA linha carrega `isRepeat:false` (desenha o diagrama); da 2ª em diante marca
// `isRepeat:true` — quem desenha decide o que fazer (repetir com letra é fiel ao
// CifraClub; sem letra, o vamp inteiro virava parede de diagramas iguais).
export function layoutChordRow(chordLine, chPx, blockWidth, gap = 6, dedup = false) {
  const out = [];
  let cursor = 0;
  const vistos = dedup ? new Set() : null;
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
      const isRepeat = !!(dedup && p.isChord && vistos.has(p.name));
      if (dedup && p.isChord) vistos.add(p.name);
      const x = Math.max(p.col * chPx, cursor);
      out.push({ tok: p.tok, name: p.name, isChord: p.isChord, x, isRepeat });
      cursor = x + blockWidth(p.tok, p.isChord, isRepeat) + gap;
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

// Reflow do par acorde/letra (spec 2026-08-10). O alinhamento da cifra em texto é
// posicional: acorde e sílaba se encontram pela coluna do caractere. Deixar cada linha
// quebrar por conta própria (a de acorde não quebrava e sumia; a de letra quebrava)
// destrói isso. Aqui as duas quebram JUNTAS, na mesma coluna, e só onde nenhuma das
// duas está no meio de um token.
export function wrapBlock(chords, lyric, cols, cabe) {
  const c0 = String(chords == null ? '' : chords).replace(/\s+$/, '');
  const l0 = String(lyric == null ? '' : lyric).replace(/\s+$/, '');

  // corte válido: além do fim da linha, ou com espaço encostado de um dos lados
  const ok = (s, i) => i >= s.length || s[i - 1] === ' ' || s[i] === ' ';
  const lead = (s) => s.length - s.replace(/^ +/, '').length;

  // Tira o recuo comum ANTES de medir. `peca()` já o removia na hora de montar o
  // pedaço, mas a largura era conferida na string CRUA — então um sistema que
  // cabia depois de aparado era quebrado assim mesmo, e a sobra ia para uma
  // fileira sozinha ("A7" em Oriente, 2026-08-12: 57 colunas cruas, 49 de
  // conteúdo, numa tela de 55). Recuar as DUAS linhas do mesmo tanto não mexe no
  // alinhamento: acorde e sílaba andam juntos.
  const pad0 = (c0 && l0) ? Math.min(lead(c0), lead(l0)) : (c0 ? lead(c0) : lead(l0));
  const c = c0.slice(pad0);
  const l = l0.slice(pad0);
  const end = Math.max(c.length, l.length);
  const n = Math.floor(cols);

  // O pedaço COMO ELE VAI SER DESENHADO: aparado à direita e sem o recuo comum
  // às duas linhas. É isso que `cabe` precisa julgar — espaço que ninguém
  // desenha não pode entrar na conta da largura.
  const peca = (pos, cut) => {
    const a = c.slice(pos, cut).replace(/\s+$/, '');
    const b = l.slice(pos, cut).replace(/\s+$/, '');
    const pad = (a && b) ? Math.min(lead(a), lead(b)) : (a ? lead(a) : lead(b));
    return { chords: a.slice(pad), lyric: b.slice(pad) };
  };
  const serve = (pos, cut) => !cabe || cabe(peca(pos, cut).chords);

  if (!(n > 1)) return [{ chords: c, lyric: l }];
  // O atalho devolve `c` CRU, com recuo e tudo — então é `c` que o predicado
  // tem de julgar. Testar o pedaço sem recuo aprova uma fileira mais estreita
  // do que a que vai ser desenhada.
  if (end <= n && (!cabe || cabe(c))) return [{ chords: c, lyric: l }];

  // Migalha: sobra tão pouco depois do corte guloso que a última fileira do
  // bloco fica com uma palavra sozinha ("Mesmo" em Meditação, 2026-08-11) —
  // acontece sempre que o texto passa de `n` por pouco. Em vez de recuar até o
  // primeiro corte válido (que só passa uma palavra e ainda deixa migalha),
  // mira o corte mais perto do MEIO do que sobra — as duas fileiras finais
  // saem parecidas, nenhuma passa de `n`.
  // Respiração (spec 2026-08-16): o gráfico impresso codifica a frase como VÃO
  // LARGO — onde a música respira, o livro deixa vários espaços seguidos. O
  // corte guloso não enxergava isso: parava no primeiro espaço válido, e um
  // espaço simples entre duas palavras valia tanto quanto um vão de nove. No
  // acervo do Caetano vol. 1, 54 das 72 quebras caíam em vão de 1–2 espaços,
  // ou seja no meio da frase ("Visão   do | espaço" na Meu bem, meu mal).
  const vao = (s, i) => {
    let a = i, b = i;
    while (a > 0 && s[a - 1] === ' ') a--;
    while (b < s.length && s[b] === ' ') b++;
    return b - a;
  };
  // O MENOR dos dois vãos: um vão largo na letra que cai no meio de um acorde
  // não respira nada — as duas linhas têm de estar folgadas no mesmo ponto.
  const respiro = (i) => Math.min(vao(c, i), vao(l, i));

  // Entre os cortes válidos perto do limite, o que mais respira. A janela é o
  // preço da troca: recuar até 25% da largura derrubou aquelas 54 quebras para
  // 34 e custou ~4 colunas por quebra.
  const JANELA = 0.25;
  const naRespiracao = (pos, k) => {
    if (k >= end) return k;                 // fim da linha já é a melhor quebra
    const piso = Math.max(pos + 1, k - Math.floor(n * JANELA));
    let melhor = k, best = respiro(k);
    for (let k2 = k - 1; k2 >= piso; k2--) {
      if (!(ok(c, k2) && ok(l, k2) && serve(pos, k2))) continue;
      const r = respiro(k2);
      if (r > best) { best = r; melhor = k2; }
    }
    return melhor;
  };

  // Migalha: sobra tão pouco depois do corte guloso que a última fileira do
  // bloco fica com uma palavra sozinha ("Mesmo" em Meditação, 2026-08-11) —
  // acontece sempre que o texto passa de `n` por pouco. Em vez de recuar até o
  // primeiro corte válido (que só passa uma palavra e ainda deixa migalha),
  // mira o corte mais perto do MEIO do que sobra — as duas fileiras finais
  // saem parecidas, nenhuma passa de `n`. O equilíbrio continua mandando; a
  // respiração entra só como desempate, senão as duas regras disputam o corte.
  const MIGALHA = Math.min(12, Math.floor(n * 0.25));
  const semMigalha = (pos, cut) => {
    if (cut >= end) return cut;
    const resto = end - cut;
    if (resto > MIGALHA || resto > n) return cut;
    const alvo = pos + Math.ceil((cut - pos + resto) / 2);
    const piso = Math.max(pos + 1, end - n);
    let melhor = cut, dist = Infinity, folga = -1;
    for (let k2 = cut - 1; k2 >= piso; k2--) {
      if (!(ok(c, k2) && ok(l, k2) && serve(pos, k2))) continue;
      const d = Math.abs(k2 - alvo);
      const r = respiro(k2);
      if (d < dist || (d === dist && r > folga)) { melhor = k2; dist = d; folga = r; }
    }
    return (end - melhor > resto) ? melhor : cut;
  };

  const out = [];
  for (let pos = 0; pos < end;) {
    const lim = Math.min(pos + n, end);
    let k = lim;
    // `serve` só é avaliado depois de `ok` passar nas DUAS linhas: só nos
    // cortes válidos, não a cada caractere.
    while (k > pos + 1 && !((ok(c, k) && ok(l, k)) && serve(pos, k))) k--;
    // Não deu para recuar: corta na largura mesmo, para não travar. É a mesma
    // escapatória de sempre — token único mais largo que a tela, ou dois
    // acordes colados na mesma sílaba.
    const cut = semMigalha(pos, k > pos + 1 ? naRespiracao(pos, k) : lim);
    const p = peca(pos, cut);
    if (p.chords || p.lyric) out.push(p);
    pos = cut;
  }
  return out.length ? out : [{ chords: c, lyric: l }];
}
