#!/usr/bin/env python3
"""Mede bandas e tokens do bloco letra+acordes, com máscara lateral por página.

Uso: medir.py <pag_pdf> <y0> <y1> <x_esq> <x_dir> [--primeira letra]
As bandas saem por tinta nas colunas centrais (500..1900), que ficam longe da
espiral dos dois lados; os tokens são medidos na faixa [x_esq, x_dir).
"""
import os
import sys

import fitz
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, '/Users/somacavalieri/Library/CloudStorage/GoogleDrive-somacavalieri@gmail.com/My Drive/_claude/somaplay/scripts/new_songbook')
from measure_cifra import tokens  # noqa: E402

PDF = ('/Users/somacavalieri/Library/CloudStorage/GoogleDrive-somacavalieri@gmail.com/'
       'My Drive/_claude/somaplay/chords/-new-songbook/Caetano Veloso Vol 2 - Almir Chediak/'
       '445225519-Songbook-caetano-veloso.pdf')
OUT = os.environ.get('OUT_DIR') or os.path.dirname(os.path.abspath(__file__))
GAP, MIN_TINTA, MIN_LARG_LETRA = 13, 15, 12

# Piso de altura para uma faixa de tinta contar como banda. 25 é o padrão: um
# caco menor que isso é respingo entre sistemas, e conta como banda INVERTENDO a
# paridade acorde/letra de tudo o que vem depois. Mas há linha de letra legítima
# abaixo disso — na p.115 "trabalho é te traduzir" e "vou lembrar de você" têm 21
# e 19 px, porque são só minúsculas sem ascendente nem acento, e o piso padrão as
# descarta, invertendo a paridade do mesmo jeito. Baixar por página, no ambiente:
#   ALT_MIN=15 python3 _medir_bandas_recursivo.py ...
ALT_MIN = int(os.environ.get('ALT_MIN', 25))


