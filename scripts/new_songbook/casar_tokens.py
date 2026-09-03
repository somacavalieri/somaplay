#!/usr/bin/env python3
"""Casa o texto transcrito de uma cifra com os x medidos por `measure_cifra.py`.

Por que existe: a medição dá a POSIÇÃO de cada token e o olho dá o TEXTO (o OCR
de acorde não presta). Juntar as duas coisas na mão, banda a banda, é onde o erro
entra — some um acorde, entra uma barra a mais, e o alinhamento inteiro escorrega
sem ninguém perceber. Aqui a contagem é conferida: se o número de textos não bate
com o número de tokens medidos na banda, o programa PARA e diz qual banda.

Entrada 1: a saída de `measure_cifra.py` (as linhas `[(x, 'ocr'), ...]`).
Entrada 2: um arquivo de transcrição, uma linha por banda, tokens separados por
espaço, na ordem em que aparecem na página. Três marcas:

    _        descarta o token medido nesta posição (mancha do scan, pausa
             musical, marca de repetição — o que não é acorde nem letra)
    palavra+ a palavra ocupa DOIS tokens medidos (o traço de melisma às vezes
             tem vão e a medição parte "Cho——rou" em dois); '++' para três
    texto@N  força a coluna N e NÃO consome token medido. Serve para o caso
             inverso: duas barras vizinhas que a medição fundiu numa só. Não
             existe folga de gap que sirva para a página toda — a distância
             entre duas barras e a distância entre "E7" e "/G#" caem na mesma
             faixa — então quem decide é o olho, e fica registrado no arquivo.
    #        linha de comentário; linha vazia = banda sem token (pula)

Uso:
  python3 scripts/new_songbook/casar_tokens.py <medida.txt> <transcricao.txt> \\
      [--x0 N] [--nome VAR]
Imprime o literal Python de `systems` pronto para colar no módulo do livro.
Sem --x0, usa o menor x de todos os tokens (= margem esquerda do bloco).
"""
import argparse
import ast
import re
import sys


def le_medida(path):
    """[[(x, ocr), ...], ...] — uma lista por banda, na ordem da página."""
    bandas = []
    for linha in open(path, encoding='utf-8'):
        s = linha.strip()
        if s.startswith('[('):
            bandas.append([(int(x), t) for x, t in ast.literal_eval(s)])
    return bandas


def le_transcricao(path):
    out = []
    for linha in open(path, encoding='utf-8'):
        s = linha.rstrip('\n')
        if s.strip().startswith('#'):
            continue
        out.append(s.split())
    while out and not out[-1]:
        out.pop()
    return out


def casa(banda, textos, n):
    """Aplica '_' e '+' e devolve [(x, texto), ...]."""
    saida, i = [], 0
    for t in textos:
        # a coluna explícita não consome token medido, então vem antes da guarda
        if '@' in t:
            texto, col = t.rsplit('@', 1)
            saida.append((int(col), texto))
            continue
        if i >= len(banda):
            sys.exit(f'banda {n}: acabaram os tokens medidos em {t!r} '
                     f'({len(banda)} medidos, {len(textos)} textos)')
        if t == '_':
            i += 1
            continue
        extra = len(t) - len(t.rstrip('+'))
        saida.append((banda[i][0], t.rstrip('+')))
        i += 1 + extra
    if i != len(banda):
        sobra = [t for _, t in banda[i:]]
        sys.exit(f'banda {n}: sobraram {len(banda) - i} token(s) medido(s) '
                 f'sem texto — OCR deles: {sobra}')
    return saida


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('medida')
    ap.add_argument('transcricao')
    ap.add_argument('--x0', type=int, default=None)
    ap.add_argument('--nome', default='SISTEMAS')
    a = ap.parse_args()

    bandas = le_medida(a.medida)
    textos = le_transcricao(a.transcricao)
    # faltar linha no fim é normal: as últimas bandas costumam ser o filete do
    # rodapé e o número da página. Sobrar linha é erro de transcrição.
    if len(textos) > len(bandas):
        sys.exit(f'{len(bandas)} bandas medidas x {len(textos)} linhas de transcrição — '
                 f'sobrou transcrição')
    textos += [[]] * (len(bandas) - len(textos))

    # banda só de '_' (mancha do scan) casa em lista vazia e sai da conta
    casadas = [c for c in (casa(b, t, i + 1)
                           for i, (b, t) in enumerate(zip(bandas, textos)) if t) if c]
    x0 = a.x0 if a.x0 is not None else min(x for b in casadas for x, _ in b)

    # par (acordes, letra): banda de acorde seguida da banda de letra. Uma banda
    # que só tem acorde/marca e vem sozinha (introdução) vira sistema sem letra.
    ehacorde = lambda b: all(re.match(r'^([A-G][#b]?|/|\(?[A-G])', t) or t == '/'
                             for _, t in b)
    sistemas, i = [], 0
    while i < len(casadas):
        atual = casadas[i]
        prox = casadas[i + 1] if i + 1 < len(casadas) else None
        if prox is not None and ehacorde(atual) and not ehacorde(prox):
            sistemas.append((atual, prox)); i += 2
        else:
            sistemas.append((atual, [])); i += 1

    print(f'{a.nome} = [')
    for ac, le in sistemas:
        print('    ([' + ', '.join(f'({x - x0}, {t!r})' for x, t in ac) + '],')
        print('     [' + ', '.join(f'({x - x0}, {t!r})' for x, t in le) + ']),')
    print(']')
    print(f'# x0 usado: {x0}; {len(sistemas)} sistema(s), '
          f'{sum(1 for _, le in sistemas if not le)} sem letra', file=sys.stderr)


if __name__ == '__main__':
    main()
