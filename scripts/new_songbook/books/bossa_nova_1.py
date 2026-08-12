# Songbook Bossa Nova 1 (Almir Chediak) — chords/-new-songbook/Bossa Nova 1 - Almir Chediak/
#
# ATENÇÃO — o offset livro->PDF NÃO é constante neste livro:
#   Consolação          livro  64 -> PDF  60  (offset -4)
#   Samba de uma nota só livro 120 -> PDF 117  (offset -3)
# Confirmar a página abrindo o PDF antes de extrair; ver INDICE.md na pasta do livro.

BOOK = 'bossa-nova-1'
FOLDER = ('/Users/somacavalieri/Library/CloudStorage/GoogleDrive-somacavalieri@gmail.com/'
          'My Drive/_claude/somaplay/chords/-new-songbook/Bossa Nova 1 - Almir Chediak')

CONSOLACAO_TEXTO = """Dm7 / / / / / / /
Melhor era tudo se acabar
Dm7 / / / / / / /
Melhor era tudo se acabar
/ Am7 / Dm7
Se não tivesse o amor
/ Am7 / Dm7
Se não tivesse essa dor
/ Am7 / Dm7
E se não tivesse o sofrer
/ Am7 / Dm7
E se não tivesse o chorar
Dm7 / / / / / / /
Melhor era tudo se acabar
Dm7 / / / / / / /
Melhor era tudo se acabar
Em7(b5) / A7 / Dm7
Eu amei, amei demais
Dm7 / / / /
O que sofri por causa do amor
Dm7 / /
Ninguém sofreu
Em7(b5) / A7 / Dm7
Eu chorei, perdi a paz
Dm7 / / /
Mas o que eu sei
Dm7 / / / / /
É que ninguém nunca teve mais
Am7 / Dm7
Mais do que eu"""

# --- Samba de uma nota só (livro 120, PDF 117) ---
# Tokens medidos por pixel na página renderizada a 300 dpi (x = borda esquerda de
# cada token). x0 = 78 é a margem do bloco de cifra. Conferido: a contagem de
# acordes, barras e grupos de letra medida bate com a leitura em todos os 7 sistemas.
SAMBA_UMA_NOTA_X0 = 78
SAMBA_UMA_NOTA_SISTEMAS = [
    ([(146, 'Bm7'), (240, '/'), (385, 'Bb7(13)'), (586, '/'), (766, 'Am7(11)'), (998, '/'),
      (1063, 'Ab7(#11)'), (1298, '/'), (1507, 'Bm7'), (1630, '/'), (1727, 'Bb7(13)'),
      (1928, '/'), (2122, 'Am7(11)')],
     [(78, 'Eis aqui este sambinha'), (664, 'Feito numa'), (976, 'nota só'),
      (1376, 'Outras notas vão entrar'), (2005, 'Mas a base')]),
    ([(110, '/'), (197, 'Ab7(#11)'), (418, '/'), (573, 'Dm7'), (726, '/'), (808, 'Db7(9)'),
      (984, '/'), (1208, 'C7M(9)'), (1412, '/'), (1477, 'F7(13)'), (1636, '/'),
      (1872, 'Bm7'), (2026, 'Bb7'), (2123, 'Am7(11)')],
     [(80, 'é uma só'), (482, 'Esta outra é consequência'), (1047, 'Do que acabo'),
      (1391, 'de dizer'), (1700, 'Como eu sou'), (1996, 'a consequência')]),
    ([(117, '/'), (165, 'Ab7(#11)'), (402, '/'), (475, 'G6'), (560, '/'), (616, 'Cm7'),
      (903, '/'), (1046, 'F7(9)'), (1373, '/'), (1612, 'Bb7M'), (1759, '/'), (1995, 'Bb6'),
      (2112, '/'), (2168, 'Bbm7')],
     [(81, 'Inevitável'), (381, 'de você'), (617, 'Quanta gente existe por aí'),
      (1179, 'Que fala tanto e não diz nada'), (1816, 'Ou quase nada'), (2166, 'Já')]),
    ([(232, '/'), (486, 'Eb7(9)'), (836, '/'), (1085, 'Ab7M'), (1280, '/'), (1606, 'Am7(b5)'),
      (1849, 'Ab7(#11)'), (2201, 'Bm7')],
     [(82, 'me utilizei de toda a escala'), (694, 'E no final não sobrou nada'),
      (1382, 'Não deu em nada'), (2110, 'E voltei')]),
    ([(185, '/'), (274, 'Bb7(13)'), (457, '/'), (688, 'Am7(11)'), (918, '/'),
      (989, 'Ab7(#11)'), (1206, '/'), (1413, 'Bm7'), (1623, '/'), (1712, 'Bb7(13)'),
      (1895, '/'), (2124, 'Am7(11)')],
     [(83, 'pra minha nota'), (516, 'Como eu volto'), (881, 'pra você'),
      (1265, 'Vou cantar com a minha nota'), (1954, 'Como eu gosto')]),
    ([(105, '/'), (176, 'Ab7(#11)'), (402, '/'), (622, 'Dm7'), (770, '/'), (866, 'Db7(9)'),
      (1041, '/'), (1228, 'C7M(9)'), (1486, '/'), (1555, 'F7(13)'), (1720, '/'),
      (1876, 'Bb6'), (2030, '/'), (2136, 'A7')],
     [(84, 'de você'), (470, 'E quem quer todas as notas'), (1109, 'Ré mi fá'),
      (1415, 'sol lá si dó'), (1788, 'Fica sempre sem nenhuma')]),
    ([(108, '/'), (189, 'Ab7M'), (398, '/'), (570, 'G6')],
     [(84, 'Fique numa'), (370, 'nota'), (570, 'só')]),
]

