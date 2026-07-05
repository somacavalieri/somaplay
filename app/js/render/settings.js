// render/settings.js — Configurações (tela mínima do MVP, §10 do PRD)
import { S } from '../state.js';
import { I } from '../icons.js';
import { DB } from '../db.js';

export function renderSettings() {
  const st = S.settings;
  return `<div class="screen">
    <div class="topbar">
      <button class="btn-icon" data-a="goHome" title="Voltar">${I.back()}</button>
      <div class="page-title">Configurações</div>
    </div>
    <div class="content-scroll" style="padding:26px 28px">
      <div class="settings-wrap">

        <button class="setting-row link" data-a="goAdd">
          <div style="width:46px;height:46px;flex-shrink:0;border-radius:12px;display:flex;align-items:center;justify-content:center;background:var(--accent-tint2);color:var(--accent)">${I.plus(22, 2.4)}</div>
          <div class="info"><div class="t title">Adicionar música</div><div class="s">Cadastrar uma nova música na biblioteca</div></div>
          ${I.chevR()}
        </button>

        <div class="setting-row">
          <div class="info"><div class="t">Manter a tela ligada</div><div class="s">Evita que o tablet apague durante o uso</div></div>
          <button class="toggle-sw ${st.awake ? 'on' : ''}" data-a="toggleAwake"><span></span></button>
        </div>

        <div class="setting-row">
          <div class="info"><div class="t">Tema</div><div class="s">Escuro recomendado para palco</div></div>
          <div class="seg-mini">
            <button class="${st.theme === 'dark' ? 'on' : ''}" data-a="setTheme" data-id="dark">Escuro</button>
            <button class="${st.theme === 'light' ? 'on' : ''}" data-a="setTheme" data-id="light">Claro</button>
          </div>
        </div>

        <div class="setting-block">
          <div class="hd"><div class="t">Tamanho / zoom da cifra</div><div class="v" id="v-zoom">${st.cifraZoom}%</div></div>
          <input type="range" min="70" max="180" value="${st.cifraZoom}" data-in="setZoom">
        </div>

        <div class="setting-block">
          <div class="hd"><div class="t">Velocidade padrão da rolagem</div><div class="v" id="v-speed">${st.defaultSpeed}</div></div>
          <input type="range" min="1" max="10" value="${st.defaultSpeed}" data-in="setDefSpeed">
        </div>

        <div class="setting-block">
          <div class="hd"><div class="t">Volume master</div><div class="v" id="v-master">${st.masterVol}%</div></div>
          <input type="range" min="0" max="100" value="${st.masterVol}" data-in="setMasterVol">
        </div>

        <div class="setting-row dim">
          <div class="info"><div class="t">Saída de áudio</div><div class="s">Disponível apenas no desktop</div></div>
          <div style="display:flex;align-items:center;gap:8px;background:var(--surface);border:1px solid var(--border);border-radius:11px;height:44px;padding:0 14px;color:var(--muted);font-size:14px">Saída padrão do sistema ${I.chevD(16)}</div>
        </div>

        <div class="setting-block" style="padding:20px;margin-top:6px">
          <div style="font-family:var(--f-title);font-weight:600;font-size:17px;margin-bottom:4px">Armazenamento e backup</div>
          <div style="color:var(--muted);font-size:13px;margin-bottom:14px" id="storage-label">calculando...</div>
          <div class="storage-bar"><div id="storage-fill" style="width:2%"></div></div>
          <div class="pair-btns">
            <button data-a="exportBackup">${I.download()}Exportar biblioteca</button>
            <button data-a="importBackup">${I.uploadSm()}Importar biblioteca</button>
          </div>
        </div>

        <button class="setting-row link" data-a="importSamples">
          <div style="width:46px;height:46px;flex-shrink:0;border-radius:12px;display:flex;align-items:center;justify-content:center;background:var(--teal-tint2);color:var(--teal)">${I.music(20)}</div>
          <div class="info"><div class="t title">Importar exemplos</div><div class="s">Paralelas (cifra por imagem) e Andança (cifra em texto)</div></div>
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
  const gb = (n) => (n / (1024 ** 3)).toFixed(n > 1024 ** 3 ? 1 : 2).replace('.', ',');
  if (est.quota) {
    el.textContent = `${gb(est.usage)} GB de ${gb(est.quota)} GB usados`;
    if (fill) fill.style.width = Math.max(2, Math.min(100, (est.usage / est.quota) * 100)) + '%';
  } else {
    el.textContent = 'uso de armazenamento indisponível';
  }
}
