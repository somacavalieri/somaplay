#!/usr/bin/env python3
"""Esqueleto de SISTEMAS para uma página de cifra + imagem anotada para transcrever.

Fecha o buraco entre `measure_cifra.py` (mede x, mas o texto sai '?' porque estes
scans não têm camada de texto) e `layout.py` (quer (x, texto) pronto). Aqui a
medição vira código com os tokens já classificados, e a imagem anotada mostra
EXATAMENTE onde cada token começa e acaba — o agrupamento que o medidor fez é o
mesmo que a transcrição precisa respeitar, senão o acorde troca de sílaba.

Gap fino (0.7 col ≈ 13px a 300 dpi) nas DUAS linhas:
  - na linha de ACORDE cada `/` sai sozinho e ganha o seu x medido, enquanto os
    acordes com baixo invertido (`Dm/C`, `Gm6/Bb`), impressos como fração, ficam
    um blob só — que é exatamente o que se quer.
  - na linha de LETRA cada palavra ganha o seu x. Isto é mais fiel que agrupar a
    frase: num token só, o espaçamento INTERNO passa a ser o que o transcritor
    escreveu, não o medido, e as palavras do meio escorregam para a esquerda
    (o espaço simples é o mínimo) — levando o acorde para fora da sílaba. Numa
    das 101 Melhores um grupo chegou a 55 caracteres num token único.
    O gap fino não parte o que o livro liga com travessão: em `ou—tra`,
    `co—ração`, `es—peranças` o traço encosta nas letras e o blob continua
    inteiro. É por isso que 0.7 separa palavra sem quebrar sílaba.

Todo `/` da linha de acorde tem a largura de um glifo só (~21px a 300 dpi), então
sai preenchido automaticamente; o que fica '?' é nome de acorde e letra, para ler
na imagem anotada. `--largura-barra` ajusta esse corte.

Uso:
  tokens_skel.py <pdf> <pág.> -y0 0.42 -y1 0.72 [-o DIR]
      -> DIR/anotada-pNN.png  e o esqueleto SISTEMAS no stdout
  --primeira letra   se o bloco começa por linha de letra
  --so-acorde 3,7    bandas que são só acorde (instrumental, sem letra embaixo)
"""
import argparse
import os
import sys

try:
    import fitz
    import numpy as np
    from PIL import Image, ImageDraw
except ImportError as e:  # pragma: no cover
    sys.exit(f'falta dependência: {e}. pip install pymupdf pillow numpy')

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from measure_cifra import bands, tokens  # noqa: E402


def render(pdf, pagina, dpi):
    page = fitz.open(pdf)[pagina - 1]
    pix = page.get_pixmap(dpi=dpi, colorspace=fitz.csGRAY)
    return Image.frombytes('L', (pix.width, pix.height), pix.samples)


