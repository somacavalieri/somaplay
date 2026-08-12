# Songbook Dorival Caymmi vol. 2 (Almir Chediak / Lumiar) — 49 músicas,
# 132 págs no PDF.
# chords/-new-songbook/Dorival Caymmi Vol 2 - Almir Chediak/
#     350659266-153913356-Songbook-Dorival-Vol-2-pdf.pdf
#
# MAPA DE PÁGINAS — offset único e constante: pdf = livro − 1.
# Não é extrapolação de uma calibração (erro do Bossa Nova 1): os fólios impressos
# das 132 páginas foram lidos um por um, o offset não muda em ponto nenhum, não há
# página ausente, duplicada nem em branco (também conferido por hash), e as 49
# músicas foram confirmadas TÍTULO A TÍTULO na página prevista. Uma varredura da
# faixa de título das 104 páginas do miolo (pdf 26–129) não achou nenhuma música
# fora do índice nem nenhuma faltando.
#
# ATENÇÃO: a ordem alfabética do índice impresso NÃO é a ordem física do livro.
# 'Cantiga de cego' abre o miolo na p.27, e João Valentão (45), Marina (67),
# O mar (87), Pescaria (99) e Severo do pão (119) também caem fora da sequência.
# Usar INDICE (abaixo), que está em ordem de página.
#
# Índice legível para acompanhar a extração: <pasta do livro>/INDICE.md

BOOK = 'caymmi-vol2'
FOLDER = ('/Users/somacavalieri/Library/CloudStorage/GoogleDrive-somacavalieri@gmail.com/'
          'My Drive/_claude/somaplay/chords/-new-songbook/'
          'Dorival Caymmi Vol 2 - Almir Chediak')
PDF = f'{FOLDER}/350659266-153913356-Songbook-Dorival-Vol-2-pdf.pdf'

# Mesmo scan, página a página (conferido por correlação nas 132), reamostrado para
# 902×1241 (~106 dpi). Com ~9 px de altura de linha não dá para medir cifra por
# pixel — fica só como cópia leve. Sempre usar PDF.
PDF_BAIXA = f'{FOLDER}/616494339-songbook-dorival-caymmi-vol-2-pdf.pdf'

OFFSET = -1
PRIMEIRA_PAGINA_LIVRO = 27    # Cantiga de cego, 1ª música
ULTIMA_PAGINA_LIVRO = 129     # fim de 'Você não sabe amar'; a p.130 abre a Discografia


def pdf_page(livro):
    """Página do PDF (1-based) para uma página do livro."""
    if not 2 <= livro <= 133:
        raise ValueError(f'página {livro} fora do scan (livro 2–133)')
    return livro + OFFSET


