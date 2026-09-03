#!/usr/bin/env python3
"""Mede as bandas de uma cifra com detecção própria, e devolve (início, fim) de
cada token.

Quando usar isto em vez do `tokens_skel.py`: quando a página quebra a premissa
dele de que as bandas alternam acorde/letra por posição. Três coisas fazem isso,
e as três já apareceram neste acervo:

  - **respingo que vira BANDA.** Um pontinho de 1–2 px numa faixa vazia conta
    como banda inteira, e como o tipo é dado pela paridade, uma banda fantasma
    **inverte o tipo de todas as seguintes**. O `--so-acorde` do esqueleto
    absorve isso, mas exige saber de antemão quais são;
  - **duas linhas grudadas** numa banda só, que nenhum `--min-gap-linhas`
    separa porque elas se tocam de verdade no scan;
  - **espaçamento entre linhas menor** que no resto do livro.

Aqui as bandas saem por tinta com piso alto (o que mata o respingo), as altas
demais são cortadas na linha de menos tinta do miolo, e só então o tipo vem da
paridade — que agora é confiável.

Grava uma imagem anotada com uma barra sob cada token medido: escura para token
largo, clara para o que tem largura de barra de compasso. É nela que se
transcreve.

Uso:
  python3 scripts/new_songbook/medir_bandas.py <pdf> -y0 0.30 -y1 0.85 -o DIR
      [--primeira acorde|letra] [--altura-dupla 75] [--piso 3]
"""
import argparse
import json
import os
import sys

try:
    import fitz
    import numpy as np
    from PIL import Image, ImageDraw
except ImportError as e:  # pragma: no cover
    sys.exit(f'falta dependência: {e}. pip install pymupdf numpy pillow')

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from measure_cifra import tokens as _tokens_qualquer_pixel  # noqa: E402


def tokens(mascara, y0, y1, gap_px, piso_coluna=1):
    """Tokens de uma banda, com um PISO DE TINTA POR COLUNA.

    O piso é o que separa o traço de melisma das sílabas que ele liga. Com o
    padrão (qualquer pixel serve) `vi——da` e `sauda——de` saem como um token só,
    e a sílaba de baixo perde a coluna de onde saiu — que é justamente o que a
    medição existe para preservar. O traço é fino: 5–6 px de tinta por coluna
    já o descarta e não encosta em letra nenhuma. De quebra somem o respingo de
    scan e a risca de caneta que atravessa algumas páginas.
    """
    if piso_coluna <= 1:
        return _tokens_qualquer_pixel(mascara, y0, y1, gap_px)
    col = mascara[y0:y1].sum(axis=0) >= piso_coluna
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


def bandas_por_tinta(mascara, piso, altura_min):
    """Faixas horizontais com tinta acima do piso. Piso alto mata respingo."""
    ink = mascara.sum(axis=1)
    faixas, dentro, ini = [], False, 0
    for y in range(mascara.shape[0]):
        tem = ink[y] > piso
        if tem and not dentro:
            ini, dentro = y, True
        elif not tem and dentro:
            if y - ini > altura_min:
                faixas.append([ini, y])
            dentro = False
    if dentro and mascara.shape[0] - ini > altura_min:
        faixas.append([ini, mascara.shape[0]])
    return faixas, ink


