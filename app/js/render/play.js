// render/play.js — Tela Cifra (T1 + T2 unificado) + visão Karaokê
// Cifra por texto ou imagem · rolagem automática · acordes/diagramas/fixados
// mixer (stems + versão completa) · transporte global
import { S, currentSong, artistName, audio, persistCurrentStems, saveSong } from '../state.js';
import { DB } from '../db.js';
import { I, esc, fmtTime } from '../icons.js';
import { parseCifraText, extractChords, chordSVG, chordDiagWidth, layoutChordRow, chordLineSegs, chordName, wrapBlock } from '../chords.js';
import { transporLinha, tomDeSemitons, deduzTom, transporAcorde } from '../transpose.js';
import { shapeById, pickerShapes } from '../chordbook.js';
import { chordEditorHTML, shapeStripHTML } from './chordeditor.js';
import { chordPopHTML, popPosition } from './chordpop.js';
import { tomPopHTML } from './tompop.js';
import { offlineBadge } from './home.js';
import { scrollStep, SCROLL_TICK_MS } from '../scroll-speed.js';
import { t } from '../i18n.js';
import { songNavHTML, songNavButtonHTML, scrollNavAtual, songNavArrowsHTML, posicaoTexto } from './songnav.js';
import { limpaHTML } from '../anotacoes.js';

// -------- mídia da música atual (blob URLs, cache por música) --------
const media = { songId: null, urls: new Map(), parsed: null, parsedFor: null };

export async function loadSongMedia(song) {
  // revoga URLs da música anterior (áudio é revogado pelo engine)
  if (media.songId !== song.id) {
    for (const [, u] of media.urls) URL.revokeObjectURL(u);
    media.urls.clear();
    media.songId = song.id;
    media.parsed = null;
    media.parsedFor = null;
  }
  const need = [];
  (song.cifra?.imagens || []).forEach((im) => { if (im.blobId && !media.urls.has(im.blobId)) need.push(im.blobId); });
  for (const id of need) {
    const u = await DB.blobURL(id);
    if (u) media.urls.set(id, u);
  }
  // carrega o áudio no motor
  const stems = [];
  for (const st of song.stems || []) {
    stems.push({ id: st.id, blobURL: st.blobId ? await DB.blobURL(st.blobId) : null });
  }
  const fulls = [];
  for (const f of song.full || []) {
    fulls.push({ id: f.id, blobURL: f.blobId ? await DB.blobURL(f.blobId) : null });
  }
  await audio.load(stems, fulls, { source: S.t2Source, channels: song.stems || [] });
  // Reentrância: um segundo openSongAction pode ter mudado S.currentSongId
  // enquanto os awaits acima estavam em voo (blobs, AudioEngine.load) — "next,
  // next, next" batendo rápido chega aqui de sobra. AudioEngine.load já se
  // protege com o próprio _loadToken, mas setChannels/setMaster não têm token
  // nenhum: quem chegasse por último aplicaria a mixagem de UMA música (a sua
  // própria) sobre as faixas de OUTRA, e _applyVolumes, sem achar o canal,
  // cairia no volume cheio. currentSongId já foi trocado de forma síncrona
  // pelo goSong do chamador que "venceu", então é ele que decide quem é stale.
  if (S.currentSongId !== song.id) return;
  audio.setChannels(song.stems || []);
  audio.setMaster(S.settings.masterVol / 100);
}

export function unloadSongMedia() {
  for (const [, u] of media.urls) URL.revokeObjectURL(u);
  media.urls.clear();
  media.songId = null;
  audio.unload();
}

function parsedCifra(song) {
  if (media.parsedFor === song.id && media.parsed) return media.parsed;
  media.parsed = parseCifraText(song.cifra?.texto || '');
  media.parsedFor = song.id;
  return media.parsed;
}

// A transposição é aplicada DEPOIS do parse, e não invalidando o cache dele: a
// cifra é parseada uma vez por música e transposta a cada render. A linha de
// acordes do bloco de tab também anda — senão a cifra ficaria meio transposta,
// que é pior que qualquer das duas pontas. A tab em si não anda: casa é
// absoluta (ver o aviso em renderPlay).
function transposto(parsed, semitons) {
  if (!semitons) return parsed;
  return parsed.map((l) => (l.hasChords
    ? { ...l, chords: transporLinha(l.chords, semitons) }
    : l));
}

// O tom que a pílula mostra, e se ele é chute. `base` é o tom original — de
// onde a grade parte.
//
// Recebe a MÚSICA, não o parsed, de propósito: o palpite tem de ler a cifra
// crua. Deduzir do texto já deslocado e depois deslocar o rótulo transporia
// duas vezes, e o parâmetro extra seria só o convite para alguém passar o
// parsed errado — inclusive daqui a seis meses.
export function tomAtual(song) {
  const declarado = song.tom && String(song.tom).trim();
  const base = declarado || deduzTom(parsedCifra(song));
  const palpite = !declarado && !!base;
  if (!base) return { label: null, palpite: false, base: null };
  // Em zero, a pílula mostra o tom COMO FOI DECLARADO — 'Db' continua 'Db', e
  // 'Am7' continua 'Am7'. tomDeSemitons canoniza para fundamental + modo, o que
  // é certo para o tom RESULTANTE e errado para o tom que o usuário digitou.
  const label = S.transpose ? (tomDeSemitons(base, S.transpose) || base) : base;
  return { label, palpite, base };
}

// -------- blocos --------
// Cabeçalho de identidade da música (no topo do conteúdo, rola junto).
// A pílula do tom passa a existir SEMPRE na cifra em texto: hoje ela só aparecia
// com o campo preenchido, e uma feature cujo botão some na maior parte do acervo
// não é feature. Vira botão na Task 5.
// `S.transpose` é guardado em 0–11 (um domínio só; ver Task 5). Para LER, a
// forma assinada mais curta é a que o músico espera: 11 semitons acima é
// "−1", não "+11". Só a exibição converte; o estado continua em 0–11.
export const assinado = (n) => (n > 6 ? n - 12 : n);

