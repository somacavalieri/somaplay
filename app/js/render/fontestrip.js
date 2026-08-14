// render/fontestrip.js — a faixa de pílulas do filtro de fonte.
//
// HTML de um lado, comportamento imperativo do outro, no mesmo molde do
// listdrag.js: fonteStripHTML() é chamada pelo render da Home, e
// wireFonteStrip() pelo afterRender() do main.js.
import { S, SEM_FONTE, contagensPorFonte } from '../state.js';
import { I, esc } from '../icons.js';
import { t } from '../i18n.js';

// Um Map, e não um objeto literal: a chave vem de um nome de fonte que o usuário
// digitou, e num objeto 'constructor' ou 'toString' devolveriam algo do
// Object.prototype em vez de undefined.
const CORES = new Map([
  ['vj', '#34D399'],
  ['rv', '#F4B860'],
  ['cifraclub', '#E8A23D'],
  ['rn', '#60A5FA'],
  ['songbook', '#2DD4BF'],
  [SEM_FONTE, '#9A9AA5'],
]);

// Para as fontes que o usuário cadastrar depois. Mesma família visual das fixas.
const PALETA = ['#A78BFA', '#F472B6', '#60A5FA', '#34D399', '#F4B860', '#2DD4BF', '#FB923C', '#C084FC'];

// A cor sai do nome, por hash determinístico — nunca da posição na lista, que
// mudaria quando outra fonte ganhasse músicas e seria diferente em cada
// aparelho. Duas fontes podem colidir na mesma cor: o nome e a contagem seguem
// sendo os identificadores, e a cor nunca é o único indicador.
export function corDaFonte(nome) {
  const k = String(nome || '').trim().toLowerCase();
  const fixa = CORES.get(k);
  if (fixa) return fixa;
  let h = 0;
  for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) >>> 0;
  return PALETA[h % PALETA.length];
}

// A faixa inteira. `desligada` é a aba Listas, onde a lente não vale (§7 do PRD):
// a faixa aparece apagada e inerte, exatamente como a .lens já faz hoje.
export function fonteStripHTML(desligada = false) {
  const { itens, total } = contagensPorFonte(S.songs, { query: S.query, modeFilter: S.modeFilter });
  const marcadas = S.fonteFilter;
  const todas = !marcadas.length;
  const estaMarcada = (nome) => marcadas.some((f) => f.trim().toLowerCase() === nome.trim().toLowerCase());

  const pilulas = itens.map(({ nome, n }) => {
    const ativa = estaMarcada(nome);
    // O sentinela é traduzido só no que se vê; o data-id leva a grafia salva.
    const rotulo = nome === SEM_FONTE ? t('home.fonte.none') : nome;
    const p = { fonte: esc(rotulo), n };
    const dica = ativa ? t('home.fonte.tipRemove', p)
      : todas ? t('home.fonte.tipOnly', p)
      : t('home.fonte.tipInclude', p);
    return `<button class="fpill${n ? '' : ' zero'}" data-a="toggleFonte" data-id="${esc(nome)}" aria-pressed="${ativa}" style="--fc:${corDaFonte(nome)}" title="${dica}"><span class="dot"></span><span class="nm">${esc(rotulo)}</span><em>${n}</em></button>`;
  }).join('');

  return `<div class="fonte-strip ${desligada ? 'off' : ''}" id="fonte-strip" role="group" aria-label="${t('home.fonte.hint')}">
    <span class="tagico">${I.tag(15)}</span>
    <div class="fonte-scroll" data-hscroll>
      <button class="fpill todas" data-a="clearFonte" aria-pressed="${todas}" title="${t('home.fonte.tipAll', { n: total })}"><span class="nm">${t('home.fonte.all')}</span><em>${total}</em></button>
      <span class="sep"></span>
      ${pilulas}
    </div>
    <button class="fscroll-next" data-a="fonteScrollNext" title="${t('home.fonte.next')}">${I.chevR(18)}</button>
  </div>`;
}

// O ResizeObserver guardado em módulo: update() troca o nó da faixa a cada
// render, e um observer novo por render, apontando para nós já descartados,
// vazaria memória num app que fica aberto o ensaio inteiro.
let ro = null;

// Há conteúdo à direita fora da vista? É isso que acende o fade e a seta. Some
// ao chegar no fim: nada mais à direita, nada a anunciar.
function medirOverflow(strip) {
  const sc = strip.querySelector('.fonte-scroll');
  if (!sc) return;
  const max = sc.scrollWidth - sc.clientWidth;
  strip.classList.toggle('ov', max > 1 && sc.scrollLeft < max - 1);
}

export function wireFonteStrip() {
  const strip = document.getElementById('fonte-strip');
  ro?.disconnect();
  ro = null;
  if (!strip) return;
  const sc = strip.querySelector('.fonte-scroll');
  if (!sc) return;

  // Roda do mouse rola a faixa na horizontal, sem exigir shift. O
  // preventDefault() só sai enquanto há para onde rolar NAQUELE sentido: nas
  // pontas o evento passa adiante e a página volta a rolar, que é o que o dedo
  // e a roda esperam.
  sc.addEventListener('wheel', (e) => {
    const d = e.deltaY || e.deltaX;
    if (!d) return;
    const max = sc.scrollWidth - sc.clientWidth;
    if (max <= 0) return;
    if (d < 0 && sc.scrollLeft <= 0) return;
    if (d > 0 && sc.scrollLeft >= max - 1) return;
    e.preventDefault();
    sc.scrollLeft += d;
  }, { passive: false });

  sc.addEventListener('scroll', () => medirOverflow(strip));
  // ResizeObserver, e não o resize da janela: a .tabrow reflui sozinha quando o
  // .tabsub some ou a faixa desce de linha, sem a janela mudar de tamanho.
  ro = new ResizeObserver(() => medirOverflow(strip));
  ro.observe(sc);
  medirOverflow(strip);
}

// Só os números e a classe .zero — nada de estrutura. É o que permite atualizar
// a faixa a cada tecla digitada sem zerar o scrollLeft nem religar os listeners,
// e só é possível porque o conjunto de pílulas vem da biblioteca, não da busca.
export function refreshFonteCounts() {
  const strip = document.getElementById('fonte-strip');
  if (!strip) return;
  const { itens, total } = contagensPorFonte(S.songs, { query: S.query, modeFilter: S.modeFilter });
  const porNome = new Map(itens.map((i) => [i.nome, i.n]));
  strip.querySelectorAll('.fpill').forEach((el) => {
    const todas = el.classList.contains('todas');
    const n = todas ? total : porNome.get(el.dataset.id);
    if (n == null) return;
    el.querySelector('em').textContent = n;
    if (!todas) el.classList.toggle('zero', n === 0);
  });
  medirOverflow(strip);
}
