// i18n.js — tradução da interface. Sem dependências, testável em node --test.
import { PT } from './i18n/pt.js';
import { EN } from './i18n/en.js';

const TABLES = { pt: PT, en: EN };
let current = 'pt';

export function setLang(lang) {
  current = TABLES[lang] ? lang : 'pt';
  return current;
}

export function getLang() {
  return current;
}

// Recebe o idioma por parâmetro (não lê navigator) para poder ser testado em Node.
export function detectLang(navLang) {
  return String(navLang || '').toLowerCase().startsWith('pt') ? 'pt' : 'en';
}

export function t(key, params) {
  const table = TABLES[current] || PT;
  let s = table[key];
  if (s === undefined) s = PT[key];       // fallback: português
  if (s === undefined) return key;        // fallback final: a própria chave
  if (params) {
    for (const k of Object.keys(params)) {
      s = s.split(`{${k}}`).join(String(params[k]));
    }
  }
  return s;
}