function songHeaderHTML(song, tom) {
  const meta = [];
  if (tom && tom.label) {
    meta.push(`<button class="tag-tom" data-a="openTomPop" title="${t('play.tom.open')}">${t('play.song.key')} ${esc(tom.label)}${tom.palpite ? ' ?' : ''}</button>`);
  } else if (tom) {
    const d = assinado(S.transpose);
    meta.push(`<button class="tag-tom" data-a="openTomPop" title="${t('play.tom.open')}">${t('play.song.key')} ${d ? (d > 0 ? '+' : '') + d : '—'}</button>`);
  } else if (song.tom) {
    // Cifra em imagem: não há tom deduzido nem popover para abrir aqui — a
    // pílula é um <span> inerte. .tag-tom ganhou cursor:pointer para o caso
    // clicável (o <button> acima); "static" desfaz isso para este caso, que
    // não tem data-a nenhum.
    meta.push(`<span class="tag-tom static">${t('play.song.key')} ${esc(song.tom)}</span>`);
  }
  if (temNotas(song)) meta.push(`<button class="tag-tom" data-a="jumpNotas" style="gap:5px">${I.textLines(13)}${t('notas.jump')}</button>`);
  if (song.fonte) meta.push(`<span class="src">${esc(song.fonte)}</span>`);
  // "3 de 24 em Djavan": entra junto de Tom e Fonte, no cabeçalho que já existe
  // no corpo da cifra. Não vai para a top-bar — ela foi esvaziada de propósito
  // pela spec 2026-07-06, e a resposta glanceável para "onde eu estou" é a
  // própria gaveta, a um toque.
  const pos = posicaoTexto();
  if (pos) meta.push(`<span class="src">${esc(pos)}</span>`);
  return `<div class="song-id">
    <div class="ttl">${esc(song.title)}</div>
    <div class="art">${esc(artistName(song))}</div>
    ${meta.length ? `<div class="meta">${meta.join('<span class="mdot">·</span>')}</div>` : ''}
  </div>`;
}

function chordsGridHTML(song, chordNames) {
  if (!chordNames.length) return '';
  const favs = S.chordFavs[song.id] || [];
  // Digitação é casa ABSOLUTA e a chave é o NOME do acorde. Transposto, o nome
  // na tela mudou mas o dicionário da música não — ler o dicionário aqui
  // mostraria a forma customizada do acorde original sob o nome do acorde
  // transposto (Important 3 do review final). Em zero, sem colisão, o
  // dicionário volta a valer.
  const dict = S.transpose ? null : (song.cifra?.digitacoes || null);
  const cards = chordNames.map((n) => {
    const f = favs.includes(n);
    return `<div class="chord-card ${f ? 'pinned' : ''}">
      <div class="nm"><span>${esc(n)}</span><button class="star-btn ${f ? 'on' : ''}" data-a="toggleChordFav" data-id="${esc(n)}" title="${t('play.chordsGrid.pinTooltip')}">${I.star(f)}</button></div>
      <button class="chord-diag" data-a="openChordPicker" data-id="${esc(n)}" title="${t('play.chordsGrid.changeVariant')}">${chordSVG(n, false, dict)}</button>
    </div>`;
  }).join('');
  return `<div class="chords-block" data-nopan="1">
    <div class="hd"><span style="color:var(--accent);display:flex">${I.gridChord()}</span>
      <div class="t">${t('play.chordsGrid.title')}</div><div class="n">${chordNames.length}</div></div>
    <div class="chords-grid">${cards}</div>
    <div class="chords-hint"><span style="display:flex;color:var(--muted3)">${I.star(false, 13)}</span>${t('play.chordsGrid.hint')}</div>
  </div>`;
}

export const temNotas = (song) => !!(song && String(song.anotacoes || '').trim());

// O filtro roda AQUI também, e não só na escrita. É barato e é a rede que pega
// um registro que entrou por outro caminho — um backup antigo, uma escrita
// direta no IndexedDB.
export function notasBlockHTML(song) {
  const tem = temNotas(song);
  const cabeca = `<div class="blk-hd">
      <span class="ic" style="color:${tem ? 'var(--accent)' : 'var(--muted2)'};display:flex">${I.textLines(18)}</span>
      <div class="t"${tem ? '' : ' style="color:var(--muted)"'}>${t('notas.title')}</div>
      <span class="sp"></span>
      <button class="btn-ghost" style="height:38px;padding:0 13px;font-size:13px" data-a="editNotas">${I.pencil(14)}${t(tem ? 'notas.edit' : 'notas.write')}</button>
    </div>`;
  const corpo = tem
    ? `<div class="notas-body">${limpaHTML(song.anotacoes)}</div>`
    : `<div class="notas-vazia"><div class="txt">${t('notas.empty')}</div></div>`;
  return `<div class="blk notas" id="notas" data-nopan="1">${cabeca}${corpo}</div>`;
}

function pinnedBarHTML(song, chordNames) {
  const favs = (S.chordFavs[song.id] || []).filter((n) => chordNames.includes(n));
  if (!favs.length || S.viewMode === 'karaoke') return '';
  // Mesma guarda de chordsGridHTML: nome muda no transposto, dicionário não.
  const dict = S.transpose ? null : (song.cifra?.digitacoes || null);
  const strip = S.pinnedOpen ? `<div class="strip">` + favs.map((n) =>
    `<div class="chord-mini"><div class="nm"><span>${esc(n)}</span><button class="star-btn on" data-a="toggleChordFav" data-id="${esc(n)}" title="${t('list.unpin')}">${I.star(true)}</button></div>
     <div>${chordSVG(n, true, dict)}</div></div>`).join('') + `</div>` : '';
  return `<div class="pinnedbar" data-nopan="1">
    <div class="bar">
      <span style="color:var(--accent);display:flex">${I.starSmall()}</span>
      <div class="lbl">${t('play.pinnedBar.title')}</div><div class="cnt">${favs.length}</div>
      <button class="toggle" data-a="togglePinnedBar">${S.pinnedOpen ? t('play.pinnedBar.hide') + ' ' + I.chevU() : t('play.pinnedBar.show') + ' ' + I.chevD()}</button>
    </div>${strip}
  </div>`;
}

