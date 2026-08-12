#!/usr/bin/env python3
"""Lê a grade de diagramas de acorde de uma página de songbook, por pixel.

Por que por pixel: o desenho é a fonte da verdade — o algarismo romano da
casa-base sai errado no OCR ('IV' vira 'N', 'III' vira 'Ill') e o nome do acorde
nem sempre corresponde ao que o livro desenhou (em "Samba de uma nota só",
2 dos 18 diagramas soam outro acorde). Aqui o desenho é medido e a casa-base é
resolvida pelo **teste das notas**: das casas-base 1..12, vale a que faz as notas
do voicing caberem no nome, com o baixo nomeado na corda mais grave.

Limiares (300 dpi), medidos no Chico vol. 1:
  - estrutura (linhas do braço): tinta < 170. Com 128 a corda mais à direita de
    cada caixa some — sai clara no scan — e a caixa vira de 5 cordas.
  - ponto: tinta < 128 e corrida horizontal >= 14 px no centro da casa.
  - ○ de corda solta: tinta acima do braço, na coluna da corda.

Uso:
  python3 scripts/new_songbook/measure_diagrams.py <pdf> <pág. do PDF> <acordes>
      <acordes> = lista separada por vírgula, na ordem de leitura da grade
      (esquerda→direita, de cima para baixo). Imprime, para cada caixa, o
      desenho relativo, as casas-base que fecham com o nome e o dict pronto
      para colar em `digitacoes`.

Saída de diagnóstico que importa: **casa-base que fecha** com mais de uma opção
(ambíguo, conferir no olho) ou com nenhuma (o livro desenhou outra coisa —
decidir se fica de fora, como no Bossa Nova 1).
"""
import argparse
import re
import sys

try:
    import fitz
    import numpy as np
except ImportError as e:  # pragma: no cover
    sys.exit(f'falta dependência: {e}. pip install pymupdf numpy')

CORDAS_SOLTAS = [4, 9, 2, 7, 11, 4]          # Mi Lá Ré Sol Si Mi, classe de altura
PC = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
NOTA = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
GRAU = {'9': 2, 'b9': 1, '#9': 3, '11': 5, '#11': 6, '4': 5,
        '13': 9, 'b13': 8, '#13': 10, '5': 7, 'b5': 6, '#5': 8, '6': 9, '7': 10}


def pc(nome):
    v = PC[nome[0]]
    for c in nome[1:]:
        v += 1 if c == '#' else (-1 if c == 'b' else 0)
    return v % 12


def notas_do_nome(nome):
    """(graus obrigatórios, graus permitidos, classe do baixo ou None)."""
    m = re.match(r'^([A-G][#b]?)(.*)$', nome)
    raiz, resto = m.group(1), m.group(2)
    baixo = None
    mb = re.search(r'/([A-G][#b]?)$', resto)      # barra final que é NOTA
    if mb:
        baixo = pc(mb.group(1))
        resto = resto[:mb.start()]
    exts = re.findall(r'\(([^)]*)\)', resto)
    base = re.sub(r'\([^)]*\)', '', resto)
    r = pc(raiz)
    # DIMINUTO primeiro, senão 'F°' é lido como Fá MAIOR e nenhuma casa-base
    # fecha — foi o que aconteceu com o F° de "O samba da minha terra". O Chediak
    # grafa com '°' (U+00B0) ou 'º' (U+00BA), e no violão o diminuto é sempre o de
    # 4 notas: raiz, b3, b5, bb7 (= 6ª maior). Nenhum grau aqui é a quinta justa,
    # então os quatro entram como obrigatórios — que é o certo: num diminuto a b5
    # é nota de acorde, não enfeite omissível.
    dim = re.match(r'(°|º|dim|o(?![A-Za-z]))', base)
    if dim:
        terca, base = 3, base[dim.end():]
        graus = {0, 3, 6, 9}
    elif base[:1] == 'm' and base[:3] != 'maj':
        terca, base = 3, base[1:]
        graus = {0, terca, 7}
    else:
        terca = 4
        graus = {0, terca, 7}
    if dim:
        pass
    elif base.startswith('7M'):
        graus.add(11); base = base[2:]
    elif base.startswith('6/9'):
        graus |= {9, 2}; base = base[3:]
    elif base.startswith('7/4'):                  # G7/4 = sétima com quarta
        graus |= {10, 5}; graus.discard(terca); base = base[3:]
    elif base.startswith('7'):
        graus.add(10); base = base[1:]
    elif base.startswith('6'):
        graus.add(9); base = base[1:]
    elif base.startswith('add'):
        pass
    for e in exts:
        for tok in re.findall(r'[b#]?\d+', e):
            if tok in GRAU:
                graus.add(GRAU[tok])
    for tok in re.findall(r'add(\d+)', resto):
        if tok in GRAU:
            graus.add(GRAU[tok])
    permitidas = {(r + g) % 12 for g in graus}
    if baixo is not None:
        permitidas.add(baixo)
    # a 5ª é a nota que o violão mais omite; as outras têm de aparecer
    obrig = {(r + g) % 12 for g in graus if g != 7}
    return obrig, permitidas, baixo, r


