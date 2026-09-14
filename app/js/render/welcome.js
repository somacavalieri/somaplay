// render/welcome.js — the first screen, while the library has nothing in it.
//
// The old empty state named a menu item inside Settings and stopped there. This
// one says what the app is, and every action it offers is one tap away. Spec:
// docs/superpowers/specs/2026-09-11-home-primeira-visita-design.md
//
// Every preview is drawn with the app's own parts, so that what the screen
// promises is what the person finds inside. The diagram in particular comes from
// chordSVG: the prototype drew an "Am" with four strings by hand, and a wrong
// chord on the first screen of a chord app costs more than the shortcut saves.
import { I, esc } from '../icons.js';
import { chordSVG } from '../chords.js';
import { S, FONTE_DEMO } from '../state.js';
import { t } from '../i18n.js';
import { DEMO_URL } from '../samples.js';

// The demo song's own words, title, key and channel names. Content, not
// interface: never translated, like any chart in the app.
const TRECHO = [
  ['Am              F', '  Toca junto e ouve o mix'],
  ['C               G', '  Cada canal no seu lugar'],
];
const DEMO_TITULO = 'Groove de teste';
const DEMO_TOM = 'Am';
const DEMO_CANAIS = [['Baixo', 80], ['Violão', 0], ['Bateria', 70]];

// A <pre> in the chart's monospace, and not a call into the chart layout: that
// layout measures the DOM and needs a saved song. Two lines is the same picture
// at a tenth of the cost.
function trechoHTML() {
  return `<pre class="wc-chart">${TRECHO.map(([ac, ly]) =>
    `<span class="wc-ch">${esc(ac)}</span>\n${esc(ly)}`).join('\n')}</pre>`;
}

function previaCifra() {
  return `<div class="wc-preview" aria-hidden="true">
    <div class="wc-preview-hd">
      <span class="wc-badge t1">T1</span>
      <span class="wc-preview-nm">${esc(DEMO_TITULO)}</span>
      <span>${t('home.welcome.previewKey', { tom: esc(DEMO_TOM) })}</span>
    </div>
    <div class="wc-preview-body">
      ${trechoHTML()}
      <div class="wc-preview-diag">
        <span class="wc-ch">${esc(DEMO_TOM)}</span>
        ${chordSVG(DEMO_TOM, false, null)}
        <span class="wc-preview-hint">${t('home.welcome.previewHint')}</span>
      </div>
    </div>
  </div>`;
}

function previaMixer() {
  return `<div class="wc-mixer" aria-hidden="true">${DEMO_CANAIS.map(([nome, pct]) => `
    <div class="wc-fader">
      <span class="wc-fader-nm">${esc(nome)}</span>
      <span class="wc-fader-track"><span class="wc-fader-fill" style="width:${pct}%"></span></span>
    </div>`).join('')}</div>`;
}

// Same fragment as previaCifra's chart, wrapped like previaMixer/previaKaraoke
// so a screen reader does not announce a bar of chart text with no context —
// every preview here is decorative (spec 2026-09-11-home-primeira-visita-design.md).
function previaChart() {
  return `<div class="wc-mode-chart" aria-hidden="true">${trechoHTML()}</div>`;
}

function previaKaraoke() {
  // The current line first, the next one under it — the order of the lyrics.
  return `<div class="wc-karaoke" aria-hidden="true">
    <div class="wc-kline on">${esc(TRECHO[0][1].trim())}</div>
    <div class="wc-kline">${esc(TRECHO[1][1].trim())}</div>
  </div>`;
}

function cartao(titulo, texto, extra = '') {
  return `<div class="wc-card">
    <div class="wc-card-t">${titulo}</div>
    <div class="wc-card-s">${texto}</div>
    ${extra}
  </div>`;
}

function modo(classe, badge, titulo, texto, previa) {
  return `<div class="wc-mode">
    <div class="wc-mode-txt">
      <div class="wc-mode-t"><span class="wc-badge ${classe}">${badge}</span>${titulo}</div>
      <div class="wc-mode-s">${texto}</div>
    </div>
    ${previa}
  </div>`;
}