def masked(arr, y0, y1, marg):
    H, W = arr.shape
    m = arr[y0:y1] < 128
    m[:, :int(W * marg)] = False
    m[:, W - int(W * marg):] = False
    return m


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('pdf')
    ap.add_argument('pagina', type=int)
    ap.add_argument('-y0', type=float, default=0.0)
    ap.add_argument('-y1', type=float, default=1.0)
    ap.add_argument('--dpi', type=int, default=300)
    ap.add_argument('--scale', type=float, default=19.0, help='px por coluna, só para converter --gap')
    ap.add_argument('--gap-acorde', type=float, default=0.7)
    ap.add_argument('--gap-letra', type=float, default=0.7,
                    help='fino de propósito: uma palavra por token, cada uma com o seu x')
    ap.add_argument('--largura-barra', type=int, default=26,
                    help='token de acorde até esta largura (px) é uma barra `/`')
    # Respingo de scan vira token fantasma e desencontra a contagem de tokens da
    # de palavras — que é a conferência mais útil que se tem. Área de tinta separa
    # os dois sem ambiguidade: nas 101 Melhores os respingos deram 1 e 6 px de
    # tinta, a barra `/` mais magra dá ~90, e o menor glifo real de uma linha de
    # letra (a vírgula, dentro de uma palavra) nunca aparece como token sozinho.
    ap.add_argument('--min-tinta', type=int, default=15,
                    help='token com menos tinta que isto (px) é respingo e sai')
    ap.add_argument('--min-gap-linhas', type=int, default=6)
    # `measure_cifra` já tinha isto e o esqueleto não repassava, o que deixava
    # este script sem saída justo nas páginas mais difíceis. Quando a linha de
    # acorde encosta na de letra — em *Detalhes* é a diagonal do `A7M/E`, que
    # desce e toca a letra — não sobra linha 100% branca entre as duas e elas
    # saem como UMA banda de ~96px. Com densidade, uma linha só conta como
    # tinta se tiver essa fração de colunas escuras, e o fio da diagonal deixa
    # de costurar as bandas. 0.004 basta em *Detalhes*.
    ap.add_argument('--densidade', type=float, default=0.0,
                    help='fração mínima de colunas com tinta para a linha contar')
    ap.add_argument('--marg', type=float, default=0.04)
    ap.add_argument('--primeira', choices=['acorde', 'letra'], default='acorde')
    ap.add_argument('--so-acorde', default='', help='bandas sem letra embaixo, 1-based')
    ap.add_argument('--nome', default='SISTEMAS', help='nome da constante no esqueleto')
    ap.add_argument('-o', '--out', default='.')
    a = ap.parse_args()

    img = render(a.pdf, a.pagina, a.dpi)
    arr = np.asarray(img)
    H, W = arr.shape
    y0 = int(H * a.y0)
    m = masked(arr, y0, int(H * a.y1), a.marg)
    # Banda que só tem respingo tem de sair AQUI, antes da tipagem. Descartar o
    # token adiante não bastava: a banda continuava na lista, consumia uma vez
    # da alternância acorde/letra e INVERTIA todos os sistemas seguintes — foi o
    # que quebrou *Detalhes*, com quatro delas na mesma página. Mesmo critério do
    # `--min-tinta`, um nível acima: banda de verdade tem milhares de px de tinta.
    bs, vazias = [], []
    for b0, b1 in bands(m, a.min_gap_linhas, a.densidade):
        (bs if m[b0:b1].sum() >= a.min_tinta else vazias).append((b0, b1))
    so_acorde = {int(x) for x in a.so_acorde.split(',') if x.strip()}

    # tipo de cada banda: acorde/letra alternando, salvo as marcadas como só-acorde
    tipos, esperado = [], a.primeira
    for i in range(1, len(bs) + 1):
        if i in so_acorde:
            tipos.append('acorde')
            esperado = 'acorde'
        else:
            tipos.append(esperado)
            esperado = 'letra' if esperado == 'acorde' else 'acorde'

    os.makedirs(a.out, exist_ok=True)
    linhas, todos, respingos = [], [], 0
    for b0, b1 in vazias:
        linhas.append(f'# banda descartada y={b0}-{b1}: só respingo '
                      f'({int(m[b0:b1].sum())}px de tinta)')
    for i, ((b0, b1), tipo) in enumerate(zip(bs, tipos), 1):
        gap = a.gap_acorde if tipo == 'acorde' else a.gap_letra
        ts = tokens(m, b0, b1, max(int(round(gap * a.scale)), 1))
        limpos = [(t0, t1) for t0, t1 in ts if m[b0:b1, t0:t1].sum() >= a.min_tinta]
        respingos += len(ts) - len(limpos)
        toks = [(t0, t1, '/' if tipo == 'acorde' and t1 - t0 <= a.largura_barra else '?')
                for t0, t1 in limpos]
        todos.append((i, tipo, b0, b1, toks))
        sujos = ''.join(f'  [respingo x={t0} descartado: {m[b0:b1, t0:t1].sum()}px de tinta]'
                        for t0, t1 in ts if (t0, t1) not in limpos)
        linhas.append(f'# banda {i:2d} {tipo:6} y={b0}-{b1} {len(limpos)} tokens '
                      f'({sum(1 for t in toks if t[2] == "/")} barras){sujos}')

    x0_bloco = min(t[0] for _, _, _, _, toks in todos for t in toks)

    # imagem anotada: barra escura sob cada token, do x0 ao x1 medidos
    pad, alt = 16, 7
    peças = []
    for i, tipo, b0, b1, toks in todos:
        crop = img.crop((0, y0 + b0 - 4, W, y0 + b1 + 4)).convert('L')
        tira = Image.new('L', (W, crop.height + pad), 255)
        tira.paste(crop, (0, 0))
        d = ImageDraw.Draw(tira)
        for n, (t0, t1, kind) in enumerate(toks, 1):
            y = crop.height + 4 + (0 if n % 2 else alt - 3)
            d.rectangle((t0, y, t1 - 1, y + 2), fill=0 if kind == '?' else 150)
        d.text((4, crop.height + 2), f'b{i}', fill=0)
        peças.append(tira)
    anot = Image.new('L', (W, sum(p.height + 10 for p in peças)), 255)
    y = 0
    for p in peças:
        anot.paste(p, (0, y))
        y += p.height + 10
        ImageDraw.Draw(anot).line((0, y - 5, W, y - 5), fill=200)
    p_anot = os.path.join(a.out, f'anotada-p{a.pagina}.png')
    anot.save(p_anot)

    print('\n'.join(linhas))
    print(f'\n# x0 do bloco = {x0_bloco}   imagem anotada -> {p_anot}')
    print(f'# {respingos} respingo(s) descartado(s) por ter menos de {a.min_tinta}px de tinta')
    print(f'# barras `/` preenchidas automaticamente (largura <= {a.largura_barra}px);'
          f' trocar cada \'?\' pelo texto lido na imagem.\n')

    print(f'{a.nome}_X0 = {x0_bloco}')
    print(f'{a.nome} = [')
    i = 0
    while i < len(todos):
        n, tipo, _, _, toks = todos[i]
        acordes = [(t0, k) for t0, _, k in toks] if tipo == 'acorde' else []
        letras = []
        if tipo == 'acorde' and i + 1 < len(todos) and todos[i + 1][1] == 'letra':
            letras = [(t0, k) for t0, _, k in todos[i + 1][4]]
            i += 2
        else:
            i += 1
        print(f'    # banda {n}')
        print(f'    ({acordes!r},')
        print(f'     {letras!r}),')
    print(']')


if __name__ == '__main__':
    main()