// ---- miniaturas inline (spec 2026-07-20) ----
// Medição de texto com as fontes reais (canvas compartilhado; não toca o DOM).
let _measureCtx = null;
function textMeasurer(px, family, weight = 700) {
  if (!_measureCtx) _measureCtx = document.createElement('canvas').getContext('2d');
  const font = `${weight} ${px}px ${family}`;
  return (t) => { _measureCtx.font = font; return _measureCtx.measureText(t).width; };
}

// Medidores da fileira — recriados a cada render da cifra (acompanham o zoom).
function rowMeasurers(cifraFontPx) {
  const css = getComputedStyle(document.documentElement);
  const mono = css.getPropertyValue('--f-mono');
  const title = css.getPropertyValue('--f-title');
  return {
    chPx: textMeasurer(cifraFontPx, mono)('0'), // largura do caractere da cifra (.ch é mono bold)
    label: textMeasurer(13, title),             // nome do acorde (.ch-diag .nm)
    tok: textMeasurer(13, mono),                // token não-acorde (.ch-tok)
  };
}

// Fileira nome+diagrama no lugar da linha de acordes. `blockWidth` vem de fora:
// é a MESMA que o predicado do wrap usa. Duas medidas para a mesma coisa
// divergiriam no dia em que uma mudasse, e a fileira voltaria a vazar sem
// ninguém entender por quê.
// `dedup` (spec 2026-08-12): linha só-de-acorde (introdução, vamp instrumental)
// também vira fileira de diagrama, mas só a 1ª ocorrência de cada nome desenha
// o SVG — da 2ª em diante mostra só o nome, senão um vamp tipo "G7 G7 C/G Gm
// C/G Gm G7…" vira parede de diagramas repetidos. Linha com letra continua
// desenhando toda ocorrência (fiel ao CifraClub, spec 2026-07-20).
function chordDiagRowHTML(chordLine, dict, meas, blockWidth, dedup = false) {
  const items = layoutChordRow(chordLine, meas.chPx, blockWidth, 6, dedup);
  const inner = items.map((it) => (it.isChord
    ? `<button class="ch-diag" style="left:${Math.round(it.x)}px" data-a="openChordPop" data-id="${esc(it.name)}" title="${t('play.chordDiagRow.viewChord')}"><span class="nm">${esc(it.tok)}</span>${it.isRepeat ? '' : chordSVG(it.name, true, dict)}</button>`
    : `<span class="ch-tok" style="left:${Math.round(it.x)}px">${esc(it.tok)}</span>`)).join('');
  return `<div class="ch-diag-row">${inner}</div>`;
}

// Linha de acordes tocável: só tokens-acorde viram botão (mesma fonte/cor —
// visual idêntico); espaços seguem no fluxo do white-space:pre.
function chordLineHTML(chordLine) {
  return chordLineSegs(chordLine).map((sg) => (sg.isChord
    ? `<button class="ch-btn" data-a="openChordPop" data-id="${esc(sg.name)}">${esc(sg.text)}</button>`
    : esc(sg.text))).join('');
}

// Reflow (spec 2026-08-10): largura da cifra em colunas, medida no DOM depois do
// render. 0 = ainda não medido, e aí não se quebra nada. `cifraColsPrev` corta a
// oscilação de 1 coluna quando a barra de rolagem entra e sai.
let cifraCols = 0;
let cifraColsPrev = 0;
let cifraBoxPx = 0;      // largura da caixa em px — a régua do modo miniatura

function measureCifra() {
  const el = document.querySelector('.cifra-text');
  const w = el ? el.clientWidth : 0;
  if (!w) return { cols: 0, px: 0 };
  // Sonda dentro da própria .cifra-text: herda fonte, tamanho e zoom exatos. Medir
  // pelo canvas dava caractere mais estreito que o real (720/12,8 = 56 colunas onde
  // só cabiam 54), e a linha continuava vazando.
  const probe = document.createElement('span');
  probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;font-weight:700';
  probe.textContent = '0'.repeat(100);
  el.appendChild(probe);
  const chPx = probe.getBoundingClientRect().width / 100;
  probe.remove();
  return chPx > 0 ? { cols: Math.max(8, Math.floor(w / chPx)), px: w } : { cols: 0, px: 0 };
}

// Mede e, se a largura em COLUNAS mudou, re-renderiza uma vez. A largura em px é
// guardada sempre: variação menor que um caractere não vale um re-render — por isso
// `cifraBoxPx` pode ficar até a largura de um caractere à frente das fileiras já
// desenhadas na tela, uma diferença limitada que se corrige sozinha no próximo render.
function reflowCifra(update) {
  const { cols, px } = measureCifra();
  if (px) cifraBoxPx = px;
  if (!cols || cols === cifraCols || cols === cifraColsPrev) return false;
  cifraColsPrev = cifraCols;
  cifraCols = cols;
  update();
  return true;
}

// Bloco de tablatura: uma corda por linha, sem quebra, com a linha de acordes de
// cima junto para escalar com ele e não perder a coluna. O CSS calcula a fonte a
// partir de --cols; aqui só se mede a largura em caracteres.
// Miniaturas não entram: diagrama de 100px posicionado em pixel não pertence a
// uma grade de tab.
function tabBlockHTML(ln) {
  const cols = Math.max(ln.chords.length, ...ln.tab.map((l) => l.length));
  const acordes = ln.hasChords ? `<div class="ch">${chordLineHTML(ln.chords)}</div>` : '';
  const cordas = ln.tab.map((l) => `<div>${esc(l)}</div>`).join('');
  return `<div class="tabwrap"><div class="tab" style="--cols:${cols}">${acordes}${cordas}</div></div>`;
}