export function welcomeHTML() {
  return `<div class="content-scroll wc">
    <div class="wc-hero">
      <div class="wc-hero-txt">
        <h1 class="wc-title">${t('home.welcome.title')}</h1>
        <p class="wc-sub">${t('home.welcome.sub')}</p>
        <div class="wc-actions">
          <button class="btn-primary" data-a="goAdd">${I.plus(20, 2.4)}${t('home.welcome.addSong')}</button>
          <button class="btn-ghost lg" data-a="pickLivroHome">${I.book(18)}${t('home.welcome.addBook')}</button>
          <button class="btn-ghost lg" data-a="abrirSomaplayHome">${I.upload(18)}${t('home.welcome.openFile')}</button>
        </div>
        <div class="wc-demo">
          <span class="wc-demo-lead">${t('home.welcome.demoLead')}</span>
          <button class="btn-ghost lg wc-demo-btn" data-a="carregarDemo">${I.play(16)}${t('home.welcome.demoBtn')}</button>
          <span class="wc-demo-sub">${t('home.welcome.demoSub')}</span>
          <a class="wc-demo-dl" href="${DEMO_URL}" download>${t('home.welcome.demoDownload')}</a>
        </div>
        ${S.online === false ? `<div class="wc-offline">${t('home.welcome.demoOffline')}</div>` : ''}
      </div>
      ${previaCifra()}
    </div>

    <div class="wc-cards">
      ${cartao(`${I.pencil(18)}${t('home.welcome.create.title')}`, t('home.welcome.create.text'))}
      ${cartao(`${I.book(18)}${t('home.welcome.bring.title')}`, t('home.welcome.bring.text'))}
      ${cartao(`${I.uploadSm(18)}${t('home.welcome.share.title')}`, t('home.welcome.share.text'),
        `<div class="wc-card-later">${t('home.welcome.share.later')}</div>`)}
    </div>

    <div class="wc-modes-t">${t('home.welcome.modes.title')}</div>
    <div class="wc-modes">
      ${modo('t1', 'T1', t('home.welcome.modes.t1'), t('home.welcome.modes.t1sub'), previaChart())}
      ${modo('t2', 'T2', t('home.welcome.modes.t2'), t('home.welcome.modes.t2sub'), previaMixer())}
      ${modo('t3', 'T3', t('home.welcome.modes.t3'), t('home.welcome.modes.t3sub'), previaKaraoke())}
    </div>

    <div class="wc-trust">
      <span class="wc-trust-txt">${I.check(16)}${t('home.welcome.trust')}</span>
      ${S.podeInstalar ? `<button class="btn-ghost lg" data-a="instalarApp">${I.download(18)}${t('home.welcome.install')}</button>` : ''}
    </div>

    <input type="file" id="file-backup" accept=".somaplay" hidden>
    <input type="file" id="file-livro" accept="application/pdf" multiple hidden>
  </div>`;
}

// What is left of the welcome screen once the demo is in: where to start, and
// the way out. "Tirar a demo" is deleteFonteAsk with the demo's source — the
// same door any other source leaves by, confirmation and toasts included.
//
// The song title is a parameter, never part of the translated string: it is
// content, and t() does not escape parameters, so it arrives escaped.
export function guiaDemoHTML(song) {
  const titulo = song ? esc(song.title) : '';
  return `<div class="wc-guia">
    <div class="wc-guia-txt">
      <div class="wc-guia-t">${t('home.guia.title')}</div>
      <div class="wc-guia-s">${t('home.guia.text', { title: titulo })}</div>
    </div>
    ${song ? `<button class="btn-primary small" data-a="openSong" data-id="${esc(song.id)}" data-from="home">${I.play(16)}${t('home.guia.open', { title: titulo })}</button>` : ''}
    <button class="btn-ghost" data-a="deleteFonteAsk" data-id="${FONTE_DEMO}">${I.trash(17)}${t('home.guia.remove')}</button>
    <button class="btn-icon sm" data-a="fecharGuiaDemo" title="${t('home.guia.close')}">${I.close(18)}</button>
  </div>`;
}
