// render/songnav.js — andar entre as músicas do contexto de navegação.
//
// A gaveta SOBREPÕE a cifra em vez de empurrá-la, e isso não é preferência
// estética: a cifra em texto se re-diagrama pela largura da caixa (reflowCifra e
// fontQueCabe, em render/play.js). Uma coluna que empurra mudaria o tamanho da
// fonte e o ponto de quebra de cada linha a cada abre/fecha — a música se
// mexendo debaixo do dedo no meio do ensaio. De brinde: não disputa a vaga do
// mixer e não precisa de breakpoint novo.
//
// Este módulo só desenha e traduz. Quais músicas, e em que ordem, é assunto de
// songsDoContexto() em state.js.
//
// Cada função aqui chama songsDoContexto() por conta própria, e um render da tela
// de toque a chama umas quatro vezes. É deliberado: nos contextos artista, estilo
// e lista o trabalho é sobre um punhado de músicas, e o único caso que ordena a
// biblioteca inteira — a busca — é exatamente o que a tela Home já faz a cada
// render dela. Passar a lista por parâmetro obrigaria a enfiá-la também em
// songHeaderHTML e nas três funções de corpo que a chamam; o cache vale a pena
// quando alguém medir que vale.
// Spec: docs/superpowers/specs/2026-08-17-navegacao-entre-musicas-design.md
import {
  S, songsDoContexto, posicaoNoContexto, listaAberta,
  artistById, modesOf, SEM_ESTILO,
} from '../state.js';
import { I, esc } from '../icons.js';
import { t } from '../i18n.js';

// Rótulo do tipo do contexto. Traduzido no render, nunca em constante de módulo:
// uma constante congelaria o idioma no import.
function rotuloDoTipo(kind) {
  if (kind === 'artist') return t('play.nav.fromArtist');
  if (kind === 'estilo') return t('play.nav.fromEstilo');
  if (kind === 'list') return t('play.nav.fromList');
  return t('play.nav.fromHome');
}

// Nome próprio do contexto — o que a tela de origem mostrou no título. Os casos
// especiais são os mesmos que as telas já tratam: 'Sem estilo' (render/estilo.js)
// e a lista de sistema Favoritas (render/listscreen.js).
export function contextoNome(ctx = S.navCtx) {
  if (!ctx) return '';
  if (ctx.kind === 'artist') return (artistById(ctx.id) || {}).name || '';
  if (ctx.kind === 'estilo') return ctx.id === SEM_ESTILO ? t('estilo.none') : (ctx.id || '');
  if (ctx.kind === 'list') {
    const l = listaAberta(ctx.id);
    return l ? (l.sistema ? t('list.favoritesName') : l.nome) : '';
  }
  return '';
}

// "3 de 24 em Djavan" — ou "3 de 24" quando o contexto não tem nome próprio
// (a busca). Vazio quando a atual não está no contexto: melhor não dizer nada
// do que dizer "0 de 24".
export function posicaoTexto() {
  const { i, n } = posicaoNoContexto();
  if (i < 0 || !n) return '';
  const nome = contextoNome();
  return nome
    ? t('play.nav.positionIn', { i: i + 1, n, nome })
    : t('play.nav.position', { i: i + 1, n });
}

// O botão que abre a gaveta. Some quando não há contexto ou quando ele tem uma
// música só — uma gaveta para navegar entre uma música é ruído.
export function songNavButtonHTML() {
  if (songsDoContexto().length < 2) return '';
  return `<button class="btn-icon ${S.navOpen ? 'accent-on' : ''}" data-a="toggleSongNav" title="${t('play.nav.open')}">${I.listIcon(22)}</button>`;
}

// Mesmo rótulo de modo da tela da lista. `bestLabel()` de state.js devolve
// português cru — aqui a linha precisa seguir o idioma escolhido.
const modeLabel = (so) => modesOf(so).includes('T2') ? t('list.modeChartAccomp') : t('list.modeChart');

export function songNavHTML() {
  if (!S.navOpen) return '';
  const songs = songsDoContexto();
  const { i, n } = posicaoNoContexto(songs);
  const nome = contextoNome();
  const linhas = songs.length
    ? songs.map((so, idx) => {
      const atual = so.id === S.currentSongId;
      return `<div class="songnav-row ${atual ? 'now' : ''}" data-a="navPick" data-id="${so.id}">
        <div class="num">${idx + 1}</div>
        <div class="tt">
          <div class="t">${esc(so.title)}</div>
          <div class="m">${modeLabel(so)}</div>
        </div>
        ${atual
          ? `<div class="now-tag"><span class="dot"></span>${t('play.nav.now')}</div>`
          : `<div class="go">${I.play(14)}</div>`}
      </div>`;
    }).join('')
    : `<div class="songnav-empty">${t('play.nav.empty')}</div>`;

  return `<div class="songnav-scrim" data-a="closeSongNav"></div>
    <aside class="songnav" data-stop="1" data-nopan="1">
      <div class="songnav-head">
        <div class="ic">${I.listIcon(20)}</div>
        <div class="tt">
          <div class="k">${rotuloDoTipo(S.navCtx?.kind)}</div>
          <div class="n">${esc(nome)}</div>
        </div>
        <div class="pos">${i >= 0 ? t('play.nav.position', { i: i + 1, n }) : ''}</div>
        <button class="btn-icon" data-a="navGoToSource" title="${t('play.nav.goToSource')}">${I.chevR(20)}</button>
        <button class="btn-icon" data-a="closeSongNav" title="${t('play.nav.close')}">${I.close(20)}</button>
      </div>
      <div class="songnav-body">${linhas}</div>
    </aside>`;
}

// Depois do render: a linha atual precisa estar visível sem rolar à mão. Numa
// lista de 24 a atual costuma estar fora da primeira tela.
export function scrollNavAtual() {
  if (!S.navOpen) return;
  const row = document.querySelector('.songnav-row.now');
  if (row) row.scrollIntoView({ block: 'center' });
}

// As setas moram na camada flutuante que já aparece ao toque e some em 3,2s
// (showControls/hideControls, em render/play.js) — e não na top-bar, esvaziada
// de propósito pela spec 2026-07-06. Ficam coladas nas laterais, com o controle
// de rolagem seguindo centralizado entre elas.
//
// Nas pontas ficam DESABILITADAS, não escondidas: sumir moveria o controle de
// rolagem de lugar entre uma música e outra, e o dedo aprende posição antes de
// aprender rótulo.
export function songNavArrowsHTML() {
  const songs = songsDoContexto();
  if (songs.length < 2) return '';
  const { i } = posicaoNoContexto(songs);
  const semAnterior = i <= 0;
  const semProxima = i < 0 || i >= songs.length - 1;
  return `<button class="songnav-arrow prev" data-a="songPrev" ${semAnterior ? 'disabled' : ''} title="${t('play.nav.prev')}">${I.back(26)}</button>
    <button class="songnav-arrow next" data-a="songNext" ${semProxima ? 'disabled' : ''} title="${t('play.nav.next')}">${I.chevR(26)}</button>`;
}