// Ajustar para caber (spec 2026-08-16). A largura do sistema é a que o livro
// imprimiu — 127 a 132 colunas nas músicas medidas do Caetano vol. 1 — e
// quebrar um sistema em dois desfaz o fraseado que o próprio livro escreveu.
// Então, ANTES de quebrar, encolhe: a fonte cai até o sistema mais largo caber
// na caixa. O piso existe porque cifra ilegível na estante não serve para nada;
// abaixo dele a linha quebra mesmo, e aí o `wrapBlock` escolhe a quebra na
// respiração da frase.
//
// O zoom continua sendo o TETO: quem aumentou a fonte não a vê diminuir sozinha
// além do que já pediu — o ajuste só encolhe.
//
// Não resolve o modo miniatura: lá cada diagrama ocupa a mesma largura em px
// seja qual for a fonte da letra, e é o diagrama que manda na quebra. Encolher
// a fonte ainda ajuda um pouco (os acordes ficam mais perto uns dos outros),
// mas em sistema denso a fileira quebra de qualquer forma.
const CIFRA_PISO_PX = 15;

// Percurso máximo de leitura, em colunas (spec 2026-08-16). Um sistema do
// songbook tem 127 a 132 colunas; numa tela larga isso cabe inteiro, e foi
// justamente o que o usuário reprovou — "ocupando toda a tela perde o ritmo e o
// significado da canção". O olho não acompanha o par acorde/sílaba por 132
// colunas. Acima daqui a linha quebra mesmo cabendo, e como a quebra procura a
// respiração da frase, ela cai em fim de frase em vez de partir uma.
//
// Cap só na MEDIDA da quebra, não na caixa: capar a caixa faria o `fontQueCabe`
// enxergar uma caixa menor e encolher a fonte sem necessidade — a caixa é a
// régua do "cabe inteiro?", o cap é a régua do "vale ler tão largo?".
const CIFRA_MAX_COLS = 96;

function fontQueCabe(fontPx, parsed, boxPx) {
  if (!boxPx) return fontPx;              // ainda não medido: fica como está
  const cols = parsed.reduce((m, ln) => (ln.isTab ? m : Math.max(m,
    ln.hasChords ? ln.chords.length : 0,
    ln.hasLyric ? ln.lyric.length : 0)), 0);
  if (!cols) return fontPx;
  const mono = getComputedStyle(document.documentElement).getPropertyValue('--f-mono');
  // Avanço do caractere por px de fonte, medido na fonte real (não os .6 de
  // chute do CSS): fallback de fonte com avanço diferente sairia estreito.
  const avanco = textMeasurer(100, mono)('0') / 100;
  if (!(avanco > 0)) return fontPx;
  return Math.max(CIFRA_PISO_PX, Math.min(fontPx, Math.floor(boxPx / (cols * avanco))));
}

function cifraTextHTML(song) {
  const parsed = transposto(parsedCifra(song), S.transpose);
  const zoom = S.settings.cifraZoom / 100;
  const fontPx = fontQueCabe(Math.round(20 * zoom), parsed, cifraBoxPx);
  const mini = S.settings.cifraMiniaturas;
  // Mesma guarda de chordsGridHTML: nome muda no transposto, dicionário não.
  const dict = S.transpose ? null : (song.cifra?.digitacoes || null);
  const meas = mini ? rowMeasurers(fontPx) : null;

  // A largura de um bloco da fileira. Uma só, para o desenho e para o predicado.
  // `isRepeat` (spec 2026-08-12): 2ª+ ocorrência numa linha só-de-acorde reserva
  // só a largura do nome — sem isso o vão da repetição ficaria do tamanho do
  // diagrama que não é mais desenhado.
  const blockWidth = !mini ? null : (tok, isChord, isRepeat) => (isChord
    ? (isRepeat ? meas.label(tok) : Math.max(chordDiagWidth(chordName(tok), true, dict), meas.label(tok)))
    : meas.tok(tok));

  // "Este trecho, montado como fileira, cabe na caixa?" Só o modo miniatura
  // pergunta — no modo texto a coluna do caractere é a régua certa. Sem medição
  // ainda (cifraBoxPx = 0), não pergunta nada e o wrap é o de sempre. `dedup`
  // espelha o desenho real (chordDiagRowHTML): sem isso o predicado julgaria
  // pela largura do diagrama cheio e cortaria mais cedo do que o necessário.
  const cabe = (!mini || !cifraBoxPx) ? undefined : (trecho, dedup) => {
    const itens = layoutChordRow(trecho, meas.chPx, blockWidth, 6, dedup);
    if (!itens.length) return true;
    const u = itens[itens.length - 1];
    return u.x + blockWidth(u.tok, u.isChord, u.isRepeat) <= cifraBoxPx;
  };

  const lines = parsed.map((ln) => {
    // Tab sai do reflow: quebrar a grade em duas destrói a leitura das seis cordas
    // em paralelo. Ela encolhe para caber, no CSS, em vez de quebrar.
    if (ln.isTab) return tabBlockHTML(ln);
    let h = '';
    if (ln.isSection) h += `<div class="sec">${esc(ln.section)}</div>`;
    // Linha só-de-acorde (introdução, vamp) também vira fileira de diagrama —
    // com dedup, senão repete o mesmo desenho por todo o vamp (2026-08-12).
    const dedup = !ln.hasLyric;
    // acorde e letra quebram JUNTOS, na mesma coluna — é o que mantém o acorde em
    // cima da sílaba dele quando a linha não cabe na tela
    // `cifraCols` 0 = ainda não medido, e aí não se quebra nada — o `min` tem de
    // preservar esse zero, senão a 1ª renderização quebraria em 96 às cegas.
    const alvo = cifraCols ? Math.min(cifraCols, CIFRA_MAX_COLS) : 0;
    for (const p of wrapBlock(ln.hasChords ? ln.chords : '',
                              ln.hasLyric ? ln.lyric : '', alvo,
                              mini ? (trecho) => cabe(trecho, dedup) : undefined)) {
      if (ln.hasChords && p.chords) {
        h += mini
          ? chordDiagRowHTML(p.chords, dict, meas, blockWidth, dedup)
          : `<div class="ch">${chordLineHTML(p.chords)}</div>`;
      }
      if (ln.hasLyric) h += `<div class="ly">${esc(p.lyric)}</div>`;
    }
    return h;
  }).join('');
  const chordNames = song.cifra?.acordes?.length
    ? song.cifra.acordes.map((n) => transporAcorde(n, S.transpose))
    : extractChords(parsed);
  return `<div class="cifra-scroll" data-autoscroll="1">
    ${songHeaderHTML(song, tomAtual(song))}
    <div class="cifra-text" style="font-size:${fontPx}px">${lines || `<div class="ly" style="color:var(--muted)">${t('play.cifraText.empty')}</div>`}</div>
    ${chordsGridHTML(song, chordNames)}
    ${notasBlockHTML(song)}
  </div>`;
}

