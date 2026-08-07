// render/settings.js — Configurações (tela mínima do MVP, §10 do PRD)
import { S } from '../state.js';
import { I } from '../icons.js';
import { DB } from '../db.js';
import { SCROLL_MIN, SCROLL_MAX } from '../scroll-speed.js';
import { t, getLang } from '../i18n.js';

export function renderSettings() {
  const st = S.settings;
  return `<div class="screen">
    <div class="topbar">
      <button class="btn-icon" data-a="goHome" title="${t('common.back')}">${I.back()}</button>
      <div class="page-title">${t('settings.title')}</div>
    </div>
    <div class="content-scroll" style="padding:26px 28px">
      <div class="settings-wrap">

        <button class="setting-row link" data-a="goAdd">
          <div style="width:46px;height:46px;flex-shrink:0;border-radius:12px;display:flex;align-items:center;justify-content:center;background:var(--accent-tint2);color:var(--accent)">${I.plus(22, 2.4)}</div>
          <div class="info"><div class="t title">${t('settings.addSong.title')}</div><div class="s">${t('settings.addSong.sub')}</div></div>
          ${I.chevR()}
        </button>

        <button class="setting-row link" data-a="goChordbook">
          <div style="width:46px;height:46px;flex-shrink:0;border-radius:12px;display:flex;align-items:center;justify-content:center;background:var(--accent-tint2);color:var(--accent)">${I.gridChord(22)}</div>
          <div class="info"><div class="t title">${t('settings.chordbook.title')}</div><div class="s">${t('settings.chordbook.sub')}</div></div>
          ${I.chevR()}
        </button>

        <div class="setting-row">
          <div class="info"><div class="t">${t('settings.awake.title')}</div><div class="s">${t('settings.awake.sub')}</div></div>
          <button class="toggle-sw ${st.awake ? 'on' : ''}" data-a="toggleAwake"><span></span></button>
        </div>

        <div class="setting-row">
          <div class="info"><div class="t">${t('settings.theme.title')}</div><div class="s">${t('settings.theme.sub')}</div></div>
          <div class="seg-mini">
            <button class="${st.theme === 'dark' ? 'on' : ''}" data-a="setTheme" data-id="dark">${t('settings.theme.dark')}</button>
            <button class="${st.theme === 'light' ? 'on' : ''}" data-a="setTheme" data-id="light">${t('settings.theme.light')}</button>
          </div>
        </div>

        <div class="setting-row">
          <div class="info"><div class="t">${t('settings.lang.title')}</div><div class="s">${t('settings.lang.sub')}</div></div>
          <div class="seg-mini">
            <button class="${st.lang === 'pt' ? 'on' : ''}" data-a="setLang" data-id="pt">${t('settings.lang.pt')}</button>
            <button class="${st.lang === 'en' ? 'on' : ''}" data-a="setLang" data-id="en">${t('settings.lang.en')}</button>
          </div>
        </div>

        <div class="setting-row">
          <div class="info"><div class="t">${t('settings.notation.title')}</div><div class="s">${t('settings.notation.sub')}</div></div>
          <div class="seg-mini">
            <button class="${st.chordNotation === 'br' ? 'on' : ''}" data-a="setNotation" data-id="br">${t('settings.notation.br')}</button>
            <button class="${st.chordNotation === 'intl' ? 'on' : ''}" data-a="setNotation" data-id="intl">${t('settings.notation.intl')}</button>
          </div>
        </div>

        <div class="setting-block">
          <div class="hd"><div class="t">${t('settings.zoom')}</div><div class="v" id="v-zoom">${st.cifraZoom}%</div></div>
          <input type="range" min="70" max="180" value="${st.cifraZoom}" data-in="setZoom">
        </div>

        <div class="setting-block">
          <div class="hd"><div class="t">${t('settings.speed')}</div><div class="v" id="v-speed">${st.defaultSpeed}</div></div>
          <input type="range" min="${SCROLL_MIN}" max="${SCROLL_MAX}" value="${st.defaultSpeed}" data-in="setDefSpeed">
        </div>

        <div class="setting-block">
          <div class="hd"><div class="t">${t('settings.masterVol')}</div><div class="v" id="v-master">${st.masterVol}%</div></div>
          <input type="range" min="0" max="100" value="${st.masterVol}" data-in="setMasterVol">
        </div>

        <div class="setting-row dim">
          <div class="info"><div class="t">${t('settings.audioOut.title')}</div><div class="s">${t('settings.audioOut.sub')}</div></div>
          <div style="display:flex;align-items:center;gap:8px;background:var(--surface);border:1px solid var(--border);border-radius:11px;height:44px;padding:0 14px;color:var(--muted);font-size:14px">${t('settings.audioOut.default')} ${I.chevD(16)}</div>
        </div>

        <div class="setting-block" style="padding:20px;margin-top:6px">
          <div style="font-family:var(--f-title);font-weight:600;font-size:17px;margin-bottom:4px">${t('settings.backup.heading')}</div>
          <div style="color:var(--muted);font-size:13px;margin-bottom:14px" id="storage-label">${t('storage.calculating')}</div>
          <div class="storage-bar"><div id="storage-fill" style="width:2%"></div></div>
          <div class="pair-btns">
            <button data-a="exportBackup">${I.download()}${t('settings.backup.export')}</button>
            <button data-a="importBackup">${I.uploadSm()}${t('settings.backup.import')}</button>
          </div>
          <button class="btn-ghost" style="width:100%;margin-top:8px;height:44px;justify-content:center" data-a="importBackupMerge">${I.uploadSm()}${t('settings.backup.merge')}</button>
        </div>

        <button class="setting-row link" data-a="importSamples">
          <div style="width:46px;height:46px;flex-shrink:0;border-radius:12px;display:flex;align-items:center;justify-content:center;background:var(--teal-tint2);color:var(--teal)">${I.music(20)}</div>
          <div class="info"><div class="t title">${t('settings.samples.title')}</div><div class="s">${t('settings.samples.sub')}</div></div>
          ${I.chevR()}
        </button>

      </div>
    </div>
    <input type="file" id="file-backup" accept=".somaplay" hidden>
  </div>`;
}

// atualização assíncrona do uso de armazenamento (patch direto)
export async function fillStorageInfo() {
  const el = document.getElementById('storage-label');
  const fill = document.getElementById('storage-fill');
  if (!el) return;
  const est = await DB.storageEstimate();
  const dec = getLang() === 'pt' ? ',' : '.';
  const gb = (n) => (n / (1024 ** 3)).toFixed(n > 1024 ** 3 ? 1 : 2).replace('.', dec);
  if (est.quota) {
    el.textContent = t('storage.used', { used: gb(est.usage), total: gb(est.quota) });
    if (fill) fill.style.width = Math.max(2, Math.min(100, (est.usage / est.quota) * 100)) + '%';
  } else {
    el.textContent = t('storage.unavailable');
  }
}