# Índice completo, em ORDEM DE PÁGINA (= ordem de extração).
# (título, 1ª página do livro, última, compositores)
#
# Títulos e compositores lidos do bloco de título da PÁGINA DA MÚSICA, não do
# índice impresso — os dois divergem em duas entradas:
#   índice 'Cala a boca, menino'   → página 'Cala boca, menino'
#   índice 'Você já foi à Bahia?'  → página 'Você já foi à Bahia'
INDICE = [
    ('Cantiga de cego', 27, 27, 'Dorival Caymmi e Jorge Amado'),
    ('Adeus', 28, 29, 'Dorival Caymmi'),
    ('Afoxé', 30, 31, 'Dorival Caymmi'),
    ('A jangada voltou só', 32, 34, 'Dorival Caymmi'),
    ('Cala boca, menino', 35, 35, 'Dorival Caymmi'),
    ('Cantiga', 36, 37, 'Dorival Caymmi'),
    ('Desde ontem', 38, 39, 'Dorival Caymmi'),
    ('Dois de fevereiro', 40, 41, 'Dorival Caymmi'),
    ('Dora', 42, 44, 'Dorival Caymmi'),
    ('João Valentão', 45, 47, 'Dorival Caymmi'),
    ('É doce morrer no mar', 48, 49, 'Dorival Caymmi e Jorge Amado'),
    ('E eu sem Maria', 50, 51, 'Dorival Caymmi e Alcir Pires Vermelho'),
    ('Essa Nega Fulô', 52, 53,
     'Dorival Caymmi e Osvaldo Santiago (sobre poema de Jorge Lima)'),
    ('Eu não tenho onde morar', 54, 55, 'Dorival Caymmi'),
    ('Fiz uma viagem', 56, 57, 'Dorival Caymmi'),
    ('História de Pescadores — I e VI: Canção da partida', 58, 59, 'Dorival Caymmi'),
    ('História de Pescadores — II: Adeus da esposa', 60, 60, 'Dorival Caymmi'),
    ('História de Pescadores — III: Temporal', 61, 63, 'Dorival Caymmi'),
    ('História de Pescadores — IV: Cantiga da noiva', 64, 65, 'Dorival Caymmi'),
    ('História de Pescadores — V: Velório', 66, 66, 'Dorival Caymmi'),
    ('Marina', 67, 69, 'Dorival Caymmi'),
    ('Horas', 70, 71, 'Dorival Caymmi'),
    ('Itapoã', 72, 73, 'Dorival Caymmi'),
    ('Morena do mar', 74, 75, 'Dorival Caymmi'),
    ('Na cancela', 76, 77, 'Dorival Caymmi'),
    ('Não tem solução', 78, 79, 'Dorival Caymmi e Carlos Guinle'),
    ('Nem eu', 80, 81, 'Dorival Caymmi'),
    ('Ninguém sabe', 82, 83, 'Dorival Caymmi e Carlos Guinle'),
    ('O dengo que a nega tem', 84, 86, 'Dorival Caymmi'),
    ('O mar', 87, 89, 'Dorival Caymmi'),
    ('O que é que a baiana tem?', 90, 91, 'Dorival Caymmi'),
    ('Oração de Mãe Menininha', 92, 93, 'Dorival Caymmi'),
    ('O samba da minha terra', 94, 95, 'Dorival Caymmi'),
    ('Peguei um "Ita" no Norte', 96, 98, 'Dorival Caymmi'),
    ('Pescaria (Canoeiro)', 99, 101, 'Dorival Caymmi'),
    ('Por quê?', 102, 103, 'Dorival Caymmi'),
    ('Quem vem pra beira do mar', 104, 105, 'Dorival Caymmi'),
    ('Requebre que eu dou um doce', 106, 107, 'Dorival Caymmi'),
    ('Rosa morena', 108, 109, 'Dorival Caymmi'),
    ('Santa Clara clareou', 110, 111, 'Dorival Caymmi'),
    ('São Salvador', 112, 113, 'Dorival Caymmi'),
    ('Sargaço mar', 114, 115, 'Dorival Caymmi'),
    ('Saudade de Itapoã', 116, 118, 'Dorival Caymmi'),
    ('Severo do pão', 119, 119, 'Dorival Caymmi'),
    ('Só louco', 120, 121, 'Dorival Caymmi'),
    ('Sodade matadera', 122, 123, 'Dorival Caymmi'),
    ('Vatapá', 124, 125, 'Dorival Caymmi'),
    ('Você já foi à Bahia', 126, 127, 'Dorival Caymmi'),
    ('Você não sabe amar', 128, 129, 'Dorival Caymmi, Carlos Guinle e Hugo Lima'),
]

# Artista no app: 'Dorival Caymmi' nas 49, inclusive nas 6 em parceria (Jorge
# Amado, Alcir Pires Vermelho, Osvaldo Santiago, Carlos Guinle, Hugo Lima) — mesma
# decisão do Caetano vol. 2 e do Chico vol. 1: senão a lente de Artistas quebra o
# songbook em seis artistas. O crédito completo do livro fica em INDICE.
ARTISTA = 'Dorival Caymmi'

