#!/usr/bin/env python3
"""Mede, por pixel, os tokens do bloco letra+acordes de uma página de songbook.

Por que existe: numa cifra de texto o acorde fica sobre a sílaba pela COLUNA DE
CARACTERE. Ler a posição no olho erra a coluna e troca a sílaba; medir o x de
cada token na página e converter para coluna (`layout.py`) reproduz o desenho
impresso. Este script faz a parte da medição — o texto de cada token continua
sendo lido na imagem, porque OCR de acorde não é confiável (`G7(13)` vira
`G⁻(13)`, `I` vira `l`).

Uso:
  python3 scripts/new_songbook/measure_cifra.py <pdf> <pág. do PDF> [-y0 F] [-y1 F]
      Imprime as bandas de linha achadas e, para cada uma, os tokens medidos
      como `(x, 'texto do OCR')` — prontos para colar num módulo de livro e
      corrigir o texto na mão. Também grava um recorte PNG de cada banda em
      -o/DIR para conferir a leitura.

  -y0/-y1 recortam a fração vertical da página onde está o bloco de cifra
  (padrão: a página toda). Numa 1ª página de música o bloco começa depois da
  grade de diagramas — algo como -y0 0.55.

Em scan BITONAL (1 bit) o chuvisco põe tinta em quase toda linha e as bandas saem
grudadas numa só; nesse caso passe `--densidade` (0.02 no Cazuza vol. 1, o único
livro bitonal medido até agora). Ver o INDICE.md daquele livro.

`--gap` é a folga horizontal (em colunas de caractere) que separa dois tokens:
abaixo dela, duas palavras viram um token só, que é o que se quer para a letra
("Arra——sa o meu" é um grupo, não três). Padrão 2.2 colunas.
"""
import argparse
import os
import sys

try:
    import fitz
    import numpy as np
    from PIL import Image
except ImportError as e:  # pragma: no cover
    sys.exit(f'falta dependência: {e}. pip install pymupdf pillow numpy')


def bands(mask, min_gap, densidade=0.0):
    """Faixas contíguas de linhas com tinta -> [(y0, y1), ...].

    `densidade` é a fração mínima de colunas com tinta para a linha contar como
    "com tinta". O padrão 0.0 é o comportamento antigo (qualquer pixel serve), e
    é o certo num scan limpo. Num scan BITONAL o chuvisco põe tinta em quase toda
    linha e costura uma banda na outra: no Cazuza vol. 1 (1 bit, ~146 dpi) a p.43
    saía como uma banda só de 1193 px; com 0.02 saem as 14 linhas reais (7
    sistemas × acorde+letra), com altura uniforme de 27 a 48 px.

    O valor importa: 0.005 e 0.01 ainda grudam linhas nessa mesma página, e o
    número de bandas por acaso bater com o esperado não quer dizer que sejam as
    certas. Conferir sempre os PNG de banda antes de confiar nos tokens.
    """
    on = (mask.sum(axis=1) / mask.shape[1]) > densidade if densidade else mask.any(axis=1)
    out, ini, gap = [], None, 0
    for y, v in enumerate(on):
        if v:
            if ini is None:
                ini = y
            gap = 0
        elif ini is not None:
            gap += 1
            if gap >= min_gap:
                out.append((ini, y - gap + 1))
                ini = None
    if ini is not None:
        out.append((ini, len(on)))
    return out


def tokens(mask, y0, y1, gap_px):
    """Tokens de uma banda -> [(x_ini, x_fim), ...], separados por gap_px."""
    col = mask[y0:y1].any(axis=0)
    out, ini, gap = [], None, 0
    for x, v in enumerate(col):
        if v:
            if ini is None:
                ini = x
            gap = 0
        elif ini is not None:
            gap += 1
            if gap >= gap_px:
                out.append((ini, x - gap + 1))
                ini = None
    if ini is not None:
        out.append((ini, len(col)))
    return out


