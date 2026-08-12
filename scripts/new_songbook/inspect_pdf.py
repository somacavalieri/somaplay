#!/usr/bin/env python3
"""Inspeciona o scan de um songbook antes de extrair música dele.

Existe por um motivo específico: **a página do livro quase nunca é a página do
PDF**, e chutar um offset já deu errado duas vezes (Bossa Nova 1 extrapolou de 1
calibração; Caetano vol. 2 tem offset que muda 4 vezes e páginas duplicadas no
scan). As três subcomandos abaixo levantam o mapa real em vez de estimá-lo.

Uso:
  python3 scripts/new_songbook/inspect_pdf.py check  <pdf>
      Páginas, camada de texto, resolução/profundidade das imagens e grupos de
      páginas byte-idênticas (pega re-scan e duplicata).

  python3 scripts/new_songbook/inspect_pdf.py folios <pdf> [-o DIR]
      Contact sheets com os dois cantos inferiores de cada página, 40 por folha,
      rotuladas `pdf N`. É como se lê o fólio impresso de todas as páginas de uma
      vez para montar o mapa livro→PDF. O fólio costuma alternar canto (par à
      esquerda, ímpar à direita), por isso os dois cantos vão lado a lado.

  python3 scripts/new_songbook/inspect_pdf.py titles <pdf> P1,P2,... [-o DIR]
      Contact sheets com o bloco de título (título + compositores + ano) das
      páginas do PDF indicadas, 8 por folha. Serve para colher o crédito de cada
      música — vários songbooks não trazem compositor no índice — e, de graça,
      para conferir que cada música abre na página que o mapa previu.

Requer PyMuPDF e Pillow (`pip install pymupdf pillow`). Não escreve nada dentro
de chords/; o destino padrão é o diretório atual.
"""
import argparse
import hashlib
import os
import sys

try:
    import fitz
    import numpy as np
    from PIL import Image, ImageDraw, ImageFont
except ImportError as e:  # pragma: no cover
    sys.exit(f'falta dependência: {e}. pip install pymupdf pillow numpy')


def _font(size=24):
    for p in ('/System/Library/Fonts/Supplemental/Arial Bold.ttf',
              '/System/Library/Fonts/Supplemental/Arial.ttf'):
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def _gray(doc, i, dpi):
    pix = doc[i].get_pixmap(dpi=dpi, colorspace=fitz.csGRAY)
    return Image.frombytes('L', (pix.width, pix.height), pix.samples)


def check(pdf):
    doc = fitz.open(pdf)
    print(f'{os.path.basename(pdf)}: {len(doc)} páginas')

    chars = sum(len(p.get_text().strip()) for p in doc)
    print(f'camada de texto: {chars} caracteres', end='')
    print(' — scan puro, nada de OCR para aproveitar' if chars == 0 else '')

    print('\nimagens embutidas (primeiras 5 páginas):')
    for i in range(min(5, len(doc))):
        for im in doc[i].get_images(full=True):
            try:
                d = doc.extract_image(im[0])
                bits = '1 bit (bitonal)' if d['colorspace'] == 1 else f"{d['colorspace']} comp."
                print(f"  p{i+1}: {d['width']}×{d['height']} {bits} {d['ext']}")
            except Exception:
                pass

    seen = {}
    for i in range(len(doc)):
        a = np.asarray(_gray(doc, i, 100))
        h = hashlib.md5(np.packbits(a < 128).tobytes()).hexdigest()[:12]
        seen.setdefault(h, []).append(i + 1)
    dups = {k: v for k, v in seen.items() if len(v) > 1}
    print(f'\npáginas byte-idênticas: {dups if dups else "nenhuma"}')


def _sheets(tiles, out_dir, prefix, cols, rows, tw, th, pad):
    os.makedirs(out_dir, exist_ok=True)
    font = _font()
    per = cols * rows
    paths = []
    for s in range((len(tiles) + per - 1) // per):
        chunk = tiles[s * per:(s + 1) * per]
        if cols == 1:
            sheet = Image.new('L', (tw, sum(t.height + pad for _, t in chunk)), 255)
            dr = ImageDraw.Draw(sheet)
            y = 0
            for lab, t in chunk:
                dr.text((6, y + 4), lab, font=font, fill=0)
                sheet.paste(t, (0, y + pad - 4))
                y += t.height + pad
                dr.line([(0, y - 3), (tw, y - 3)], fill=140)
        else:
            sheet = Image.new('L', (cols * (tw + 10), rows * (th + pad)), 255)
            dr = ImageDraw.Draw(sheet)
            for k, (lab, t) in enumerate(chunk):
                r, c = divmod(k, cols)
                x, y = c * (tw + 10), r * (th + pad)
                dr.text((x + 4, y + 2), lab, font=font, fill=0)
                dr.line([(x, y + pad - 2), (x + tw, y + pad - 2)], fill=180)
                sheet.paste(t, (x, y + pad))
        p = os.path.join(out_dir, f'{prefix}-{s+1:02d}.png')
        sheet.save(p)
        paths.append(p)
    return paths


def folios(pdf, out_dir):
    doc = fitz.open(pdf)
    tw, th = 520, 86
    tiles = []
    for i in range(len(doc)):
        img = _gray(doc, i, 200)
        W, H = img.size
        y0, y1 = int(H * 0.885), int(H * 0.95)
        left = img.crop((0, y0, int(W * 0.22), y1))
        right = img.crop((int(W * 0.78), y0, W, y1))
        comb = Image.new('L', (left.width + right.width + 12, left.height), 255)
        comb.paste(left, (0, 0))
        comb.paste(right, (left.width + 12, 0))
        tiles.append((f'pdf {i+1}', comb.resize((tw, th))))
    paths = _sheets(tiles, out_dir, 'folio', 4, 10, tw, th, 30)
    print(f'{len(tiles)} páginas → {len(paths)} folha(s):')
    for p in paths:
        print(' ', p)


def titles(pdf, pages, out_dir):
    doc = fitz.open(pdf)
    tiles = []
    for n in pages:
        img = _gray(doc, n - 1, 170)
        W, H = img.size
        band = img.crop((int(W * 0.06), int(H * 0.075), int(W * 0.94), int(H * 0.185)))
        band = band.resize((1500, int(band.height * 1500 / band.width)))
        tiles.append((f'pdf {n}', band))
    paths = _sheets(tiles, out_dir, 'title', 1, 8, 1500, 0, 34)
    print(f'{len(tiles)} títulos → {len(paths)} folha(s):')
    for p in paths:
        print(' ', p)


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    c = sub.add_parser('check', help='páginas, camada de texto, resolução, duplicatas')
    c.add_argument('pdf')
    f = sub.add_parser('folios', help='contact sheets dos fólios impressos')
    f.add_argument('pdf')
    f.add_argument('-o', '--out', default='.')
    t = sub.add_parser('titles', help='contact sheets dos blocos de título')
    t.add_argument('pdf')
    t.add_argument('pages', help='páginas do PDF: 3,6,10 ou 3-12')
    t.add_argument('-o', '--out', default='.')
    a = ap.parse_args()

    if a.cmd == 'check':
        check(a.pdf)
    elif a.cmd == 'folios':
        folios(a.pdf, a.out)
    else:
        pages = []
        for part in a.pages.split(','):
            if '-' in part:
                lo, hi = part.split('-')
                pages += list(range(int(lo), int(hi) + 1))
            else:
                pages.append(int(part))
        titles(a.pdf, pages, a.out)


if __name__ == '__main__':
    main()
