#!/usr/bin/env python3
"""Parte uma spread de songbook em página única, deskewada e recortada.

Por que existe: `measure_cifra.py` e `measure_diagrams.py` recebem `<pdf> <pág>` e
renderizam a página inteira sem endireitar. No Caetano vol. 1 isso não serve por
dois motivos medidos e registrados no INDICE.md daquele livro:

  - cada página do PDF é um SPREAD, duas páginas do livro lado a lado;
  - a inclinação varia de −1,50° a +2,40° POR PÁGINA. Num bloco de 2000 px, 2,4°
    desloca 84 px — mais que a altura de uma linha, o que basta para costurar a
    linha de acorde na de letra.

Então este script roda antes: extrai a imagem embutida (não re-renderiza a
página, que aqui está a 96 dpi nominais e seria reamostrada), parte no vão
central, endireita a metade escolhida, corta a faixa preta da tampa do scanner e
a folha branca em volta, e grava um PDF de UMA página dimensionado para que
`--dpi 300` das ferramentas dê 1 pixel por pixel.

Uso:
  python3 scripts/new_songbook/spread.py <pdf> <pág. do PDF> <esq|dir> -o saida.pdf
"""
import argparse
import io

import fitz
import numpy as np
from PIL import Image


def imagem_da_pagina(doc, pagina):
    """A imagem embutida da spread, em cinza. Erro se a página tiver 0 ou 2+."""
    imgs = doc[pagina - 1].get_images(full=True)
    if len(imgs) != 1:
        raise SystemExit(f'p.{pagina}: esperava 1 imagem embutida, achei {len(imgs)}')
    bruto = doc.extract_image(imgs[0][0])
    return Image.open(io.BytesIO(bruto['image'])).convert('L')


def vao_central(ink):
    """Coluna do vão entre as duas páginas: a de menos tinta perto do meio."""
    h, w = ink.shape
    lo, hi = int(w * 0.45), int(w * 0.55)
    perfil = ink[:, lo:hi].mean(axis=0)
    return lo + int(np.argmin(perfil))


def angulo(ink):
    """Inclinação que maximiza a variância da derivada da projeção horizontal.

    Duas passadas: 0,3° para achar a região, 0,05° para refinar. Uma passada
    grossa só erra o suficiente para deixar linha de acorde encostando na de
    letra nas páginas mais tortas deste livro.
    """
    h, w = ink.shape
    sub = ink[:, ::4]
    xs = np.arange(0, w, 4)

    def melhor(centro, passo, raio):
        alvo, best = centro, -1.0
        for ang in np.arange(centro - raio, centro + raio + 1e-9, passo):
            offs = np.round(np.tan(np.deg2rad(ang)) * xs).astype(int)
            pad = int(np.abs(offs).max()) + 1
            prof = np.zeros(h + 2 * pad)
            for j, off in enumerate(offs):
                prof[pad + off: pad + off + h] += sub[:, j]
            v = float(np.var(np.diff(prof)))
            if v > best:
                alvo, best = float(ang), v
        return alvo

    grosso = melhor(0.0, 0.3, 3.0)
    return melhor(grosso, 0.05, 0.3)


def recorta(a):
    """Tira a faixa preta da tampa do scanner e a folha branca em volta."""
    ink = a < 128
    h, w = ink.shape
    linha, coluna = ink.mean(axis=1), ink.mean(axis=0)

    # Faixa preta da tampa: tinta contínua em quase toda a largura, nas bordas.
    preta_l = linha > 0.80
    y0 = 0
    for y in range(int(h * 0.10)):
        if preta_l[y]:
            y0 = y + 1
    y1 = h
    for y in range(h - 1, int(h * 0.90), -1):
        if preta_l[y]:
            y1 = y

    preta_c = coluna > 0.80
    x0 = 0
    for x in range(int(w * 0.10)):
        if preta_c[x]:
            x0 = x + 1
    x1 = w
    for x in range(w - 1, int(w * 0.90), -1):
        if preta_c[x]:
            x1 = x
    a = a[y0:y1, x0:x1]

    # A espiral do fichário fica numa ilha de colunas separada do corpo da página
    # por vários centímetros de branco. Ela precisa sair AQUI e não como margem
    # das ferramentas: `measure_diagrams.py` não tem opção de margem, e as marcas
    # da espiral entram na contagem como caixa de diagrama (nesta página davam 12
    # caixas para 9 acordes, e os nomes saíam deslocados por duas posições).
    coluna = (a < 128).mean(axis=0)
    ilhas, run, ini = [], 0, 0
    for x, v in enumerate(coluna > 0.002):
        if v:
            if run == 0:
                ini = x
            run += 1
        else:
            if run:
                if ilhas and ini - ilhas[-1][1] < 60:
                    ilhas[-1] = (ilhas[-1][0], ini + run)
                else:
                    ilhas.append((ini, ini + run))
            run = 0
    if run:
        ilhas.append((ini, len(coluna)))
    if ilhas:
        corpo = max(ilhas, key=lambda g: g[1] - g[0])
        if corpo[1] - corpo[0] > len(coluna) * 0.5:
            a = a[:, corpo[0]:corpo[1]]
    return a


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('pdf')
    ap.add_argument('pagina', type=int, help='página do PDF (1-based)')
    ap.add_argument('metade', choices=['esq', 'dir', 'inteira'])
    ap.add_argument('-o', '--out', required=True)
    ap.add_argument('--dpi', type=int, default=300,
                    help='dpi que as ferramentas vão usar (padrão 300)')
    a = ap.parse_args()

    doc = fitz.open(a.pdf)
    im = imagem_da_pagina(doc, a.pagina)
    arr = np.asarray(im)
    ink = arr < 128

    if a.metade == 'inteira':
        meia = arr
    else:
        corte = vao_central(ink)
        meia = arr[:, :corte] if a.metade == 'esq' else arr[:, corte:]
        print(f'vão central em x={corte} de {arr.shape[1]}')

    ang = angulo((meia < 128).astype(np.float32))
    if abs(ang) >= 0.05:
        meia = np.asarray(Image.fromarray(meia).rotate(-ang, resample=Image.BICUBIC,
                                                       fillcolor=255))
    limpa = recorta(meia)
    print(f'inclinação {ang:+.2f}°  |  {meia.shape[1]}x{meia.shape[0]} -> '
          f'{limpa.shape[1]}x{limpa.shape[0]} depois do recorte')

    saida = fitz.open()
    lp, ap_ = limpa.shape[1] * 72 / a.dpi, limpa.shape[0] * 72 / a.dpi
    pg = saida.new_page(width=lp, height=ap_)
    buf = io.BytesIO()
    Image.fromarray(limpa).save(buf, format='PNG')
    pg.insert_image(fitz.Rect(0, 0, lp, ap_), stream=buf.getvalue())
    saida.save(a.out)
    print(f'{a.out}: 1 página de {lp:.0f}x{ap_:.0f} pt '
          f'(1 px por pixel a {a.dpi} dpi)')


if __name__ == '__main__':
    main()