# 'História de Pescadores' é uma suíte que o livro trata como CINCO músicas
# separadas — página, título e grade de diagramas próprios em cada uma. Só a
# primeira traz o cabeçalho 'HISTÓRIA DE PESCADORES' acima do título. Entram como
# cinco músicas com o nome da suíte no título, senão viram cinco entradas soltas e
# sem contexto na lista de músicas.

# --- O samba da minha terra (livro 94–95, PDF 93–94) ---
# O bloco letra+acordes ocupa SÓ a p.94; a p.95 é a pauta melódica e o Copyright.
#
# Tokens MEDIDOS POR PIXEL com `measure_cifra.py`, a 300 dpi. Esta página exigiu
# dois cuidados que as outras do livro também vão exigir:
#
#  1. **recortar a folha branca antes de medir.** A faixa preta da tampa do
#     scanner é tinta contínua e costura a linha de acorde na de letra — medindo
#     a página inteira saem 15 bandas em vez de 26, uma delas de 1166 px.
#  2. **deskew por página.** Esta tem +1,06°, que ao longo dos ~2000 px do bloco
#     desloca a linha em ~37 px — mais que a altura de uma linha de texto.
#
# Mesmo limpa e desentortada, dois sistemas (11 e 12) saem com acorde e letra
# grudados: o acento do 'É' da letra encosta na barra '/' da linha de acorde e não
# sobra linha vazia entre as duas. Foram cortados na mão, na linha de menos tinta
# (y=1525 e y=1680 do recorte), e aí a contagem de tokens bate nas 26 linhas.
#
# Uma sujeira de scan (um ponto solto em x=1429, no sistema 3) foi descartada:
# conferida na ampliação, é grão de poeira, não caractere.
O_SAMBA_X0 = 317