def ocr_words(page, dpi, y0px, y1px, x0px, x1px):
    """Palavras do OCR da página, em pixels do render, dentro da faixa."""
    z = dpi / 72.0
    ws = []
    for x0, yy0, x1, yy1, w, *_ in page.get_text('words'):
        cx, cy = (x0 + x1) / 2 * z, (yy0 + yy1) / 2 * z
        if y0px <= cy < y1px and x0px <= cx < x1px:
            ws.append((x0 * z, cy, w))
    return sorted(ws)


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('pdf')
    ap.add_argument('pagina', type=int, help='página do PDF, 1-based')
    ap.add_argument('-y0', type=float, default=0.0, help='início do bloco (fração da altura)')
    ap.add_argument('-y1', type=float, default=1.0, help='fim do bloco (fração da altura)')
    ap.add_argument('--dpi', type=int, default=300)
    ap.add_argument('--scale', type=float, default=19.0, help='px por coluna (layout.SCALE)')
    ap.add_argument('--gap', type=float, default=2.2, help='folga entre tokens, em colunas')
    ap.add_argument('--min-gap-linhas', type=int, default=6, help='px de gap que separa bandas')
    # Scan bitonal: o chuvisco põe tinta em quase toda linha e as bandas saem
    # coladas numa só. Ver docstring de bands(). 0.02 resolveu o Cazuza vol. 1.
    ap.add_argument('--densidade', type=float, default=0.0,
                    help='fração mínima de colunas com tinta para a linha contar '
                         '(0 = qualquer pixel; use ~0.02 em scan bitonal)')
    # A espiral do fichário na margem é tinta contínua: se sobrar, ela costura uma
    # banda na outra e a linha de acorde sai grudada na de letra. Aumentar até sumir.
    ap.add_argument('--marg', type=float, default=0.04, help='fração das bordas a ignorar')
    ap.add_argument('--marg-esq', type=float, default=None, help='margem esquerda, se diferente')
    ap.add_argument('-o', '--out', default='.')
    a = ap.parse_args()

    doc = fitz.open(a.pdf)
    page = doc[a.pagina - 1]
    pix = page.get_pixmap(dpi=a.dpi, colorspace=fitz.csGRAY)
    img = Image.frombytes('L', (pix.width, pix.height), pix.samples)
    arr = np.asarray(img)
    H, W = arr.shape

    y0, y1 = int(H * a.y0), int(H * a.y1)
    sub = arr[y0:y1]
    mask = sub < 128
    # ignora colunas de margem (espiral, sujeira de borda)
    esq = int(W * (a.marg if a.marg_esq is None else a.marg_esq))
    mask[:, :esq] = False
    mask[:, W - int(W * a.marg):] = False

    os.makedirs(a.out, exist_ok=True)
    gap_px = max(int(round(a.gap * a.scale)), 1)
    bs = bands(mask, a.min_gap_linhas, a.densidade)
    print(f'{os.path.basename(a.pdf)} pdf {a.pagina} @ {a.dpi} dpi — '
          f'{len(bs)} banda(s) entre y={y0} e {y1}; gap de token = {gap_px}px '
          f'({a.gap} colunas de {a.scale}px)\n')

    x0_bloco = min((tokens(mask, b0, b1, gap_px) or [(W, W)])[0][0] for b0, b1 in bs)
    print(f'x0 do bloco (menor x de token na página) = {x0_bloco}\n')

    for i, (b0, b1) in enumerate(bs):
        ts = tokens(mask, b0, b1, gap_px)
        ws = ocr_words(page, a.dpi, y0 + b0, y0 + b1, 0, W)
        linha = []
        for tx0, tx1 in ts:
            dentro = [w for wx, _, w in ws if tx0 - 4 <= wx < tx1 + 4]
            linha.append((tx0, ' '.join(dentro) if dentro else '?'))
        crop = img.crop((0, y0 + b0 - 4, W, y0 + b1 + 4))
        p = os.path.join(a.out, f'banda-p{a.pagina}-{i+1:02d}.png')
        crop.save(p)
        print(f'# banda {i+1:2d}  y={b0}-{b1}  altura={b1-b0:3d}  {len(ts)} tokens  -> {p}')
        print('  ' + repr(linha))
    print(f'\nSCALE sugerida: mede a largura de uma frase conhecida e divide pelo nº de '
          f'caracteres. A {a.dpi} dpi o padrão dos Lumiar é {a.scale}.')


if __name__ == '__main__':
    main()
