"""Converte tokens MEDIDOS POR PIXEL na página do songbook em cifra de texto.

Por que medir em vez de ler no olho: numa cifra de texto o acorde fica sobre a
sílaba pela COLUNA DE CARACTERE, então errar a coluna troca a sílaba. Ler a
posição no olho erra; medir o x de cada token na página e converter para coluna
reproduz o desenho impresso.

Cada sistema é um par (acordes, letra), e cada token é `(x_em_pixels, texto)`.
`SCALE` é quantos pixels da página valem uma coluna de caractere — calibrado
dividindo a largura em pixels de uma frase pelo seu número de caracteres
(~19 px/coluna a 300 dpi nos songbooks Lumiar).

Colocação gulosa em ordem de x: cada token quer a coluna proporcional ao seu x,
e só é empurrado para a direita se a coluna já estiver ocupada NAQUELA linha.
Escala única sem empurrão estica a linha inteira por causa de um par apertado.
"""

SCALE = 19.0


def layout_system(chords, lyrics, x0, scale=SCALE):
    """(acordes, letra) -> (linha_de_acordes, linha_de_letra) em colunas."""
    toks = [(x, t, 'c') for x, t in chords] + [(x, t, 'l') for x, t in lyrics]
    toks.sort(key=lambda z: (z[0], z[2]))
    free = {'c': 0, 'l': 0}
    out = {'c': '', 'l': ''}
    for x, t, k in toks:
        col = max(int(round((x - x0) / scale)), free[k])
        out[k] += ' ' * (col - len(out[k])) + t
        free[k] = len(out[k]) + 1
    return out['c'].rstrip(), out['l'].rstrip()


def build_text(systems, x0, scale=SCALE):
    """Lista de (acordes, letra) -> texto da cifra, um sistema por par de linhas.

    Sistema sem letra (instrumental) sai como linha só de acorde.
    """
    blocos = []
    for chords, lyrics in systems:
        c, l = layout_system(chords, lyrics, x0, scale)
        blocos.append(c if not l else f'{c}\n{l}')
    return '\n'.join(blocos)
