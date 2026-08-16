// initials.js — as iniciais que aparecem no thumb de artista e de estilo.
//
// Função pura, sem estado e sem DOM. "Gilberto Gil" vira GG, "Banda Mel" vira
// BM. Duas letras carregam informação que uma só não carrega: numa grade densa,
// GG e GC deixam de ser o mesmo bloco "G".
//
// Conectivos não contam como palavra — "A Turma do Seu Lobato" vira TS, não AT.
// A regra é de leitura, não de gramática: o artigo é a parte do nome que menos
// identifica o artista.

const CONECTIVOS = new Set([
  'a', 'o', 'as', 'os', 'de', 'da', 'do', 'das', 'dos',
  'e', 'em', 'na', 'no', 'nas', 'nos', 'com',
]);

// Nunca devolve string vazia: um thumb em branco é pior que um '?'. O nome é
// conteúdo do usuário e pode começar com pontuação, número ou emoji.
export function iniciais(nome) {
  const cru = (nome || '').trim();
  if (!cru) return '?';

  const palavras = cru.split(/\s+/).filter((p) => !CONECTIVOS.has(p.toLowerCase()));
  // Nome feito só de conectivos ("Os", "A") ainda precisa render algo.
  if (!palavras.length) return cru[0].toUpperCase();

  return palavras.slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}