# Melisma: o livro estica a sílaba com traço ("mo——le", "bo——le") e separa
# sílaba com traço curto ("cri–ei", "sepa–rei", "ca–beça"). Nos dois casos a
# palavra entra INTEIRA — o traço é recurso de gravação/diagramação, não texto, e
# a posição da sílaba já vem da medição. Mesma decisão do Chico vol. 1.
O_SAMBA_SISTEMAS = [
    ([(318, 'D7M'), (617, '/'), (917, 'Em7'), (1260, 'A7'), (1470, 'D7M'),
      (1670, 'F°'), (2009, 'Em7')],
     [(442, 'O'), (524, 'samba'), (681, 'da'), (771, 'minha'), (926, 'terra'),
      (1051, 'deixa'), (1192, 'a'), (1259, 'gente'), (1399, 'mole'),
      (1748, 'Quando'), (1932, 'se'), (2018, 'canta'), (2158, 'todo')]),
    ([(317, 'A7'), (548, 'D7M'), (756, 'F°'), (1096, 'Em7'), (1354, 'A7'),
      (1589, 'D7M'), (1981, '/')],
     [(318, 'mundo'), (484, 'bole'), (834, 'Quando'), (1016, 'se'), (1099, 'canta'),
      (1237, 'todo'), (1361, 'mundo'), (1524, 'bole'), (1792, 'O'), (1885, 'samba'),
      (2043, 'da'), (2134, 'minha')]),
    ([(319, 'Em7'), (655, 'A7'), (885, 'D7M'), (1084, 'F°'), (1453, 'Em7'),
      (1739, 'A7'), (1983, 'D7M'), (2185, 'F°')],
     [(320, 'terra'), (446, 'deixa'), (589, 'a'), (658, 'gente'), (810, 'mole'),
      (1178, 'Quando'), (1368, 'se'), (1462, 'canta'), (1612, 'todo'),
      (1746, 'mundo'), (1923, 'bole')]),
    ([(586, 'Em7'), (847, 'A7'), (1137, 'D7M'), (1431, '/'), (1680, 'F#m7(b5)'),
      (1920, '/'), (2005, 'B7(b9)')],
     [(319, 'Quando'), (503, 'se'), (588, 'canta'), (729, 'todo'), (853, 'mundo'),
      (1016, 'bole'), (1259, 'Eu'), (1356, 'nasci'), (1491, 'com'), (1614, 'o'),
      (1686, 'samba'), (2174, 'No')]),
    ([(423, '/'), (669, 'E7'), (771, '/'), (840, '/'), (1081, '/'), (1267, 'Em7'),
      (1426, '/'), (1491, 'A7'), (1787, '/'), (1934, 'D6'), (2044, '/'), (2109, '/')],
     [(320, 'samba'), (498, 'me'), (610, 'criei'), (909, 'Do'), (1011, 'danado'),
      (1179, 'do'), (1272, 'samba'), (1579, 'Nunca'), (1740, 'me'), (1842, 'separei'),
      (2176, 'Eu')]),
    ([(405, '/'), (645, 'F#m7(b5)'), (858, '/'), (922, 'B7(b9)'), (1277, '/'),
      (1519, 'E7'), (1614, '/'), (1683, '/'), (1921, '/'), (2112, 'Em7')],
     [(321, 'nasci'), (456, 'com'), (582, 'o'), (653, 'samba'), (1084, 'No'),
      (1187, 'samba'), (1362, 'me'), (1462, 'criei'), (1750, 'Do'), (1854, 'danado'),
      (2026, 'do'), (2120, 'samba')]),
    ([(326, '/'), (378, 'A7'), (669, '/'), (821, 'D6'), (1096, '/'), (1399, 'Em7'),
      (1750, 'A7'), (1964, 'D7M'), (2166, 'F°')],
     [(464, 'Nunca'), (626, 'me'), (729, 'separei'), (926, 'O'), (1007, 'samba'),
      (1162, 'da'), (1251, 'minha'), (1404, 'terra'), (1540, 'deixa'), (1681, 'a'),
      (1751, 'gente'), (1892, 'mole')]),
    ([(588, 'Em7'), (843, 'A7'), (1065, 'D7M'), (1264, 'F°'), (1597, 'Em7'),
      (1864, 'A7'), (2084, 'D7M')],
     [(321, 'Quando'), (504, 'se'), (591, 'canta'), (730, 'todo'), (844, 'mundo'),
      (1008, 'bole'), (1333, 'Quando'), (1513, 'se'), (1599, 'canta'), (1738, 'todo'),
      (1864, 'mundo'), (2029, 'bole')]),
    ([(499, '/'), (802, 'Em7'), (1139, 'A7'), (1348, 'D7M'), (1534, 'F°'),
      (1859, 'Em7'), (2116, 'A7')],
     [(322, 'O'), (404, 'samba'), (560, 'da'), (651, 'minha'), (806, 'terra'),
      (933, 'deixa'), (1072, 'a'), (1141, 'gente'), (1280, 'mole'), (1607, 'Quando'),
      (1789, 'se'), (1865, 'canta'), (1995, 'todo'), (2120, 'mundo')]),
    ([(390, 'D7M'), (591, 'F°'), (934, 'Em7'), (1197, 'A7'), (1469, 'D7M'),
      (1883, '/'), (2066, 'F#m7(b5)')],
     [(321, 'bole'), (672, 'Quando'), (855, 'se'), (940, 'canta'), (1077, 'todo'),
      (1199, 'mundo'), (1363, 'bole'), (1588, 'Quem'), (1739, 'não'), (1851, 'gosta'),
      (1990, 'do'), (2074, 'samba')]),
    ([(327, '/'), (379, 'B7(b9)'), (733, '/'), (940, 'E7'), (1035, '/'), (1091, '/'),
      (1269, '/'), (1498, 'Em7'), (1628, '/'), (1686, 'A7'), (1928, '/'), (2120, 'D6'),
      (2204, '/')],
     [(539, 'Bom'), (673, 'sujeito'), (834, 'não'), (943, 'é'), (1155, 'É'),
      (1230, 'ruim'), (1358, 'da'), (1448, 'cabeça'), (1775, 'Ou'), (1877, 'doente'),
      (2030, 'do'), (2123, 'pé')]),
    ([(326, '/'), (683, '/'), (871, 'F#m7(b5)'), (1082, '/'), (1146, 'B7(b9)'),
      (1506, '/'), (1720, 'E7'), (1815, '/'), (1904, '/'), (2080, '/')],
     [(383, 'Quem'), (537, 'não'), (649, 'gosta'), (788, 'do'), (880, 'samba'),
      (1320, 'Bom'), (1451, 'sujeito'), (1611, 'não'), (1721, 'é'), (1968, 'É'),
      (2045, 'ruim'), (2185, 'da')]),
    ([(371, 'Em7'), (521, '/'), (579, 'A7'), (826, '/'), (1026, 'D6')],
     [(321, 'cabeça'), (673, 'Ou'), (774, 'doente'), (935, 'do'), (1026, 'pé')]),
]

