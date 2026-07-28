// chordbook.js — dicionário de acordes: catálogo embutido (semente só-leitura) +
// delta do usuário no IndexedDB, fundidos em leitura.
// forma fundida: { id, frets, barre?, label?, origin:'builtin'|'user', isDefault }
// registro do usuário: { name, vars:[{id,frets,barre?,label}], hidden:[id], defaultId }
import { CATALOG } from './chords-catalog.js';

// Formas embutidas de um nome, com id sintético pela posição no catálogo.
export function builtinShapes(name) {
  return (CATALOG[name] || []).map((s, i) => ({ ...s, id: `b:${name}:${i}`, origin: 'builtin' }));
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
  return out.map((s) => ({ ...s, isDefault: s.id === defId }));
}

// Reconciliação de dois registros no import com merge — o local vence o conflito.
export function mergeRecords(local, incoming) {
  const inc = incoming || {};
  const base = local || { name: inc.name, vars: [], hidden: [], defaultId: null };
  const ids = new Set((base.vars || []).map((v) => v.id));
  return {
    name: base.name,
    vars: [...(base.vars || []), ...((inc.vars || []).filter((v) => !ids.has(v.id)))],
    hidden: [...new Set([...(base.hidden || []), ...(inc.hidden || [])])],
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