def main():
    pagina, y0f, y1f, x_esq, x_dir = (int(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3]),
                                      int(sys.argv[4]), int(sys.argv[5]))
    primeira = sys.argv[6] if len(sys.argv) > 6 else 'acorde'
    pix = fitz.open(PDF)[pagina - 1].get_pixmap(dpi=300, colorspace=fitz.csGRAY)
    img = Image.frombytes('L', (pix.width, pix.height), pix.samples)
    # Página torta não tem banda: em 2200 px de bloco, 1° são 38 px de queda, e
    # a partir de ~1° isso passa da altura de uma linha — o perfil de tinta vira
    # um morro só e QUALQUER corte horizontal atravessa acorde e letra ao mesmo
    # tempo. Medir o ângulo pela variância da projeção horizontal e passar aqui.
    ang = float(os.environ.get('DESKEW', 0))
    if ang:
        img = img.rotate(ang, resample=Image.BICUBIC, fillcolor=255)
    arr = np.asarray(img)
    m = (arr < 128).copy()
    m[:, :x_esq] = False
    m[:, x_dir:] = False

    # A faixa de detecção pode ser mais estreita que a de medição: na p.97 a
    # sombra da espiral põe tinta em quase toda linha entre x=24 e x=90 e cola
    # o bloco inteiro numa banda só, mas os tokens ainda precisam ser medidos
    # a partir de x=90. Janela central resolve os dois de uma vez.
    jan0, jan1 = (int(sys.argv[7]), int(sys.argv[8])) if len(sys.argv) > 8 else (x_esq, x_dir)
    ink = m[:, jan0:jan1].sum(axis=1)
    faixas, dentro, ini = [], False, 0
    for y in range(y0f, y1f):
        tem = ink[y] > 3
        if tem and not dentro:
            ini, dentro = y, True
        elif not tem and dentro:
            if y - ini > 8:
                faixas.append((ini, y))
            dentro = False
    if dentro:
        faixas.append((ini, y1f))

    # Banda alta demais é mais de uma linha grudada. Corta no vale do miolo e
    # REPETE nas metades: na p.97 há bandas de 257 px, que são dois sistemas
    # inteiros (4 linhas), e um corte só deixaria 2 de 128 px ainda grudadas.
    # 85, não 70: nesta página uma linha SÓ mede de 50 a 67 px (o corpo é
    # maior que o das outras), e com 70 o corte reincidia sobre linha inteira
    # e devolvia caco de 25 px, que inverte a paridade acorde/letra daí para
    # baixo. Duas linhas grudadas dão 110 a 133 px, bem acima do limiar.
    ALT_DUPLA = int(os.environ.get('ALT_DUPLA', 85))

    # O teto de profundidade é só rede de segurança — quem decide parar é o
    # `b - a < ALT_DUPLA`. E 3 níveis não bastam quando a página inteira sai
    # numa banda só: na p.116 (Tigresa) o bloco de 12 sistemas veio como UMA
    # faixa de 1344 px, que precisa de 5 cortes encadeados para virar 24 linhas,
    # e com o teto em 3 sobravam 9 bandas ainda grudadas — parecendo linhas
    # legítimas de 71 a 134 px.
    def parte(a, b, prof=0):
        if b - a < ALT_DUPLA or prof > 8:
            return [(a, b)]
        miolo = range(a + int((b - a) * 0.35), a + int((b - a) * 0.65))
        corte = min(miolo, key=lambda y: ink[y])
        print(f'# banda {a}-{b} ({b-a} px) cortada em y={corte} (tinta {int(ink[corte])})')
        return parte(a, corte, prof + 1) + parte(corte, b, prof + 1)

    partidas = []
    for a, b in faixas:
        partidas += parte(a, b)
    faixas = [(a, b) for a, b in partidas if b - a >= ALT_MIN]

    saida = []
    for i, (a, b) in enumerate(faixas):
        tipo = primeira if i % 2 == 0 else ('letra' if primeira == 'acorde' else 'acorde')
        lmin = MIN_LARG_LETRA if tipo == 'letra' else 1
        ts = [(t0, t1) for t0, t1 in tokens(m, a, b, GAP)
              if m[a:b, t0:t1].sum() >= MIN_TINTA and t1 - t0 >= lmin]
        saida.append((i + 1, tipo, a, b, ts))
        print(f'banda {i+1:2d} {tipo:6} y={a}-{b} h={b-a} {len(ts)} tokens')
        print('   ' + ' '.join(f'{t0}:{t1-t0}:{int(m[a:b,t0:t1].sum())}' for t0, t1 in ts))

    # Uma tira por banda, com uma CERCA vertical no início e no fim de cada
    # token. A barra embaixo era ambígua de ler: em "A vida é amiga" dava para
    # jurar que o grupo era 'é amiga' quando o medido era 'vida é'. A cerca não
    # deixa dúvida — o que está entre duas linhas é um token.
    for i, tipo, a, b, ts in saida:
        crop = img.crop((x_esq, a - 10, x_dir, b + 10))
        tira = Image.new('L', (crop.width, crop.height + 22), 255)
        tira.paste(crop, (0, 0))
        d = ImageDraw.Draw(tira)
        for n, (t0, t1) in enumerate(ts, 1):
            u, v = t0 - x_esq, t1 - x_esq
            d.line((u, 0, u, tira.height), fill=140)
            d.line((v, 0, v, tira.height), fill=140)
            d.rectangle((u, crop.height + 6, v - 1, crop.height + 9), fill=0)
            d.text((u + 2, crop.height + 11), str(n), fill=0)
        for k, (u, v) in enumerate(((0, 760), (720, 1480), (1440, tira.width)), 1):
            part = tira.crop((u, 0, min(v, tira.width), tira.height))
            part.resize((part.width * 3, part.height * 3), Image.LANCZOS).save(
                f'{OUT}/p{pagina}-b{i:02d}-{k}.png')


if __name__ == '__main__':
    main()