# Ordem da grade de diagramas do livro (fileira única de 8 caixas), que é a ordem
# em que o painel "Acordes desta música" mostra.
O_SAMBA_ACORDES = ['D7M', 'Em7', 'A7', 'F°', 'F#m7(b5)', 'B7(b9)', 'E7', 'D6']

# As 8 formas da grade, lidas por pixel a 300 dpi com `measure_diagrams.py`, e a
# casa-base resolvida pelo TESTE DAS NOTAS. **As 8 fecharam com solução única**, e
# todas em casa-base 1 — coerente com o impresso, que não traz algarismo romano em
# caixa nenhuma desta página.
#
# O `F°` só fechou depois de consertar `notas_do_nome` em `measure_diagrams.py`,
# que não conhecia o símbolo de diminuto e lia 'F°' como Fá MAIOR. A forma
# desenhada, [-1,-1,3,4,3,4] = Fá Si Ré Sol#, é F°7 exato (Sol# = Láb, Si = Dób).
#
# frets = [Mi grave, Lá, Ré, Sol, Si, Mi agudo], casa ABSOLUTA, -1 = não toca, 0 = solta.
O_SAMBA_DIGITACOES = {
    'D7M':      {'frets': [-1, -1, 0, 2, 2, 2]},   # D  A  C# F#
    'Em7':      {'frets': [-1, -1, 2, 4, 3, 3]},   # E  B  D  G
    'A7':       {'frets': [-1, 0, -1, 0, 2, 0]},   # A  G  C# E
    'F°':       {'frets': [-1, -1, 3, 4, 3, 4]},   # F  B  D  G#
    'F#m7(b5)': {'frets': [2, -1, 2, 2, 1, -1]},   # F# E  A  C
    'B7(b9)':   {'frets': [-1, 2, 1, 2, 1, -1]},   # B  D# A  C
    'E7':       {'frets': [0, -1, 0, 1, 0, -1]},   # E  D  G# B
    'D6':       {'frets': [-1, -1, 0, 2, 0, 2]},   # D  A  B  F#
}

# --- Rosa morena (livro 108–109, PDF 107–108) ---
# Bloco letra+acordes só na p.108; a p.109 é pauta melódica e Copyright.
# Mesmo tratamento da p.94: recorte da folha branca, deskew (+1,06° aqui também) e
# corte na mão dos sistemas em que acorde e letra saíram grudados.
#
# Duas manhas próprias desta página:
#
#  - **`E⁷₄ (9)` sai em DOIS tokens.** O livro imprime o 7/4 empilhado, dá um
#    espaço e só então `(9)`; a medição vê duas manchas. Os dois pares foram
#    fundidos num acorde só, `E7/4(9)`, ancorado no x do `E`. O `D⁶₉` NÃO tem esse
#    problema — ali o 6/9 empilhado encosta no D e sai como token único.
#  - Esta música é **cheia de melisma** ("Ro———sa", "More————na", "dengo———sa").
#    Como o traço não entra na cifra em texto, vários acordes que no impresso
#    ficavam sobre o traço caem sobre espaço vazio. É o esperado, não é erro de
#    alinhamento — a alternativa seria inventar caractere que o livro não tem.
ROSA_X0 = 312

