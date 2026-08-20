// anotacoes.js — o filtro das anotações da música.
//
// A anotação é o primeiro conteúdo do app que entra num innerHTML SEM passar por
// esc() — é o ponto dela: o usuário escreve texto formatado. Só que ela também
// chega dentro de um .somaplay recebido por WhatsApp, de uma origem que o app não
// controla. Por isso tudo passa por aqui: ao colar, ao importar e ao renderizar.
//
// O parse é do navegador (DOMParser) e o filtro é puro, sobre uma árvore de
// objetos simples. Essa separação é o que deixa a regra — quem sobrevive e quem
// não — testável em `node --test`, onde não há DOM. Regex sobre HTML falharia
// exatamente nos casos que interessam.
// Design: docs/superpowers/specs/2026-08-18-anotacoes-da-musica-design.md

export const TAGS = ['p', 'br', 'strong', 'em', 'u', 's', 'h3', 'ul', 'ol', 'li', 'blockquote', 'mark', 'pre', 'a'];
export const ATRIBS = { a: ['href'] };

// O que o Word e o Google Docs mandam no lugar do que a lista aceita. Sem este
// mapa, um documento inteiro em <b>/<h2>/<div> chegaria como texto corrido.
export const RENOMEIA = {
  b: 'strong', i: 'em', strike: 's', del: 's',
  h1: 'h3', h2: 'h3', h4: 'h3', h5: 'h3', h6: 'h3',
  div: 'p', section: 'p', article: 'p',
};

// Some com os filhos junto. Todo o resto que não está na lista é DESEMBRULHADO —
// um <span style> do Word perde a casca e entrega o texto.
const APAGA_TUDO = ['script', 'style', 'head', 'title', 'noscript', 'iframe', 'object', 'embed', 'template'];
const ESQUEMAS = ['http:', 'https:', 'mailto:'];
const VAZIAS = ['br'];

const escTexto = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const escAtrib = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Só absoluto e só nestes três esquemas. Um href relativo devolve null de
// propósito: dentro de um PWA ele apontaria para a própria casca do app.
// Os caracteres de controle saem ANTES do teste — senão um `java\u0000script:`
// passaria pelo regex e viraria um link executável.
export function hrefSeguro(href) {
  const v = String(href ?? '').replace(/[\u0000-\u001F\u007F]/g, '').trim();
  const m = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(v);
  if (!m) return null;
  return ESQUEMAS.includes(m[1].toLowerCase() + ':') ? v : null;
}

export function filtra(nos) {
  const out = [];
  for (const n of nos || []) {
    if (n && n.texto !== undefined) { if (n.texto) out.push({ texto: n.texto }); continue; }
    if (!n || !n.tag) continue;
    const original = String(n.tag).toLowerCase();
    if (APAGA_TUDO.includes(original)) continue;
    const tag = RENOMEIA[original] || original;
    const filhos = filtra(n.filhos);
    if (!TAGS.includes(tag)) { out.push(...filhos); continue; }
    if (!filhos.length && !VAZIAS.includes(tag)) continue;

    const atribs = {};
    for (const a of (ATRIBS[tag] || [])) {
      const bruto = n.atribs ? n.atribs[a] : undefined;
      if (bruto === undefined) continue;
      const v = a === 'href' ? hrefSeguro(bruto) : String(bruto);
      if (v !== null) atribs[a] = v;
    }
    // Link sem href válido vira texto, em vez de virar <a> morto.
    if (tag === 'a' && atribs.href === undefined) { out.push(...filhos); continue; }
    out.push({ tag, atribs, filhos });
  }
  return out;
}

export function paraHTML(nos) {
  return (nos || []).map((n) => {
    if (n.texto !== undefined) return escTexto(n.texto);
    const at = Object.keys(n.atribs || {}).map((k) => ` ${k}="${escAtrib(n.atribs[k])}"`).join('');
    if (VAZIAS.includes(n.tag)) return `<${n.tag}${at}>`;
    return `<${n.tag}${at}>${paraHTML(n.filhos)}</${n.tag}>`;
  }).join('');
}

// Colar sem formatação, e o caminho de escape para qualquer texto solto.
export function deTexto(txt) {
  const linhas = String(txt ?? '').split(/\r?\n/).filter((l) => l.trim() !== '');
  return paraHTML(linhas.map((l) => ({ tag: 'p', atribs: {}, filhos: [{ texto: l }] })));
}

// --- daqui para baixo, só navegador ---

export function paraArvore(html) {
  const doc = new DOMParser().parseFromString(String(html ?? ''), 'text/html');
  const conv = (el) => Array.from(el.childNodes).map((n) => {
    if (n.nodeType === 3) return { texto: n.nodeValue };
    if (n.nodeType !== 1) return null;
    const atribs = {};
    for (const a of n.attributes) atribs[a.name.toLowerCase()] = a.value;
    return { tag: n.tagName.toLowerCase(), atribs, filhos: conv(n) };
  }).filter(Boolean);
  return conv(doc.body);
}

export function limpaHTML(html) {
  return paraHTML(filtra(paraArvore(html)));
}
