// chordbook.js — dicionário de acordes: catálogo embutido (semente só-leitura) +
// delta do usuário no IndexedDB, fundidos em leitura.
// forma fundida: { id, frets, barre?, label?, origin:'builtin'|'user', isDefault }
// registro do usuário: { name, vars:[{id,frets,barre?,label}], hidden:[id], defaultId }
import { CATALOG } from './chords-catalog.js';
import { DB, uid } from './db.js';
import { toIntl, toBr, nomesDeBusca } from './chord-notation.js';
import { t } from './i18n.js';

// Formas embutidas de um nome, com id sintético pela posição no catálogo.
// Copia frets e barre para isolar da semente só-leitura do catálogo.
export function builtinShapes(name) {
  return (CATALOG[name] || []).map((s, i) => ({
    ...s,
    frets: s.frets.slice(),
    ...(s.barre ? { barre: { ...s.barre } } : {}),
    id: `b:${name}:${i}`,
    origin: 'builtin',
  }));
}

// Identidade de uma forma (casas + pestana) — usada para não duplicar variação.
export function shapeKey(s) {
  return s.frets.join(',') + '|' + (s.barre ? `${s.barre.fret}:${s.barre.from}-${s.barre.to}` : '');
}

// Funde embutidas + delta do usuário. Override (id 'b:...') entra no lugar da
// embutida; lápide esconde; variações novas vão para o fim.
export function mergeShapes(builtins, rec) {
  const hidden = new Set((rec && rec.hidden) || []);
  const vars = (rec && rec.vars) || [];
  const byId = new Map(vars.map((v) => [v.id, v]));
  const out = [];
  for (const b of builtins) {
    if (hidden.has(b.id)) continue;
    const ov = byId.get(b.id);
    if (!ov) { out.push(b); continue; }
    const m = { ...b, ...ov, id: b.id, origin: 'user' };
    if (!ov.barre) delete m.barre;   // o usuário tirou a pestana da embutida
    out.push(m);
  }
  for (const v of vars) if (!v.id.startsWith('b:')) out.push({ ...v, origin: 'user' });
  const wanted = rec && rec.defaultId;
  const defId = (wanted && out.some((s) => s.id === wanted) ? wanted : null)
    || (out.find((s) => s.default) || {}).id
    || (out[0] ? out[0].id : null);
  return out.map((s) => ({
    ...s,
    frets: s.frets.slice(),
    ...(s.barre ? { barre: { ...s.barre } } : {}),
    isDefault: s.id === defId,
  }));
}

// Reconciliação de dois registros no import com merge — o local vence o conflito.
export function mergeRecords(local, incoming) {
  const inc = incoming || {};
  const base = local || { name: inc.name, vars: [], hidden: [], defaultId: null };
  const ids = new Set((base.vars || []).map((v) => v.id));
  const vars = [...(base.vars || []), ...((inc.vars || []).filter((v) => !ids.has(v.id)))];
  const varIds = new Set(vars.map((v) => v.id));
  return {
    name: base.name,
    vars,
    // Uma lápide importada não pode matar um override local do mesmo id — senão
    // "o local vence" vira mentira pra esse caso (mergeShapes checa hidden antes
    // de vars, e id 'b:...' não entra no laço de variações novas).
    hidden: [...new Set([...(base.hidden || []), ...(inc.hidden || [])])].filter((id) => !varIds.has(id)),
    defaultId: base.defaultId || inc.defaultId || null,
  };
}

// Músicas que apontam para uma variação (via digitacoes[nome].varId).
export function songsUsingVar(songs, name, varId) {
  if (!varId) return [];
  return (songs || []).filter((s) => {
    const d = s && s.cifra && s.cifra.digitacoes && s.cifra.digitacoes[name];
    return !!d && d.varId === varId;
  });
}

// ---------- estado (espelho do store 'chordbook') ----------
const BOOK = new Map();   // nome -> registro do usuário
const CACHE = new Map();  // nome -> lista fundida (invalidada a cada escrita)

function rec(name) {
  let r = BOOK.get(name);
  if (!r) { r = { name, vars: [], hidden: [], defaultId: null }; BOOK.set(name, r); }
  return r;
}

// Persistência é "melhor esforço": em Node (testes) não há IndexedDB e o
// dicionário funciona só em memória.
function persist(r) {
  CACHE.delete(r.name);
  DB.putChordName(r).catch(() => {});
}

export async function loadChordbook() {
  BOOK.clear(); CACHE.clear();
  let recs = [];
  try { recs = await DB.loadChordbook(); } catch (e) { recs = []; }
  for (const r of recs) BOOK.set(r.name, { name: r.name, vars: r.vars || [], hidden: r.hidden || [], defaultId: r.defaultId || null });
}

export function chordbookRecords() { return [...BOOK.values()]; }