ROSA_SISTEMAS = [
    ([(312, 'A7M'), (431, '/'), (533, 'A#°'), (627, '/'), (762, 'Bm7'), (872, '/'),
      (913, 'E7(9)'), (1036, '/'), (1084, 'Bm7'), (1193, '/'), (1356, 'E7(9)'),
      (1573, '/'), (1786, 'A7M'), (1984, '/'), (2036, '/'), (2087, '/'), (2141, 'C#m7')],
     [(312, 'Rosa'), (663, 'Morena'), (1233, 'Onde'), (1362, 'vais,'), (1499, 'morena'),
      (1725, 'Rosa?')]),
    ([(355, '/'), (538, 'F#7(b13)'), (842, '/'), (920, 'Bm7'), (1165, '/'),
      (1303, 'F#7(b13)'), (1673, '/'), (1868, 'Bm7'), (1986, '/'), (2101, 'E7(9)'),
      (2231, '/')],
     [(313, 'Com'), (435, 'essa'), (545, 'rosa'), (739, 'no'), (820, 'cabelo'),
      (1091, 'e'), (1150, 'esse'), (1270, 'andar'), (1503, 'de'), (1594, 'moça'),
      (1795, 'prosa')]),
    ([(388, 'Bm7'), (487, '/'), (627, 'E7(9)'), (888, '/'), (1063, 'A°'), (1135, '/'),
      (1244, 'A7M'), (1361, '/'), (1469, 'Em7(9)'), (1781, '/'), (2001, 'A7(#5)')],
     [(313, 'Morena'), (773, 'Morena'), (1003, 'Rosa'), (1412, 'Rosa'), (1699, 'Morena'),
      (1869, 'o'), (1920, 'samba'), (2221, 'tá')]),
    ([(325, '/'), (464, 'D6/9'), (537, '/'), (637, '/'), (763, '/'), (901, 'D#°'),
      (995, '/'), (1101, '/'), (1237, '/'), (1419, 'C#m7'), (1546, '/'), (1584, '/'),
      (1623, '/'), (1738, 'C#m7(b5)'), (2091, '/')],
     [(314, 'esperando'), (689, 'Esperando'), (1150, 'pra'), (1284, 'te'), (1344, 'ver'),
      (1662, 'Deixa'), (1997, 'de'), (2068, 'parte'), (2181, 'essa')]),
    ([(315, 'F#7(b13)'), (584, '/'), (742, 'Bm7'), (841, '/'), (941, '/'), (1003, '/'),
      (1179, 'Dm6'), (1280, '/'), (1330, '/'), (1424, '/'), (1655, 'C#m7'), (1783, '/'),
      (1823, 'F#7(b13)'), (2004, '/'), (2119, 'Bm7')],
     [(315, 'coisa'), (504, 'de'), (625, 'dengosa'), (987, 'Anda,'), (1117, 'Rosa'),
      (1382, 'Vem'), (1493, 'me'), (1574, 'ver'), (2048, 'Deixa')]),
    ([(432, '/'), (640, 'Dm6'), (883, '/'), (1103, 'C#m7'), (1407, '/'),
      (1602, 'F#7(b13)'), (1787, '/'), (1934, 'Bm7'), (2156, '/')],
     [(316, 'de'), (409, 'lado'), (530, 'essa'), (641, 'pose'), (768, 'Vem'), (930, 'pro'),
      (1026, 'samba,'), (1304, 'vem'), (1457, 'sambar'), (1831, 'Que'), (1941, 'o'),
      (2055, 'pessoal'), (2217, 'tá')]),
    ([(392, 'E7/4(9)'), (691, 'E7(9)'), (936, 'A6'), (1127, 'Em6/G'), (1323, 'F#7(b13)'),
      (1640, 'Bm7'), (1868, '/'), (2077, 'E7/4(9)')],
     [(318, 'cansado'), (544, 'de'), (635, 'esperar'), (1031, 'Oh,'), (1326, 'Rosa!'),
      (1535, 'Que'), (1644, 'o'), (1767, 'pessoal'), (1929, 'tá'), (2001, 'cansado'),
      (2215, 'de')]),
    ([(368, 'E7(9)'), (602, 'A6')],
     [(319, 'esperar')]),
]