def maxrun(v):
    best = cur = 0
    for x in v:
        cur = cur + 1 if x else 0
        best = max(best, cur)
    return best


def run_vertical(col):
    """(comprimento, y_inicio) da maior corrida vertical."""
    best = (0, 0)
    cur = 0
    for y, v in enumerate(col):
        cur = cur + 1 if v else 0
        if cur > best[0]:
            best = (cur, y - cur + 1)
    return best


def agrupa(vals, folga):
    """[1,2,3, 40,41] -> [2, 40] com folga 5: centro de cada aglomerado."""
    out, ini, prev = [], vals[0], vals[0]
    for v in vals[1:]:
        if v - prev > folga:
            out.append((ini + prev) // 2); ini = v
        prev = v
    out.append((ini + prev) // 2)
    return out


def acha_fileiras(m_est, ymin, ymax):
    """Fileiras de caixas -> [[y dos trastes], ...].

    Parte das linhas HORIZONTAIS, não das verticais: as cordas saem com tinta
    irregular de fileira para fileira (na p.69 do Chico vol.1, a fileira 1 dá 159
    colunas de corda e a 3 só 67), enquanto o traste atravessa a caixa inteira e
    é o traço mais confiável da página.
    """
    # 80 px, não 100: na p.188 do Chico vol.1 os dois últimos trastes da fileira
    # 2 saem claros e com 100 a caixa vira de 2 espaços — as 4 últimas caixas
    # ficam sem ponto nenhum e nada fecha.
    ys = [y for y in range(ymin, ymax) if maxrun(m_est[y]) >= 80]
    if not ys:
        return []
    linhas = agrupa(ys, 4)
    # trastes da mesma caixa distam ~50 px; entre fileiras, muito mais
    passo = np.median(np.diff(linhas)) if len(linhas) > 1 else 50
    fileiras, atual = [], [linhas[0]]
    for y in linhas[1:]:
        if y - atual[-1] <= passo * 1.8:
            atual.append(y)
        else:
            fileiras.append(atual); atual = [y]
    fileiras.append(atual)
    # traste claro demais para ser detectado deixa um vão do dobro do passo:
    # interpola, senão a casa some e o acorde não fecha com nome nenhum
    saida = []
    for f in fileiras:
        if len(f) < 3:
            continue
        p = np.median(np.diff(f))
        cheia = [f[0]]
        for y in f[1:]:
            faltam = int(round((y - cheia[-1]) / p)) - 1
            for k in range(1, faltam + 1):
                cheia.append(int(cheia[-1] + p))
            cheia.append(y)
        saida.append(cheia)
    return saida


def acha_caixas(m_est, ymin, ymax):
    """Devolve [(trastes, [x das 6 cordas]), ...] na ordem de leitura."""
    caixas = []
    for tr in acha_fileiras(m_est, ymin, ymax):
        y0, y1 = tr[0], tr[-1]
        # corda = coluna com tinta em quase toda a altura da caixa
        xs = [x for x in range(m_est.shape[1])
              if m_est[y0:y1 + 1, x].mean() >= 0.75]
        if not xs:
            continue
        linhas = agrupa(xs, 6)
        atual = [linhas[0]]
        for x in linhas[1:]:
            if x - atual[-1] < 45:
                atual.append(x)
            else:
                caixas.append((tr, atual)); atual = [x]
        caixas.append((tr, atual))
    return caixas


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('pdf')
    ap.add_argument('pagina', type=int)
    ap.add_argument('acordes', help='nomes na ordem da grade, separados por vírgula')
    ap.add_argument('-y0', type=float, default=0.08)
    ap.add_argument('-y1', type=float, default=0.50)
    ap.add_argument('--dpi', type=int, default=300)
    ap.add_argument('--thr-estrutura', type=int, default=170)
    ap.add_argument('--thr-ponto', type=int, default=128)
    a = ap.parse_args()

    nomes = [n.strip() for n in a.acordes.split(',') if n.strip()]
    doc = fitz.open(a.pdf)
    pix = doc[a.pagina - 1].get_pixmap(dpi=a.dpi, colorspace=fitz.csGRAY)
    arr = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width)
    H = arr.shape[0]
    m_est, m_pt = arr < a.thr_estrutura, arr < a.thr_ponto

    caixas = acha_caixas(m_est, int(H * a.y0), int(H * a.y1))
    print(f'{len(caixas)} caixas achadas, {len(nomes)} nomes dados')
    if len(caixas) != len(nomes):
        print('!! contagem diferente — confira -y0/-y1 e a lista de acordes')
    print()

    dig, problemas = {}, []
    for nome, (tr, xs) in zip(nomes, caixas):
        if len(xs) != 6:
            problemas.append(f'{nome}: {len(xs)} cordas achadas'); continue
        rel = []
        for x in xs:
            casa = 0
            for e in range(len(tr) - 1):
                yc = (tr[e] + tr[e + 1]) // 2
                faixa = m_pt[yc - 3:yc + 4, x - 14:x + 15]
                if max(maxrun(faixa[r]) for r in range(faixa.shape[0])) >= 14:
                    casa = e + 1
                    break
            solta = m_pt[tr[0] - 26:tr[0] - 4, x - 12:x + 13].sum() > 50
            rel.append(casa if casa else (0 if solta else None))

        obrig, perm, baixo, raiz = notas_do_nome(nome)
        toca = [(i, f) for i, f in enumerate(rel) if f is not None]

        def fecha(exige):
            out = []
            for b in range(1, 13):
                notas = [(CORDAS_SOLTAS[i] + (0 if f == 0 else b + f - 1)) % 12
                         for i, f in toca]
                if not notas or not set(notas) <= perm or not exige <= set(notas):
                    continue
                if notas[0] != (baixo if baixo is not None else raiz):
                    continue
                out.append(b)
            return out

        opcoes, nota_rodape = fecha(obrig), ''
        # Voicing sem a fundamental é idiomático quando o acorde nomeia o baixo
        # (Cm7(9)/G no "Samba e amor" é Sol-Mib-Sib-Ré, sem o Dó). Só vale para
        # acorde com baixo nomeado, e sai marcado — não é o caso comum.
        if not opcoes and baixo is not None:
            opcoes = fecha(obrig - {raiz})
            if opcoes:
                nota_rodape = '  (sem a fundamental)'
        marca = nota_rodape if len(opcoes) == 1 else (
            '  <<< AMBÍGUO' if opcoes else '  <<< NÃO FECHA')
        print(f'{nome:<11} relativo {str(["x" if f is None else f for f in rel]):<28} '
              f'casa-base {opcoes}{marca}')
        if len(opcoes) == 1:
            b = opcoes[0]
            absol = [-1 if f is None else (0 if f == 0 else b + f - 1) for f in rel]
            notas = ' '.join(NOTA[(CORDAS_SOLTAS[i] + f) % 12] for i, f in enumerate(absol) if f >= 0)
            dig[nome] = (absol, notas)
        else:
            problemas.append(f'{nome}: casa-base {opcoes or "nenhuma"}')

    print()
    for nome, (absol, notas) in dig.items():
        print(f"    {repr(nome) + ':':<13} {{'frets': {absol}}},"
              f"{' ' * max(1, 30 - len(str(absol)))}# {notas}")
    if problemas:
        print('\nPENDÊNCIAS:')
        for p in problemas:
            print(' -', p)


if __name__ == '__main__':
    main()