export function shapesOf(name) {
  if (CACHE.has(name)) return CACHE.get(name);
  // A cifra escreve o mesmo acorde de vários jeitos — 'F°'/'Fº'/'Fo'/'Fdim',
  // 'Bb°'/'A#°', 'Em7/5b'/'Em7(5-)'. O catálogo guarda uma grafia só; quando o
  // literal não tem forma, tenta as outras (nomesDeBusca, em chord-notation.js).
  // Vale para todo o catálogo, não só diminuto: 'Bbm7' acha 'A#m7'.
  let builtins = builtinShapes(name);
  if (!builtins.length) {
    // o id sai como `b:<grafia que achou>:<i>`, e é isso que se quer: a mesma
    // forma tem o mesmo id em qualquer grafia, então lápide e digitação gravadas
    // param de depender de como a cifra escreveu o acorde
    for (const alt of nomesDeBusca(name)) {
      if (alt === name) continue;
      builtins = builtinShapes(alt);
      if (builtins.length) break;
    }
  }
  // o delta do usuário continua sendo lido pelo nome LITERAL: quem editou 'Fº'
  // gravou um registro 'Fº'. O mergeShapes casa por id, então override e lápide
  // funcionam mesmo com o registro sob a grafia da cifra.
  const list = mergeShapes(builtins, BOOK.get(name));
  CACHE.set(name, list);
  return list;
}

export function defaultShape(name) { return shapesOf(name).find((s) => s.isDefault) || null; }
export function shapeById(name, id) { return shapesOf(name).find((s) => s.id === id) || null; }

// Formas para seletor/popover + qual está selecionada. cur = digitação da
// música (cifra.digitacoes[nome]) ou null. Sem digitação, a selecionada é a
// padrão do dicionário (§4.3) — senão nenhuma miniatura fica marcada e o
// "Editar" some do rodapé do picker. Digitação que não bate com nenhuma forma
// vira o pseudo-item '__song' ("desta música") no fim da lista.
export function pickerShapes(name, cur) {
  const shapes = shapesOf(name).slice();
  let selId = null;
  if (cur) {
    const k = shapeKey(cur);
    const achou = (cur.varId && shapes.find((s) => s.id === cur.varId))
      || shapes.find((s) => shapeKey(s) === k);
    if (achou) selId = achou.id;
    else {
      selId = '__song';
      shapes.push({ id: '__song', frets: cur.frets, ...(cur.barre ? { barre: cur.barre } : {}), label: t('chordbook.songShape') });
    }
  } else {
    const def = defaultShape(name);
    if (def) selId = def.id;
  }
  return { shapes, selId };
}

export function labelsOf(name) { return shapesOf(name).map((s) => s.label || '').filter(Boolean); }
export function hasHidden(name) { const r = BOOK.get(name); return !!(r && r.hidden.length); }

export function findShape(name, frets, barre) {
  const k = shapeKey({ frets, barre: barre || null });
  return shapesOf(name).find((s) => shapeKey(s) === k) || null;
}

export function allNames() {
  return [...new Set([...Object.keys(CATALOG), ...BOOK.keys()])].sort((a, b) => a.localeCompare(b, 'pt'));
}

// Casa o termo buscado com o nome do acorde aceitando as duas convenções —
// quem digita 'Cmaj7' acha 'C7M' e vice-versa, independente da notação ativa.
// Substring (não prefixo), igual à busca que já existia antes desta função.
export function matchesName(chordName, term) {
  const q = String(term).trim().toLowerCase();
  if (!q) return true;
  const forms = [chordName, toIntl(chordName), toBr(chordName)];
  return forms.some((f) => f.toLowerCase().includes(q));
}

// Grava/atualiza uma variação; sem id, cria uma nova. Devolve o id.
export function upsertVar(name, shape) {
  const r = rec(name);
  const v = {
    id: shape.id || ('u:' + uid()),
    frets: shape.frets.slice(),
    ...(shape.barre ? { barre: { ...shape.barre } } : {}),
    label: shape.label || '',
  };
  const i = r.vars.findIndex((x) => x.id === v.id);
  if (i >= 0) r.vars[i] = v; else r.vars.push(v);
  r.hidden = r.hidden.filter((x) => x !== v.id);
  persist(r);
  return v.id;
}

export function removeVar(name, id) {
  const r = rec(name);
  r.vars = r.vars.filter((v) => v.id !== id);
  if (id.startsWith('b:') && !r.hidden.includes(id)) r.hidden.push(id);
  if (r.defaultId === id) r.defaultId = null;
  persist(r);
}

export function setDefault(name, id) { const r = rec(name); r.defaultId = id; persist(r); }
export function restoreBuiltins(name) { const r = rec(name); r.hidden = []; persist(r); }

// ---------- backup (Task 8) ----------
export async function replaceChordbook(recs) {
  try { await DB.clearChordbook(); } catch (e) { /* sem IndexedDB */ }
  BOOK.clear(); CACHE.clear();
  for (const r of recs || []) {
    if (!r || !r.name) continue;
    const n = { name: r.name, vars: r.vars || [], hidden: r.hidden || [], defaultId: r.defaultId || null };
    BOOK.set(n.name, n);
    await DB.putChordName(n).catch(() => {});
  }
}

export async function mergeChordbookRecords(recs) {
  for (const inc of recs || []) {
    if (!inc || !inc.name) continue;
    const m = mergeRecords(BOOK.get(inc.name), inc);
    BOOK.set(m.name, m);
    CACHE.delete(m.name);
    await DB.putChordName(m).catch(() => {});
  }
}
