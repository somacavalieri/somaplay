// audio.js — motor de áudio: transporte único (play/pause/seek global) com Web Audio.
// Cada faixa: HTMLAudioElement → MediaElementSource → GainNode → masterGain → destino.
// Fonte ativa: 'stems' (todos os canais) OU o id de uma versão completa.
// A faixa "líder" dita a posição; seguidores são corrigidos se driftarem > 80ms.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.tracks = new Map(); // trackId -> { el, gain, url, kind: 'stem'|'full' }
    this.playing = false;
    this.source = 'stems';
    this.masterVol = 0.8;
    this.onTime = null;   // cb(posSeconds, durSeconds)
    this.onEnded = null;
    this._timer = null;
    this._loadToken = 0;
  }

  _ensureCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.masterVol;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  // Carrega a música: stems [{id, blobURL, vol, muted}], fulls [{id, blobURL}]
  async load(stems, fulls, opts = {}) {
    const token = ++this._loadToken;
    this.stop();
    this._disposeTracks();
    this.source = opts.source || (stems.length ? 'stems' : (fulls[0] ? fulls[0].id : 'stems'));
    const mk = (id, url, kind) => {
      const el = new Audio();
      el.preload = 'auto';
      el.src = url;
      el.addEventListener('ended', () => {
        if (kind === 'full' ? this.source === id : this.source === 'stems') {
          if (this._leaderId() === id) { this.pause(); if (this.onEnded) this.onEnded(); }
        }
      });
      this.tracks.set(id, { el, gain: null, url, kind });
    };
    stems.forEach((s) => { if (s.blobURL) mk(s.id, s.blobURL, 'stem'); });
    fulls.forEach((f) => { if (f.blobURL) mk(f.id, f.blobURL, 'full'); });
    if (token !== this._loadToken) return; // outra música carregou no meio
    this._applyVolumes(opts.channels || [], true);
  }

  _connect(t) {
    if (t.gain || !this.ctx) return;
    try {
      const src = this.ctx.createMediaElementSource(t.el);
      t.gain = this.ctx.createGain();
      src.connect(t.gain);
      t.gain.connect(this.masterGain);
    } catch (e) { /* elemento já conectado — ignora */ }
  }

  _leaderId() {
    if (this.source === 'stems') {
      for (const [id, t] of this.tracks) if (t.kind === 'stem') return id;
      return null;
    }
    return this.tracks.has(this.source) ? this.source : null;
  }

  _activeIds() {
    const ids = [];
    for (const [id, t] of this.tracks) {
      if (this.source === 'stems' ? t.kind === 'stem' : id === this.source) ids.push(id);
    }
    return ids;
  }

  // channels: [{id, vol(0-100), muted}] — aplica ganho por faixa conforme a fonte ativa
  _applyVolumes(channels, silent) {
    for (const [id, t] of this.tracks) {
      let v = 0;
      if (this.source === 'stems' && t.kind === 'stem') {
        const ch = channels.find((c) => c.id === id);
        v = ch ? (ch.muted ? 0 : ch.vol / 100) : 1;
      } else if (this.source !== 'stems' && id === this.source) {
        v = 1;
      }
      if (t.gain) t.gain.gain.value = v;
      else t.el.volume = Math.max(0, Math.min(1, v * (this.ctx ? 1 : this.masterVol)));
      t._target = v;
    }
    if (!silent) this._syncPlayState();
  }

  setChannels(channels) { this._channels = channels; this._applyVolumes(channels); }

  setMaster(vol01) {
    this.masterVol = vol01;
    if (this.masterGain) this.masterGain.gain.value = vol01;
    else this._applyVolumes(this._channels || []);
  }

  setSource(source) {
    const pos = this.position();
    this.source = source;
    this._applyVolumes(this._channels || []);
    this.seek(pos);
    this._syncPlayState();
  }

  play() {
    this._ensureCtx();
    for (const t of this.tracks.values()) this._connect(t);
    if (this.masterGain) this.masterGain.gain.value = this.masterVol;
    this._applyVolumes(this._channels || [], true);
    this.playing = true;
    this._syncPlayState();
    this._startClock();
  }

  pause() {
    this.playing = false;
    this._syncPlayState();
    this._stopClock();
    if (this.onTime) this.onTime(this.position(), this.duration());
  }

  toggle() { this.playing ? this.pause() : this.play(); }

  stop() { this.pause(); this.seek(0); }

  _syncPlayState() {
    const active = new Set(this._activeIds());
    for (const [id, t] of this.tracks) {
      const should = this.playing && active.has(id);
      if (should && t.el.paused) t.el.play().catch(() => {});
      else if (!should && !t.el.paused) t.el.pause();
    }
  }

  seek(sec) {
    for (const t of this.tracks.values()) {
      try { t.el.currentTime = sec; } catch (e) { /* metadados ainda não prontos */ }
    }
    if (this.onTime) this.onTime(sec, this.duration());
  }

  position() {
    const lid = this._leaderId();
    const t = lid ? this.tracks.get(lid) : null;
    return t ? (t.el.currentTime || 0) : 0;
  }

  duration() {
    let d = 0;
    for (const id of this._activeIds()) {
      const t = this.tracks.get(id);
      if (t && isFinite(t.el.duration)) d = Math.max(d, t.el.duration);
    }
    return d;
  }

  _startClock() {
    this._stopClock();
    this._timer = setInterval(() => {
      const lid = this._leaderId();
      if (!lid) return;
      const leader = this.tracks.get(lid).el;
      const pos = leader.currentTime || 0;
      // Correção de drift dos seguidores
      for (const id of this._activeIds()) {
        if (id === lid) continue;
        const el = this.tracks.get(id).el;
        if (Math.abs((el.currentTime || 0) - pos) > 0.08) {
          try { el.currentTime = pos; } catch (e) { /* ok */ }
        }
      }
      if (this.onTime) this.onTime(pos, this.duration());
    }, 250);
  }

  _stopClock() { if (this._timer) { clearInterval(this._timer); this._timer = null; } }

  _disposeTracks() {
    for (const t of this.tracks.values()) {
      try { t.el.pause(); } catch (e) { /* ok */ }
      t.el.src = '';
      if (t.url && t.url.startsWith('blob:')) URL.revokeObjectURL(t.url);
    }
    this.tracks.clear();
  }

  unload() { this._loadToken++; this.pause(); this._disposeTracks(); }
}