# Ordem da grade de diagramas do livro: 3 fileiras de 6 caixas = 18 desenhos, mas
# 17 nomes — `E7(9)` aparece DUAS vezes (fileira 1 e fileira 3), com o mesmo
# desenho e o mesmo algarismo (VI). Duplicata do livro, não erro de leitura.
#
# `E7(#5)` está na grade mas NÃO aparece no bloco de letra+acordes: ele só é usado
# na pauta melódica da p.109 (fim da 1ª casa). Fica na lista de propósito — é o
# painel "Acordes desta música" que o livro está montando aqui, e `play.js` mostra
# `cifra.acordes` quando existe.
ROSA_ACORDES = [
    'A7M', 'A#°', 'Bm7', 'E7(9)', 'C#m7', 'F#7(b13)',
    'A°', 'Em7(9)', 'A7(#5)', 'D6/9', 'D#°', 'C#m7(b5)',
    'Dm6', 'E7/4(9)', 'A6', 'Em6/G', 'E7(#5)',
]

# As 18 caixas lidas por pixel a 300 dpi, casa-base pelo TESTE DAS NOTAS. **As 18
# fecharam com solução única.** Cruzando com o algarismo romano impresso, 17 das
# 18 concordam — e as 4 caixas sem algarismo saíram todas em casa 1, como esperado.
#
# A EXCEÇÃO é `A°`: o livro imprime **VI**, e as notas exigem **IV**. Não é dúvida
# de leitura, é erro de impressão do livro, e dá para provar sem sair da página:
# `A#°` tem o desenho relativo IDÊNTICO e está impresso em V. Como Lá é um
# semitom abaixo de Lá#, a mesma forma para A° só pode ser IV. Em VI o desenho
# soaria Si-Sol#-Ré-Fá (um B°7), que não é o acorde que a caixa nomeia.
# **Decisão: vale a casa que as notas pedem (IV).** Aqui o desenho e o nome
# concordam entre si e só o algarismo destoa — diferente do "Samba de uma nota só"
# do Bossa Nova 1, onde era o próprio desenho que soava outro acorde e por isso
# ficou de fora.
#
# frets = [Mi grave, Lá, Ré, Sol, Si, Mi agudo], casa ABSOLUTA, -1 = não toca, 0 = solta.
ROSA_DIGITACOES = {
    'A7M':      {'frets': [5, -1, 6, 6, 5, -1]},    # A  G# C# E    (livro: V)
    'A#°':      {'frets': [6, -1, 5, 6, 5, -1]},    # A# G  C# E    (livro: V)
    'Bm7':      {'frets': [7, -1, 7, 7, 7, -1]},    # B  A  D  F#   (livro: VII)
    'E7(9)':    {'frets': [-1, 7, 6, 7, 7, -1]},    # E  G# D  F#   (livro: VI)
    'C#m7':     {'frets': [-1, 4, 6, 4, 5, -1]},    # C# G# B  E    (livro: IV)
    'F#7(b13)': {'frets': [2, -1, 2, 3, 3, -1]},    # F# E  A# D    (sem algarismo)
    'A°':       {'frets': [5, -1, 4, 5, 4, -1]},    # A  F# C  D#   (livro diz VI; é IV)
    'Em7(9)':   {'frets': [-1, 7, 5, 7, 7, -1]},    # E  G  D  F#   (livro: V)
    'A7(#5)':   {'frets': [5, -1, 5, 6, 6, -1]},    # A  G  C# F    (livro: V)
    'D6/9':     {'frets': [-1, 5, 4, 4, 5, -1]},    # D  F# B  E    (livro: IV)
    'D#°':      {'frets': [-1, -1, 1, 2, 1, 2]},    # D# A  C  F#   (sem algarismo)
    'C#m7(b5)': {'frets': [-1, 4, 5, 4, 5, -1]},    # C# G  B  E    (livro: IV)
    'Dm6':      {'frets': [-1, 5, -1, 4, 6, 5]},    # D  B  F  A    (livro: IV)
    'E7/4(9)':  {'frets': [-1, 7, 7, 7, 7, -1]},    # E  A  D  F#   (livro: VII)
    'A6':       {'frets': [5, -1, 4, 6, 5, -1]},    # A  F# C# E    (livro: IV)
    'Em6/G':    {'frets': [3, -1, 2, 4, 2, -1]},    # G  E  B  C#   (sem algarismo)
    'E7(#5)':   {'frets': [0, -1, 0, 1, 1, -1]},    # E  D  G# C    (sem algarismo, 2 soltas)
}