# Formas da grade de diagramas do livro (18 caixas, 2 fileiras de 9), lidas por
# pixel e CONFERIDAS pelo teste das notas: para cada casa-base candidata de 1 a 13,
# aceita a que faz as notas do voicing caberem no nome do acorde com a fundamental
# no baixo. 16 das 18 fecharam com solução única.
# frets = [Mi grave, Lá, Ré, Sol, Si, Mi agudo], casa ABSOLUTA, -1 = não toca, 0 = solta.
# FORA daqui, de propósito (ver INDICE.md / PROGRESSO-EXTRACAO.md):
#   G6   desenhado [3,-1,2,-1,4,3] -> soa Sol, Mi, Ré#  (não é G6; cai no catálogo do app)
#   Bbm7 desenhado [-1,1,-1,0,2,1] -> soa Sib, Sol, Réb, Fá (isso é Bbm6, não Bbm7)
SAMBA_UMA_NOTA_DIGITACOES = {
    'Bm7':      {'frets': [-1, 2, -1, 2, 3, 2]},
    'Bb7(13)':  {'frets': [-1, 1, -1, 1, 3, 3]},
    'Am7(11)':  {'frets': [5, -1, 5, 5, 3, -1]},
    'Ab7(#11)': {'frets': [4, -1, 4, 5, 3, -1]},
    'Dm7':      {'frets': [-1, -1, 0, 2, 1, 1]},
    'Db7(9)':   {'frets': [-1, 4, 3, 4, 4, -1]},
    'C7M(9)':   {'frets': [-1, 3, 2, 4, 3, -1]},
    'F7(13)':   {'frets': [1, -1, 1, 2, 3, -1]},
    'Bb7':      {'frets': [-1, 1, 3, 1, 3, 1]},
    'Cm7':      {'frets': [-1, 3, -1, 3, 4, 3]},
    'F7(9)':    {'frets': [-1, -1, 3, 2, 4, 3]},
    'Bb7M':     {'frets': [-1, 1, 3, 2, 3, -1]},
    'Bb6':      {'frets': [-1, 1, 3, 0, 3, -1]},
    'Eb7(9)':   {'frets': [-1, -1, 1, 0, 2, 1]},
    'Ab7M':     {'frets': [4, -1, 5, 5, 4, -1]},
    'Am7(b5)':  {'frets': [5, -1, 5, 5, 4, -1]},
}

SONGS = [
    {
        'title': 'Consolação',
        'artist': 'Baden Powell',
        'tom': 'Dm',
        'estilo': 'Bossa Nova',
        'fonte': 'Songbook',
        'pagina_livro': 64,
        'pagina_pdf': 60,
        'texto': CONSOLACAO_TEXTO,
        'acordes': ['Dm7', 'Am7', 'Em7(b5)', 'A7'],
    },
    {
        'title': 'Samba de uma nota só',
        'artist': 'Tom Jobim',
        'tom': 'G',
        'estilo': 'Bossa Nova',
        'fonte': 'Songbook',
        'pagina_livro': 120,
        'pagina_pdf': 117,
        'systems': SAMBA_UMA_NOTA_SISTEMAS,
        'x0': SAMBA_UMA_NOTA_X0,
        'acordes': ['Bm7', 'Bb7(13)', 'Am7(11)', 'Ab7(#11)', 'Dm7', 'Db7(9)', 'C7M(9)',
                    'F7(13)', 'Bb7', 'G6', 'Cm7', 'F7(9)', 'Bb7M', 'Bb6', 'Bbm7',
                    'Eb7(9)', 'Ab7M', 'Am7(b5)', 'A7'],
        'digitacoes': SAMBA_UMA_NOTA_DIGITACOES,
    },
]