def corta_duplas(faixas, ink, altura_dupla, log=None):
    """Banda alta demais é duas linhas grudadas: corta na linha de menos tinta
    do miolo (35%–65%), que é onde o vale entre elas está."""
    saida = []
    for y0, y1 in faixas:
        if y1 - y0 < altura_dupla:
            saida.append((y0, y1))
            continue
        miolo = range(y0 + int((y1 - y0) * 0.35), y0 + int((y1 - y0) * 0.65))
        corte = min(miolo, key=lambda y: ink[y])
        if log is not None:
            log.append(f'banda {y0}-{y1} cortada em y={corte} (tinta {ink[corte]})')
        saida.append((y0, corte))
        saida.append((corte, y1))
    return saida


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('pdf')
    ap.add_argument('--pagina', type=int, default=1)
    ap.add_argument('-y0', type=float, default=0.0)
    ap.add_argument('-y1', type=float, default=1.0)
    ap.add_argument('--dpi', type=int, default=300)
    ap.add_argument('--marg', type=float, default=0.01)
    # As duas margens separadas, porque nem todo estorvo é simétrico e recortar
    # dos dois lados para matar um deles come token do outro. Dois casos medidos
    # na série "O Melhor de" (Vitale):
    #   - a CHAVE de `BIS`/`REFRÃO` é um traço vertical contínuo que costura
    #     as 5 linhas do bloco numa banda só (Alvorada, PDF 26). Some com
    #     --marg-esq passando da chave;
    #   - a cifra em DUAS COLUNAS: medir a página inteira mistura as colunas na
    #     mesma banda. Uma passada por coluna, com a janela em --marg-esq/--marg-dir,
    #     devolve o x relativo certo para cada uma.
    ap.add_argument('--marg-esq', type=float, default=None,
                    help='margem esquerda, quando diferente de --marg')
    ap.add_argument('--marg-dir', type=float, default=None,
                    help='margem direita, quando diferente de --marg')
    # A janela de DETECÇÃO das bandas pode ser mais estreita que a de medição.
    # Na Alvorada (PDF 26) a chave do `BIS` fica em x=400-465 e o acorde `Cm7`
    # começa em 407: um corte só, que serve para os dois, não existe — ou a
    # chave costura as 5 linhas numa banda só, ou o `Cm7` sai picado. Detectar
    # no miolo e medir na faixa inteira resolve os dois de uma vez.
    ap.add_argument('--det-esq', type=float, default=None,
                    help='margem esquerda só para DETECTAR banda (padrão: --marg-esq)')
    ap.add_argument('--det-dir', type=float, default=None,
                    help='margem direita só para DETECTAR banda (padrão: --marg-dir)')
    ap.add_argument('--gap', type=float, default=0.7, help='folga entre tokens, em colunas')
    ap.add_argument('--scale', type=float, default=19.0, help='px por coluna, só para o --gap')
    ap.add_argument('--piso', type=int, default=3, help='colunas com tinta para a linha contar')
    ap.add_argument('--altura-min', type=int, default=8)
    ap.add_argument('--altura-dupla', type=int, default=75,
                    help='banda a partir desta altura é duas linhas grudadas')
    ap.add_argument('--min-tinta', type=int, default=15, help='token com menos tinta é respingo')
    ap.add_argument('--piso-coluna', type=int, default=1,
                    help='px de tinta na coluna para ela contar (5–6 apaga o traço de melisma)')
    # Tinta sozinha não separa respingo de palavra: uma vírgula solta numa banda
    # de 55px tem ~20px de tinta e passa. Largura separa — o menor token real de
    # uma linha de letra é `e`/`a`, com ~15px, e os respingos medidos deram 4-10.
    ap.add_argument('--min-largura', type=int, default=12,
                    help='token mais estreito que isto é respingo de pontuação')
    ap.add_argument('--largura-barra', type=int, default=26)
    ap.add_argument('--primeira', choices=['acorde', 'letra'], default='acorde')
    # Deskew. Sem ele a página inclinada faz a linha de letra SUBIR até a faixa
    # do acorde no fim da linha: na p.39 do Tom Jobim vol. 2 (−1,10°) o "A" e o
    # "e" de "A espera" viram dois acordes que não existem, e nas seis bandas
    # grudadas o corte na vala não tem onde cair. Endireitada, a mesma página
    # devolve as 12 bandas SEPARADAS e nenhum token fantasma.
    ap.add_argument('--deskew', action='store_true',
                    help='mede a inclinação da faixa -y0..-y1 e endireita antes de medir')
    ap.add_argument('--rot', type=float, default=None,
                    help='ângulo em graus, quando já se sabe qual é (dispensa --deskew)')
    ap.add_argument('-o', '--out', default='.')
    a = ap.parse_args()

    pix = fitz.open(a.pdf)[a.pagina - 1].get_pixmap(dpi=a.dpi, colorspace=fitz.csGRAY)
    img = Image.frombytes('L', (pix.width, pix.height), pix.samples)

    rot = a.rot
    if rot is None and a.deskew:
        # O ângulo certo é o que faz as linhas de texto ficarem horizontais, e
        # isso é o mesmo que MAXIMIZAR A VARIÂNCIA do perfil de tinta por linha:
        # torto, o texto espalha tinta por muitas linhas e o perfil achata.
        cx = img.crop((int(img.width * 0.02), int(img.height * a.y0),
                       int(img.width * 0.98), int(img.height * a.y1)))
        rot = max(np.arange(-1.5, 1.51, 0.05),
                  key=lambda g: (np.asarray(cx.rotate(g, resample=Image.BILINEAR,
                                                      fillcolor=255)) < 128).sum(axis=1).var())
        rot = round(float(rot), 2)
    if rot:
        img = img.rotate(rot, resample=Image.BILINEAR, fillcolor=255)
        print(f'# inclinação corrigida: {rot:+.2f}°')

    arr = np.asarray(img)
    H, W = arr.shape

    m = (arr < 128).copy()
    marg_esq = a.marg if a.marg_esq is None else a.marg_esq
    marg_dir = a.marg if a.marg_dir is None else a.marg_dir
    m[:, :int(W * marg_esq)] = False
    m[:, W - int(W * marg_dir):] = False
    m[:int(H * a.y0)] = False
    m[int(H * a.y1):] = False

    # A detecção vê uma janela possivelmente mais estreita que a medição; os
    # tokens saem sempre de `m`, que é a faixa inteira.
    det0 = int(W * (marg_esq if a.det_esq is None else a.det_esq))
    det1 = W - int(W * (marg_dir if a.det_dir is None else a.det_dir))
    det = m.copy()
    det[:, :det0] = False
    det[:, det1:] = False

    log = []
    faixas, ink = bandas_por_tinta(det, a.piso, a.altura_min)
    faixas = corta_duplas(faixas, ink, a.altura_dupla, log)
    for linha in log:
        print(f'# {linha}')

    gap = max(int(round(a.gap * a.scale)), 1)
    saida = []
    for i, (y0, y1) in enumerate(faixas):
        tipo = a.primeira if i % 2 == 0 else ('letra' if a.primeira == 'acorde' else 'acorde')
        # A largura mínima vale só na LETRA: numa linha de acorde a barra de
        # compasso mede 10–14px, a mesma faixa do respingo, e cortar por largura
        # ali comeria barras reais. Respingo em linha de acorde vira `/` na
        # transcrição e some junto com as outras barras.
        largura_min = a.min_largura if tipo == 'letra' else 1
        ts = [(t0, t1) for t0, t1 in tokens(m, y0, y1, gap, a.piso_coluna)
              if m[y0:y1, t0:t1].sum() >= a.min_tinta and t1 - t0 >= largura_min]
        saida.append({'y': [y0, y1], 'tipo': tipo, 'ts': [[t0, t1] for t0, t1 in ts]})

    os.makedirs(a.out, exist_ok=True)
    with open(os.path.join(a.out, 'bandas.json'), 'w') as f:
        json.dump(saida, f)

    pad, alt = 16, 7
    pecas = []
    for i, b in enumerate(saida, 1):
        y0, y1 = b['y']
        crop = img.crop((0, y0 - 4, W, y1 + 4))
        tira = Image.new('L', (W, crop.height + pad), 255)
        tira.paste(crop, (0, 0))
        d = ImageDraw.Draw(tira)
        for n, (t0, t1) in enumerate(b['ts'], 1):
            y = crop.height + 4 + (0 if n % 2 else alt - 3)
            barra = b['tipo'] == 'acorde' and t1 - t0 <= a.largura_barra
            d.rectangle((t0, y, t1 - 1, y + 2), fill=150 if barra else 0)
        d.text((4, crop.height + 2), f'b{i}', fill=0)
        # o x de cada token escrito por cima: é ele que vai para o módulo, e
        # lê-lo da imagem evita contar tokens de cabeça na hora de transcrever
        for t0, _ in b['ts']:
            d.text((t0 + 1, 1), str(t0), fill=0)
        pecas.append(tira)
    anot = Image.new('L', (W, sum(p.height + 10 for p in pecas)), 255)
    y = 0
    for p in pecas:
        anot.paste(p, (0, y))
        y += p.height + 10
    anot.save(os.path.join(a.out, 'anotada.png'))

    for i, b in enumerate(saida, 1):
        barras = sum(1 for t0, t1 in b['ts']
                     if b['tipo'] == 'acorde' and t1 - t0 <= a.largura_barra)
        print(f"# banda {i:2d} {b['tipo']:6} y={b['y'][0]}-{b['y'][1]} "
              f"{len(b['ts'])} tokens ({barras} barras)")
    print(f"# x0 = {min(t[0] for b in saida for t in b['ts'])}")
    print(f"# {len(saida)} banda(s) -> {a.out}/bandas.json  e  {a.out}/anotada.png")


if __name__ == '__main__':
    main()