function cifraImageHTML(song) {
  const imgs = song.cifra?.imagens || [];
  let variant = S.imgVariant;
  if (!imgs.some((i) => i.tipo === variant)) variant = imgs[0] ? imgs[0].tipo : 'aberta';
  const cur = imgs.find((i) => i.tipo === variant) || imgs[0];
  const url = cur ? media.urls.get(cur.blobId) : null;
  const chordNames = song.cifra?.acordes || [];
  return `<div class="cifra-imgwrap" data-autoscroll="1" data-imgscroll="1">
    <div class="inner">
      ${songHeaderHTML(song)}
      ${url ? `<img src="${url}" alt="${t('play.cifraImage.alt')}" draggable="false" class="${S.imgInvert ? 'inverted' : ''}">` : `<div style="padding:60px;color:var(--muted)">${t('play.cifraImage.notFound')}</div>`}
      ${chordNames.length || temNotas(song) ? `<div class="chords-under-img" data-nopan="1">${chordsGridHTML(song, chordNames)}${notasBlockHTML(song)}</div>` : ''}
    </div>
  </div>`;
}

function karaokeHTML(song) {
  const verses = (song.letra || '').replace(/\r\n?/g, '\n').split(/\n{2,}/).map((v) => v.split('\n').filter(Boolean));
  return `<div class="cifra-scroll" data-autoscroll="1">
    ${songHeaderHTML(song)}
    <div class="karaoke">
      ${verses.map((v, i) => `<div class="verse ${i === 0 ? 'cur' : ''}">${v.map((l) => `<div>${esc(l)}</div>`).join('')}</div>`).join('')
        || `<div style="color:var(--muted)">${t('play.karaoke.empty')}</div>`}
    </div>
  </div>`;
}

function mixerHTML(song) {
  const hasStems = (song.stems || []).length > 0;
  const fulls = song.full || [];
  const hasFull = fulls.length > 0;
  const stemsActive = hasStems && S.t2Source === 'stems';
  const fullActive = fulls.some((f) => f.id === S.t2Source);

  const channels = hasStems ? (`
    <div class="stems-hd">
      <div class="lbl ${stemsActive ? 'on' : ''}">${t('play.mixer.stemsLabel')}</div>
      ${stemsActive && S.transportPlaying ? `<span style="display:flex;align-items:center;gap:5px"><span class="live-dot"></span><span class="live-lbl">${t('play.mixer.playing')}</span></span>` : ''}
      ${hasStems && fullActive ? `<button class="use-stems" data-a="selectSource" data-id="stems">${t('play.mixer.useChannels')}</button>` : ''}
    </div>
    <div class="stems-list ${stemsActive ? '' : 'dim'}">
      ${song.stems.map((c) => `
        <div class="channel">
          <div class="row1">
            <button class="mute-btn ${c.muted ? 'muted' : ''}" data-a="toggleMute" data-id="${c.id}">${c.muted ? I.volOff() : I.volOn()}</button>
            <div style="flex:1">
              <div class="nm ${c.muted ? 'dim' : ''}">${esc(c.name)}</div>
              ${c.muted ? `<div class="st-mute">${t('play.mixer.muted')}</div>`
                : (stemsActive && S.transportPlaying ? `<div class="st-on"><span class="live-dot"></span><span class="live-lbl">${t('play.mixer.active')}</span></div>` : '')}
            </div>
            <div class="val ${c.muted ? 'muted' : ''}" id="vol-val-${c.id}">${c.vol}%</div>
          </div>
          <input type="range" min="0" max="100" value="${c.vol}" data-in="stemVol" data-id="${c.id}">
        </div>`).join('')}
    </div>`) : '';

  const fullBlock = hasFull ? `
    <div class="fullver ${hasStems ? 'after-stems' : ''}">
      <div class="hd2">${I.disc(18, fullActive)}<div class="t">${t('play.mixer.fullVersion')}</div><div class="s">${t('play.mixer.wholeSong')}</div></div>
      ${fulls.map((v) => {
        const on = S.t2Source === v.id;
        return `<div class="ver-row ${on ? 'on' : ''}" data-a="selectSource" data-id="${v.id}">
          <div class="ic">${on && S.transportPlaying ? I.pause(18) : I.play(18)}</div>
          <div class="meta"><div class="n">${esc(v.nome || t('play.mixer.fullVersion'))}</div><div class="m">${esc(v.meta || '')}</div></div>
          ${on && S.transportPlaying ? `<span class="amber-live" style="display:flex;align-items:center;gap:5px"><span class="live-dot"></span><span class="live-lbl">${t('play.mixer.playing')}</span></span>` : ''}
        </div>`;
      }).join('')}
    </div>` : '';

  return `
    <div class="mixer-scrim" data-a="toggleMixer"></div>
    <div class="mixer">
      <div class="sheet-handle"><div></div></div>
      <div class="hd">
        <span style="color:var(--teal);display:flex">${I.mixer(20)}</span>
        <div class="t">${t('play.mixer.title')}</div>
        <div class="sub">${stemsActive ? `${song.stems.length} ${song.stems.length === 1 ? t('play.mixer.channel') : t('play.mixer.channels')}` : t('play.mixer.subFull')}</div>
        <button class="collapse" data-a="toggleMixer" title="${t('play.mixer.collapse')}">${I.chevR(18)}</button>
      </div>
      <div class="body">${channels}${fullBlock}</div>
    </div>`;
}

