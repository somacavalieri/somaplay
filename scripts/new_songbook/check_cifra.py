#!/usr/bin/env python3
"""Confere a cifra montada por medição: escolhe a escala e prova o alinhamento.

`layout.py` põe cada token na coluna proporcional ao seu x medido — `col =
(x - x0) / scale` — e só o empurra para a direita se aquela coluna já estiver
ocupada naquela linha. Empurrão é o ÚNICO jeito de o acorde sair de cima da
sílaba, então a conta que importa é quantos tokens foram empurrados.

Qual escala escolher, já que `scale` é px por coluna:

  escala MAIOR  -> menos colunas -> linha estreita, mas os tokens se aproximam
                   e passam a transbordar um no outro: empurra.
  escala MENOR  -> mais colunas -> ninguém transborda, mas a linha fica larga
                   e o tablet obriga a rolar de lado.

Logo a boa é a MAIOR escala que ainda não empurra ninguém. O teto vem do próprio
impresso: dois tokens separados por G px comportam um de N caracteres só se
scale <= G/N — e como `layout` exige um espaço entre tokens, um par de barras
`/ /` a 37px de distância já limita a escala a ~18. É por isso que a escala é
por música e não por livro.

Uso:
  check_cifra.py <modulo_do_livro> [título parcial]
"""
import importlib
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def place(chords, lyrics, x0, scale):
    """Coloca um sistema e devolve (linha_acordes, linha_letra, colocações).

    Mesma regra de `layout.layout_system` — replicada aqui porque a conferência
    precisa da coluna PEDIDA e da RECEBIDA de cada token, que o layout descarta.
    """
    toks = [(x, t, 'c') for x, t in chords] + [(x, t, 'l') for x, t in lyrics]
    toks.sort(key=lambda z: (z[0], z[2]))
    free = {'c': 0, 'l': 0}
    out = {'c': '', 'l': ''}
    postos = []
    for x, t, k in toks:
        quer = int(round((x - x0) / scale))
        col = max(quer, free[k])
        out[k] += ' ' * (col - len(out[k])) + t
        free[k] = len(out[k]) + 1
        postos.append((k, t, quer, col))
    return out['c'].rstrip(), out['l'].rstrip(), postos


def empurroes(systems, x0, scale):
    fora = []
    for n, (chords, lyrics) in enumerate(systems, 1):
        for k, t, quer, col in place(chords, lyrics, x0, scale)[2]:
            if col != quer:
                fora.append((n, 'acorde' if k == 'c' else 'letra', t, quer, col))
    return fora


def maior_scale(systems, x0, lo=14.0, hi=30.0, passo=0.1):
    """Maior escala sem empurrão nenhum, e a largura da linha nela."""
    s, achou = hi, None
    while s >= lo:
        if not empurroes(systems, x0, s):
            achou = round(s, 2)
            break
        s -= passo
    if achou is None:
        return None, None
    largura = max(len(l) for sy in systems for l in place(*sy, x0, achou)[:2])
    return achou, largura


def confere(song):
    systems, x0 = song['systems'], song.get('x0', 0)
    print(f"\n=== {song['title']} — {len(systems)} sistemas, x0={x0} ===")
    ideal, larg = maior_scale(systems, x0)
    if ideal is None:
        print('  !! nenhuma escala entre 14 e 30 evita empurrão — conferir a transcrição')
    else:
        print(f'  maior escala sem empurrão: {ideal}  (linha mais larga: {larg} colunas)')
    usada = song.get('scale')
    if usada is None:
        print('  módulo não fixa "scale" — layout.py usaria o padrão 19.0')
        usada = 19.0
    fora = empurroes(systems, x0, usada)
    print(f'  escala em uso: {usada} -> {len(fora)} token(s) empurrado(s)')
    for n, tipo, t, quer, col in fora[:12]:
        print(f'    sistema {n:2d} {tipo:6} {t!r}: pediu coluna {quer}, ficou em {col}')
    if len(fora) > 12:
        print(f'    ... e outros {len(fora) - 12}')

    print('  cada acorde e o que ficou embaixo dele:')
    for n, (chords, lyrics) in enumerate(systems, 1):
        c, l, postos = place(chords, lyrics, x0, usada)
        pares = []
        for k, t, _, col in postos:
            if k != 'c' or t.strip('/') == '':
                continue
            sob = l[col:col + max(len(t), 4)].strip() if col < len(l) else '·fim·'
            pares.append(f'{t}→{sob or "·vazio·"}')
        print(f'    {n}: ' + '  '.join(pares))
    return len(fora)


def main():
    mod = importlib.import_module(f'books.{sys.argv[1]}')
    alvo = sys.argv[2].lower() if len(sys.argv) > 2 else ''
    achou = 0
    for s in mod.SONGS:
        if 'systems' not in s or (alvo and alvo not in s['title'].lower()):
            continue
        achou += 1
        confere(s)
    if not achou:
        print('nenhuma música com "systems" (medida por pixel) neste módulo')


if __name__ == '__main__':
    main()
