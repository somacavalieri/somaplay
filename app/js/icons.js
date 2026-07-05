// icons.js — SVGs compartilhados (portados do design)
const s = (w, body, extra = '') =>
  `<svg width="${w}" height="${w}" viewBox="0 0 24 24" ${extra}>${body}</svg>`;
const stroke = (w, body, sw = 2) =>
  s(w, body, `fill="none" stroke="currentColor" stroke-width="${sw}"`);
const fill = (w, body) => s(w, body, 'fill="currentColor"');

export const I = {
  back: (w = 22) => stroke(w, '<path d="m15 18-6-6 6-6"/>'),
  chevR: (w = 20) => stroke(w, '<path d="m9 18 6-6-6-6"/>'),
  chevD: (w = 15) => stroke(w, '<path d="m6 9 6 6 6-6"/>'),
  chevU: (w = 15) => stroke(w, '<path d="m6 15 6-6 6 6"/>', 2.4),
  chevDn: (w = 15) => stroke(w, '<path d="m6 9 6 6 6-6"/>', 2.4),
  close: (w = 18) => stroke(w, '<path d="M18 6 6 18M6 6l12 12"/>'),
  search: (w = 18) => s(w, '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>', 'fill="none" stroke="#9A9AA5" stroke-width="2"'),
  gear: (w = 20) => stroke(w, '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'),
  check: (w = 13, sw = 3) => stroke(w, '<path d="M20 6 9 17l-5-5"/>', sw),
  grid: (w = 17) => stroke(w, '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
  music: (w = 17) => stroke(w, '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'),
  listIcon: (w = 17) => stroke(w, '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
  play: (w = 20) => fill(w, '<path d="M8 5v14l11-7z"/>'),
  pause: (w = 22) => fill(w, '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>'),
  heart: (on, w = 20) => on
    ? fill(w, '<path d="M12 21s-7.5-4.6-10-9.2C.6 9 1.8 5.5 5 5.1c2-.3 3.4.9 4 2 .6-1.1 2-2.3 4-2 3.2.4 4.4 3.9 3 6.7C19.5 16.4 12 21 12 21z"/>')
    : stroke(w, '<path d="M12 21s-7.5-4.6-10-9.2C.6 9 1.8 5.5 5 5.1c2-.3 3.4.9 4 2 .6-1.1 2-2.3 4-2 3.2.4 4.4 3.9 3 6.7C19.5 16.4 12 21 12 21z"/>'),
  star: (on, w = 15) => on
    ? fill(w, '<path d="M12 2.6l2.7 5.9 6.4.6-4.8 4.3 1.4 6.3L12 20.4 6.3 19.7l1.4-6.3L2.9 9.1l6.4-.6z"/>')
    : stroke(w, '<path d="M12 2.6l2.7 5.9 6.4.6-4.8 4.3 1.4 6.3L12 20.4 6.3 19.7l1.4-6.3L2.9 9.1l6.4-.6z"/>', 1.8),
  addList: (w = 19) => stroke(w, '<path d="M3 6h13M3 12h9M3 18h9M16 14v6M13 17h6"/>'),
  mic: (w = 17) => stroke(w, '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'),
  mixer: (w = 21) => stroke(w, '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>'),
  cifraLines: (w = 16) => stroke(w, '<path d="M5 4h14M5 9h14M5 14h9M5 19h12"/>'),
  dots: (w = 20) => fill(w, '<circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>'),
  pin: (w = 14) => fill(w, '<path d="M16 3l5 5-4 1-3 4 1 5-3-3-5 5-1-1 5-5-3-3 5-1 4-3z"/>'),
  pinStroke: (w = 17) => stroke(w, '<path d="M16 3l5 5-4 1-3 4 1 5-3-3-5 5-1-1 5-5-3-3 5-1 4-3z"/>'),
  pencil: (w = 17) => stroke(w, '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
  trash: (w = 17) => stroke(w, '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>'),
  minus: (w = 18) => stroke(w, '<path d="M5 12h14"/>'),
  plus: (w = 19, sw = 2.2) => stroke(w, '<path d="M12 5v14M5 12h14"/>', sw),
  volOn: (w = 18) => stroke(w, '<path d="M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7"/>'),
  volOff: (w = 18) => stroke(w, '<path d="M11 5 6 9H2v6h4l5 4zM22 9l-6 6M16 9l6 6"/>'),
  volFull: (w = 22) => s(w, '<path d="M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14"/>', 'fill="none" stroke="#9A9AA5" stroke-width="2"'),
  invert: (w = 18) => stroke(w, '<path d="M12 3v18a9 9 0 0 0 0-18z"/><circle cx="12" cy="12" r="9"/>'),
  swap: (w = 17) => stroke(w, '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>'),
  gridChord: (w = 18) => stroke(w, '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9h16M4 14h16M9 4v16M14 4v16"/>'),
  starSmall: (w = 16) => fill(w, '<path d="M12 2.6l2.7 5.9 6.4.6-4.8 4.3 1.4 6.3L12 20.4 6.3 19.7l1.4-6.3L2.9 9.1l6.4-.6z"/>'),
  img: (w = 19) => stroke(w, '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>'),
  textLines: (w = 19) => stroke(w, '<path d="M4 6h16M4 12h16M4 18h10"/>'),
  upload: (w = 26) => stroke(w, '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>'),
  download: (w = 18) => stroke(w, '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>'),
  uploadSm: (w = 18) => stroke(w, '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 8l5-5 5 5M12 3v12"/>'),
  save: (w = 19) => stroke(w, '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>', 2.2),
  sort: (w = 16) => s(w, '<path d="M3 6h18M6 12h12M10 18h4"/>', 'fill="none" stroke="#9A9AA5" stroke-width="2"'),
  funnel: (w = 17) => s(w, '<path d="M3 5h18l-7 8.5V20l-4 1.5v-8z"/>', 'fill="none" stroke="#9A9AA5" stroke-width="2"'),
  disc: (w = 18, on) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="${on ? 'var(--accent)' : 'var(--muted2)'}" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5" fill="${on ? 'var(--accent)' : 'none'}"/></svg>`,
};

export const eqBars = () => '<div class="eq"><span></span><span></span><span></span></div>';
export function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
export function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
}