function transportHTML() {
  return `<div class="transport">
    <button class="btn-play-round" data-a="toggleTransport" id="transport-btn">${S.transportPlaying ? I.pause(26) : I.play(28)}</button>
    <div class="t-pos" id="t-pos">${fmtTime(S.position)}</div>
    <input type="range" min="0" max="${Math.max(1, Math.round(S.duration))}" value="${Math.round(S.position)}" data-in="seek" id="t-range">
    <div class="t-dur" id="t-dur">${fmtTime(S.duration)}</div>
    <div class="t-vdiv"></div>
    <div class="t-vol">${I.volFull()}<input type="range" min="0" max="100" value="${S.settings.masterVol}" data-in="master"></div>
  </div>`;
}

function chordPickerHTML(song) {
  const name = S.chordPicker;
  // Mesma guarda de chordsGridHTML: nome muda no transposto, dicionário não.
  const dict = S.transpose ? {} : (song.cifra?.digitacoes || {});
  const { shapes, selId } = pickerShapes(name, dict[name] || null);
  const ed = S.chordEd && S.chordEd.origin.kind === 'song' ? S.chordEd : null;
  const corpo = ed
    ? chordEditorHTML(ed, { fromLabel: (shapeById(name, ed.origin.varId) || {}).label })
    : (shapeStripHTML(name, shapes, selId, 'pickChordShape', false)
       || `<div style="padding:14px;color:var(--muted);font-size:13px">${t('play.chordPicker.noShapes', { action: t('play.chordPicker.newVariation') })}</div>`);
  return `<div class="scrim" data-a="closeChordPicker">
    <div class="popover" data-stop="1">
      <div class="head"><div class="head-row"><div class="title">${t('play.chordPicker.variationsOf', { name: esc(name) })}</div>
        <button class="btn-icon xs" data-a="closeChordPicker">${I.close()}</button></div></div>
      <div class="body">${corpo}</div>
      ${ed ? '' : `<div class="foot">
        <button class="btn-ghost sm" data-a="pickNewVar" data-id="${esc(name)}">${I.plus(16)}${t('play.chordPicker.newVariation')}</button>
        ${selId ? `<button class="btn-ghost sm" data-a="pickEditVar" data-id="${esc(name)}" data-var="${esc(selId)}">${I.pencil(16)}${t('play.chordPicker.edit')}</button>` : ''}
      </div>`}
    </div>
  </div>`;
}

// -------- tela --------
export function renderPlay() {
  const song = currentSong();
  if (!song) { S.screen = 'home'; return '<div></div>'; }
  const isImg = S.viewMode === 'cifra' && song.cifra?.tipo === 'imagem';
  const isTextCifra = song.cifra?.tipo !== 'imagem';
  const isKar = S.viewMode === 'karaoke';
  const hasKaraoke = !!(song.letra && song.letra.trim());
  const hasMixer = (song.stems || []).length > 0 || (song.full || []).length > 0;
  // Um mecanismo, dois gatilhos: o que a transposição não consegue levar junto.
  // Áudio não muda de tom, e tab é casa absoluta. Só aparece quando há o que
  // avisar — fora do tom original e com a coisa presente na música.
  const avisos = [];
  if (S.transpose && !isImg && !isKar) {
    if (hasMixer) avisos.push(t('play.tom.warnAudio'));
    if (parsedCifra(song).some((l) => l.isTab)) avisos.push(t('play.tom.warnTab'));
  }
  const avisoHTML = avisos.length
    ? `<div class="tom-warn">${esc(avisos.join(' · '))}</div>` : '';
  const imgs = song.cifra?.imagens || [];
  const variantEnabled = imgs.some((i) => i.tipo === 'aberta') && imgs.some((i) => i.tipo === 'fechada');
  const chordNames = song.cifra?.tipo === 'imagem'
    ? (song.cifra?.acordes || [])
    : (song.cifra?.acordes?.length
        ? song.cifra.acordes.map((n) => transporAcorde(n, S.transpose))
        : extractChords(transposto(parsedCifra(song), S.transpose)));

  const modeSwitch = hasKaraoke ? `<div class="mode-switch">
      <button class="${!isKar ? 'on' : ''}" data-a="setViewMode" data-id="cifra">${I.cifraLines()}${t('play.modeSwitch.chart')}</button>
      <button class="${isKar ? 'on' : ''}" data-a="setViewMode" data-id="karaoke">${I.mic(16)}${t('play.modeSwitch.karaoke')}</button>
    </div>` : '';

  const zoomCtl = isImg ? `<div class="zoom-ctl">
      <button data-a="imgZoomOut" title="${t('play.zoomCtl.zoomOut')}">−</button>
      <div class="pct" id="zoom-pct">${Math.round(S.imgZoom * 100)}%</div>
      <button data-a="imgZoomIn" title="${t('play.zoomCtl.zoomIn')}">+</button>
    </div>` : '';

  const menu = S.imgMenuOpen ? `<div class="menu-pop">
      <button data-a="menuFav"><span style="display:flex;color:${song.favorita ? 'var(--accent)' : 'var(--muted)'}">${I.heart(song.favorita, 18)}</span><span style="flex:1;text-align:left">${t('common.favorite')}</span><span class="state ${song.favorita ? 'on' : ''}">${song.favorita ? t('play.menu.favorited') : ''}</span></button>
      <button data-a="menuAddList">${I.addList(18)}<span style="flex:1;text-align:left">${t('home.song.addToList')}</span></button>
      <div class="sep"></div>
      ${isTextCifra ? `
        <button data-a="toggleMiniaturas">${I.gridChord(18)}<span style="flex:1;text-align:left">${t('play.menu.thumbnails')}</span><span class="state ${S.settings.cifraMiniaturas ? 'on' : ''}">${S.settings.cifraMiniaturas ? t('common.on') : t('common.off')}</span></button>
        <div class="sep"></div>` : ''}
      ${isImg ? `
        <button data-a="toggleInvert">${I.invert()}<span style="flex:1;text-align:left">${t('play.menu.invertColors')}</span><span class="state ${S.imgInvert ? 'on' : ''}">${S.imgInvert ? t('common.on') : t('common.off')}</span></button>
        <button data-a="toggleVariant" ${variantEnabled ? '' : 'disabled'}>${I.swap()}<span style="flex:1;text-align:left">${t('play.menu.chartFormat')}</span><span class="state">${S.imgVariant === 'fechada' ? t('play.menu.closed') : t('play.menu.open')}</span></button>
        <div class="sep"></div>` : ''}
      <button data-a="editSong">${I.pencil()}<span style="flex:1;text-align:left">${t('play.menu.editSong')}</span></button>
      <button class="danger" data-a="deleteSongAsk">${I.trash()}<span style="flex:1;text-align:left">${t('play.menu.deleteSong')}</span></button>
    </div>` : '';

  const body = isKar ? karaokeHTML(song) : (isImg ? cifraImageHTML(song) : cifraTextHTML(song));

  const scrollCtl = `<div class="scroll-ctl">
      <button class="pp" data-a="toggleScroll">${S.scrollPlaying ? I.pause(22) : I.play(22)}</button>
      <div class="div"></div>
      <button class="pm" data-a="decSpeed">−</button>
      <div class="mid"><div class="l1">${t('play.scrollCtl.label')}</div><div class="l2">${t('play.scrollCtl.speed')} <span id="speed-val">${S.scrollSpeed}</span></div></div>
      <button class="pm" data-a="incSpeed">+</button>
    </div>`;

  return `<div class="screen">
    <div class="play-head">
      <button class="btn-icon" data-a="goBack" title="${t('common.back')}">${I.back()}</button>
      ${modeSwitch}
      <span style="flex:1"></span>
      ${zoomCtl}
      ${songNavButtonHTML()}
      <div class="menu-wrap">
        <button class="btn-icon ${S.imgMenuOpen ? 'accent-on' : ''}" data-a="toggleImgMenu" title="${t('play.menu.options')}">${I.dots()}</button>
        ${menu}
      </div>
      ${hasMixer ? `<button class="btn-icon ${S.mixerCollapsed ? '' : 'teal-on'}" data-a="toggleMixer" title="${S.mixerCollapsed ? t('play.mixer.show') : t('play.mixer.collapse')}">${I.mixer()}</button>` : ''}
      ${offlineBadge}
    </div>
    <div class="play-body">
      <div class="cifra-col">
        ${pinnedBarHTML(song, chordNames)}
        ${body}
        ${avisoHTML}
        ${scrollCtl}
        ${songNavArrowsHTML()}
      </div>
      ${hasMixer && !S.mixerCollapsed ? mixerHTML(song) : ''}
    </div>
    ${hasMixer ? transportHTML() : ''}
    ${S.chordPicker ? chordPickerHTML(song) : ''}
    ${S.chordPop ? chordPopHTML(song) : ''}
    ${S.tomPop ? tomPopHTML(song, tomAtual(song)) : ''}
    ${songNavHTML()}
  </div>`;
}