# Músicas já transcritas. Cada entrada:
#   {'title', 'artist', 'tom', 'estilo', 'pagina_livro', 'pagina_pdf',
#    'texto' OU 'systems'+'x0'+'scale', 'acordes': [...], 'digitacoes': {...},
#    'fonte': 'Songbook'}
SONGS = [
    {
        'title': 'O samba da minha terra',
        'artist': ARTISTA,
        'tom': 'D',
        # O livro TRAZ o estilo nesta música: 'samba' impresso em itálico à
        # esquerda da 1ª pauta melódica (p.94 e p.95). Não é escolha minha.
        'estilo': 'Samba',
        'fonte': 'Songbook',
        'pagina_livro': 94,
        'pagina_pdf': 93,
        'systems': O_SAMBA_SISTEMAS,
        'x0': O_SAMBA_X0,
        # 21, não os 19 do padrão: é a MAIOR escala que ainda não empurra token
        # nenhum nos 13 sistemas (`check_cifra.py`), e escala maior = linha mais
        # estreita. Rende 92 colunas contra 101 em 19 — 9 colunas a menos de
        # rolagem lateral no tablet, sem custo de alinhamento.
        'scale': 21,
        'acordes': O_SAMBA_ACORDES,
        'digitacoes': O_SAMBA_DIGITACOES,
    },
    {
        'title': 'Rosa morena',
        'artist': ARTISTA,
        'tom': 'A',
        # Também impresso no livro: 'samba' em itálico à esquerda da 1ª pauta (p.108).
        'estilo': 'Samba',
        'fonte': 'Songbook',
        'pagina_livro': 108,
        'pagina_pdf': 107,
        'systems': ROSA_SISTEMAS,
        'x0': ROSA_X0,
        # 17.9, e não um número redondo: é a maior escala que não empurra token
        # nenhum. A partir de 18.0 o `/` que vem depois do `D6/9` (sistema 4) é
        # empurrado uma coluna — o `D⁶₉` empilhado do livro ocupa ~2 caracteres na
        # página e 5 na cifra em texto, e é essa expansão que estoura o vão. Custa
        # 7 colunas de largura (109 contra 102 em 19); o acerto de coluna vale mais.
        'scale': 17.9,
        'acordes': ROSA_ACORDES,
        'digitacoes': ROSA_DIGITACOES,
    },
]