// -------- comportamento pós-render (gestos, autoscroll, relógio) --------
let scrollTimer = null;
let scrollPos = null;   // posição da rolagem automática, com a fração preservada
let ctlTimer = null;
let mixerWasOpen = false;
let navWasOpen = false;

// Os três elementos da camada flutuante. Uma constante e não três listas soltas:
// showControls, hideControls e o laço da rolagem automática precisam concordar,
// e a terceira lista é justamente a que esquece o membro novo — deixando as
// setas presas na tela durante a rolagem.
const CTL_SEL = '.scroll-ctl, .zoom-ctl, .songnav-arrow';

export function afterRenderPlay(update) {
  const song = currentSong();
  if (!song) return;

  // Reflow: mede a largura real e re-renderiza se mudou. O update() reentra aqui e,
  // com a largura já estável, segue o fluxo normal.
  if (reflowCifra(update)) return;
  const cifraEl = document.querySelector('.cifra-text');
  if (cifraEl && !cifraEl._roWired && typeof ResizeObserver === 'function') {
    cifraEl._roWired = true;
    // rotação de tela, mixer abrindo/fechando: a largura muda sem re-render
    new ResizeObserver(() => { cifraColsPrev = 0; reflowCifra(update); }).observe(cifraEl);
  }

  // relógio do transporte → patch direto no DOM (sem re-render)
  audio.onTime = (pos, dur) => {
    S.position = pos;
    S.duration = dur;
    const p = document.getElementById('t-pos');
    const d = document.getElementById('t-dur');
    const r = document.getElementById('t-range');
    if (p) p.textContent = fmtTime(pos);
    if (d) d.textContent = fmtTime(dur);
    if (r && !r.matches(':active')) {
      r.max = Math.max(1, Math.round(dur));
      r.value = Math.round(pos);
    }
  };
  audio.onEnded = () => { S.transportPlaying = false; update(); };

  // autoscroll
  manageScroll();

  // auto-hide dos controles (via classe CSS, SEM re-render) + gestos da imagem
  const el = document.querySelector('[data-autoscroll]');
  if (el && !el._ctlWired) {
    el._ctlWired = true;
    ['pointerdown', 'pointermove', 'wheel', 'touchstart', 'touchmove'].forEach((ev) =>
      el.addEventListener(ev, showControls, { passive: true }));
    el.addEventListener('scroll', () => { if (!S.scrollPlaying) showControls(); }, { passive: true });
    el.addEventListener('scroll', () => {
      if (!el.isConnected) return; // evento atrasado do container antigo (destacado) lê scrollTop 0
      // rolagem real fecha o popover do acorde; o restoreUI do re-render repõe
      // o MESMO scrollTop, então não dispara este fechamento
      if (S.chordPop && Math.abs(el.scrollTop - S.chordPop.scrollTop) > 1) { S.chordPop = null; update(); }
      // mesma regra para o popover do tom: a pílula que ele ancora mora dentro
      // deste mesmo container rolável, e rolar afasta o popover fixo do anchor.
      if (S.tomPop && Math.abs(el.scrollTop - S.tomPop.scrollTop) > 1) { S.tomPop = null; update(); }
    }, { passive: true });
  }
  showControls();

  // popover do acorde: re-posiciona com o tamanho real (o render usou estimativa)
  const pop = document.querySelector('.chord-pop');
  if (pop && S.chordPop) {
    const r = pop.getBoundingClientRect();
    const p = popPosition(S.chordPop.anchor, r.width, r.height, window.innerWidth, window.innerHeight);
    pop.style.left = p.left + 'px';
    pop.style.top = p.top + 'px';
  }
  // popover do tom: mesma re-clampagem — tompop.js's estimativa (W×H) é só para
  // o 1º render; aqui o card real já existe no DOM para medir.
  const tomPop = document.querySelector('.tom-pop');
  if (tomPop && S.tomPop) {
    const r = tomPop.getBoundingClientRect();
    const p = popPosition(S.tomPop.anchor, r.width, r.height, window.innerWidth, window.innerHeight);
    tomPop.style.left = p.left + 'px';
    tomPop.style.top = p.top + 'px';
  }

  // anima a entrada do bottom sheet só quando ele acabou de abrir (não a cada re-render)
  const mx = document.querySelector('.mixer');
  if (mx && !mixerWasOpen) mx.classList.add('sheet-enter');
  mixerWasOpen = !!mx;

  // Mesmo latch para a gaveta de navegação: o slide-in e o snap de rolagem
  // para a linha atual (scrollNavAtual) só correm na transição fechado→aberto.
  // Sem isto, qualquer re-render com a gaveta já aberta — loadSongMedia ainda
  // em voo, o fim da faixa — repetia a animação E arrancava de volta uma
  // rolagem que o usuário tinha acabado de fazer com o dedo.
  const nav = document.querySelector('.songnav');
  if (nav && !navWasOpen) { nav.classList.add('nav-enter'); scrollNavAtual(); }
  navWasOpen = !!nav;

  setupImgGestures(update);
  applyImgZoom();
}

function showControls() {
  document.querySelectorAll(CTL_SEL).forEach((c) => c.classList.remove('ctl-hidden'));
  clearTimeout(ctlTimer);
  ctlTimer = setTimeout(hideControls, 3200);
}
function hideControls() {
  if (S.screen !== 'play') return;
  document.querySelectorAll(CTL_SEL).forEach((c) => c.classList.add('ctl-hidden'));
}

export function manageScroll() {
  const active = S.scrollPlaying && S.screen === 'play';
  if (active && !scrollTimer) {
    // A posição é acumulada em ponto flutuante à parte: no nível 1 o passo é de
    // 0,35 px, e ler scrollTop de volta a cada volta perderia a fração para o
    // arredondamento do navegador — a cifra andaria mais devagar do que o pedido,
    // ou nem andaria. Só ressincroniza quando o usuário arrasta a cifra na mão.
    scrollPos = null;
    scrollTimer = setInterval(() => {
      const el = document.querySelector('[data-autoscroll]');
      if (!el) return;
      // mantém os controles visíveis durante a rolagem (para poder pausar)
      const ctls = document.querySelectorAll(CTL_SEL);
      if (ctls.length) { ctls.forEach((c) => c.classList.remove('ctl-hidden')); clearTimeout(ctlTimer); }
      if (scrollPos === null || Math.abs(el.scrollTop - scrollPos) > 1.5) scrollPos = el.scrollTop;
      scrollPos += scrollStep(S.scrollSpeed);
      el.scrollTop = scrollPos;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) {
        S.scrollPlaying = false;
        clearInterval(scrollTimer); scrollTimer = null;
        const btn = document.querySelector('.scroll-ctl .pp');
        if (btn) btn.innerHTML = I.play(22);
        showControls();
      }
    }, SCROLL_TICK_MS);
  } else if (!active && scrollTimer) {
    clearInterval(scrollTimer); scrollTimer = null;
  }
}

function applyImgZoom() {
  const el = document.querySelector('[data-imgscroll]');
  if (!el) return;
  const img = el.querySelector('img');
  if (!img) return;
  img.style.width = (el.clientWidth * S.imgZoom) + 'px';
  el.querySelector('.inner').style.alignItems = S.imgZoom > 1.001 ? 'flex-start' : 'center';
  const pct = document.getElementById('zoom-pct');
  if (pct) pct.textContent = Math.round(S.imgZoom * 100) + '%';
}

export function zoomBy(d) {
  S.imgZoom = Math.max(0.4, Math.min(4, +(S.imgZoom + d).toFixed(3)));
  applyImgZoom();
}

function imgDist(t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY); }

function setupImgGestures() {
  const el = document.querySelector('[data-imgscroll]');
  if (!el || el._gesturesWired) return;
  el._gesturesWired = true;
  let dragging = false, sx = 0, sy = 0, sl = 0, stp = 0, pinching = false;
  el.addEventListener('pointerdown', (e) => {
    if (pinching) return;
    if (e.target.closest && e.target.closest('[data-nopan]')) return;
    dragging = true; sx = e.clientX; sy = e.clientY; sl = el.scrollLeft; stp = el.scrollTop;
    el.classList.add('grabbing');
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
  });
  el.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    el.scrollLeft = sl - (e.clientX - sx);
    el.scrollTop = stp - (e.clientY - sy);
  });
  const end = () => { dragging = false; el.classList.remove('grabbing'); };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('wheel', (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? 0.15 : -0.15);
  }, { passive: false });
  let startDist = 0, startZoom = 1;
  el.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) { pinching = true; startDist = imgDist(e.touches); startZoom = S.imgZoom; }
  }, { passive: false });
  el.addEventListener('touchmove', (e) => {
    if (pinching && e.touches.length === 2) {
      e.preventDefault();
      S.imgZoom = Math.max(0.4, Math.min(4, +(startZoom * (imgDist(e.touches) / (startDist || 1))).toFixed(3)));
      applyImgZoom();
    }
  }, { passive: false });
  el.addEventListener('touchend', (e) => { if (e.touches.length < 2) pinching = false; });
}

export function stopPlayTimers() {
  if (scrollTimer) { clearInterval(scrollTimer); scrollTimer = null; }
  scrollPos = null;
  clearTimeout(ctlTimer);
  mixerWasOpen = false;
  navWasOpen = false;
  audio.onTime = null;
  audio.onEnded = null;
}
