# Songbook "As 101 Melhores Canções do Século XX", vol. 1
# (Almir Chediak / Lumiar, 4ª edição) — 50 músicas, 159 páginas no PDF.
#
# Os dois volumes são uma obra só: 50 músicas no vol. 1 + 51 no vol. 2 = 101,
# sem nenhum título repetido entre eles. Cada volume tem lista alfabética própria
# e paginação própria, então cada um é um BOOK separado aqui.
#
# MAPA DE PÁGINAS — offset único e constante: pdf = livro − 12.
# Ao contrário do Caetano vol. 2, este scan é limpo: os fólios impressos das
# 159 páginas foram lidos um por um, o offset não muda em nenhum ponto, não há
# página ausente, fora de ordem nem duplicada (conferido também por hash), e as
# 50 músicas cobrem as páginas 15–171 sem buraco nem sobreposição.
# O scan pula as págs. 4–14 do livro (apresentação e fotos): pdf 3 = livro 15.
#
# Índice legível para acompanhar a extração: <pasta do livro>/INDICE-VOL1.md

BOOK = 'melhores-xx-vol1'
FOLDER = ('/Users/somacavalieri/Library/CloudStorage/GoogleDrive-somacavalieri@gmail.com/'
          'My Drive/_claude/somaplay/chords/-new-songbook/'
          'Songbook - As 101 Melhores Canções do século xx - Vol I -Almir Chediak vol1-2')
PDF = f'{FOLDER}/Songbook - As 101 Melhores Canções do século xx - Vol I -Almir Chediak.pdf'

OFFSET = -12
PRIMEIRA_PAGINA_LIVRO = 15
ULTIMA_PAGINA_LIVRO = 171


def pdf_page(livro):
    """Página do PDF (1-based) para uma página do livro."""
    if not PRIMEIRA_PAGINA_LIVRO <= livro <= ULTIMA_PAGINA_LIVRO:
        raise ValueError(f'página {livro} fora do conteúdo escaneado '
                         f'({PRIMEIRA_PAGINA_LIVRO}–{ULTIMA_PAGINA_LIVRO})')
    return livro + OFFSET


# Índice completo, na ordem alfabética do próprio livro (p.2 do PDF).
# (título, primeira página do livro, última página do livro, compositores, ano)
#
# Títulos e páginas: do índice impresso. Compositores e ano: do bloco de título da
# primeira página de cada música — o índice do livro NÃO traz compositor. Crédito
# transcrito como o livro imprime.
INDICE = [
    ('A banda', 15, 17, 'Chico Buarque', 1966),
    ('Admirável gado novo', 18, 21, 'Zé Ramalho', 1980),
    ('Alegria, alegria', 22, 24, 'Caetano Veloso', 1967),
    ('Amigo é pra essas coisas', 25, 29, 'Sílvio da Silva Júnior e Aldir Blanc', 1970),
    ('Amor de índio', 30, 33, 'Beto Guedes e Ronaldo Bastos', 1978),
    ('Aos pés da cruz', 34, 35, 'José Gonçalves e Marino Pinto', 1942),
    ('A paz', 36, 37, 'João Donato e Gilberto Gil', 1985),
    ('Aquarela do Brasil', 38, 42, 'Ary Barroso', 1939),
    ('Aquele abraço', 43, 47, 'Gilberto Gil', 1969),
    ('As rosas não falam', 48, 49, 'Cartola', 1976),
    ('Ave Maria no morro', 50, 52, 'Herivelto Martins', 1942),   # Índice grafa `Ave-Maria no morro`; a página da música grafa `Ave Maria no morro`
    ('Azul da cor do mar', 53, 54, 'Tim Maia', 1970),
    ('Beatriz', 55, 58, 'Edu Lobo e Chico Buarque', 1983),
    ('Brasil pandeiro', 59, 62, 'Assis Valente', 1941),
    ('Caçador de mim', 63, 65, 'Sérgio Magrão e Luís Carlos Sá', 1981),
    ('Casa de bamba', 66, 69, 'Martinho da Vila', 1969),
    ('Catavento e girassol', 70, 74, 'Guinga e Aldir Blanc', 1996),
    ('Chão de estrelas', 75, 77, 'Sílvio Caldas e Orestes Barbosa', 1937),
    ('Chuvas de verão', 78, 80, 'Fernando Lobo', 1948),
    ('Começar de novo', 81, 83, 'Ivan Lins e Vitor Martins', 1979),
    ('Comida', 84, 87, 'Sérgio Britto, Marcelo Fromer e Arnaldo Antunes', 1987),
    ('Conversa de botequim', 88, 90, 'Vadico e Noel Rosa', 1935),
    ('Copacabana', 91, 93, 'João de Barro e Alberto Ribeiro', 1946),
    ('Da cor do pecado', 94, 96, 'Bororó', 1939),
    ('Desafinado', 97, 100, 'Antonio Carlos Jobim e Newton Mendonça', 1958),
    ('Eu e a brisa', 101, 103, 'Johnny Alf', 1967),
    ('Eu só quero um xodó', 104, 105, 'Dominguinhos e Anastácia', 1973),
    ('Falsa baiana', 106, 108, 'Geraldo Pereira', 1944),
    ('Festa do interior', 109, 111, 'Moraes Moreira e Abel Silva', 1982),
    ('Foi um rio que passou em minha vida', 112, 116, 'Paulinho da Viola', 1970),
    ('Fullgás', 117, 121, 'Marina Lima e Antonio Cicero', 1984),
    ('Gente humilde', 122, 123, 'Garoto, Vinicius de Moraes e Chico Buarque', 1970),
    ('Gita', 124, 128, 'Raul Seixas e Paulo Coelho', 1974),
    ('Jura secreta', 129, 131, 'Sueli Costa e Abel Silva', 1977),
    ('Luar do sertão', 132, 133, 'Catulo da Paixão Cearense', 1914),
    ('Mania de você', 134, 135, 'Roberto de Carvalho e Rita Lee', 1980),
    ('Meu erro', 136, 138, 'Herbert Vianna', 1984),
    ('Mucuripe', 139, 141, 'Fagner e Belchior', 1972),
    ('Nada além', 142, 143, 'Custódio Mesquita e Mário Lago', 1938),
    ('O barquinho', 144, 145, 'Roberto Menescal e Ronaldo Bôscoli', 1961),   # Também no Bossa Nova 1 (livro p.108) — não importar duas vezes
    ('O cantador', 146, 147, 'Dori Caymmi e Nelson Motta', 1967),
    ('País tropical', 148, 150, 'Jorge Benjor', 1969),
    ('Pressentimento', 151, 153, 'Elton Medeiros e Hermínio Bello de Carvalho', 1968),
    ('Sá Marina', 154, 155, 'Antonio Adolfo e Tibério Gaspar', 1968),
    ('Se acaso você chegasse', 156, 157, 'Lupicínio Rodrigues e Felisberto Martins', 1938),
    ('Sonho meu', 158, 160, 'Dona Ivone Lara e Délcio Carvalho', 1979),
    ('Tarde em Itapuã', 161, 163, 'Toquinho e Vinicius de Moraes', 1971),
    ('Travessia', 164, 167, 'Milton Nascimento e Fernando Brant', 1967),
    ('Tristeza de nós dois', 168, 169, 'Maurício Einhorn, Durval Ferreira e Bebeto', 1961),
    ('Valsa de uma cidade', 170, 171, 'Ismael Neto e Antônio Maria', 1954),
]

# ARTISTA — decidido: o PRIMEIRO compositor creditado.
# Esta é uma coletânea: as 50 músicas têm 50 compositores distintos, então o
# truque do Caetano vol. 2 (um artista só para o livro inteiro) não serve. Cada
# música entra sob o primeiro nome do crédito, como bossa_nova_1.py fez com
# 'Baden Powell'. A lente de Artistas fica com muitos nomes de 1 música só, e
# isso é aceitável de propósito: make_somaplay reaproveita artista por NOME, logo
# 'Chico Buarque' daqui funde com o songbook de Chico, e esses artistas vão
# enchendo conforme entram mais livros. O crédito completo fica em INDICE.
def artista_de(compositores):
    """Artista no app a partir do crédito do livro: o primeiro compositor."""
    return compositores.split(' e ')[0].split(',')[0].strip()


# ---------------------------------------------------------------------------
# Cifras medidas por pixel (300 dpi). Cada token é (x da borda esquerda, texto):
# o x sai de `tokens_skel.py`, o texto é lido na imagem anotada que ele gera.
#
# Duas coisas deste livro que valem para as outras 49:
#   * `--marg 0.015`, não o padrão 0.04. A margem de 4% existe por causa da
#     espiral de fichário de outros scans; aqui ela come 99px e a página tem
#     tinta até x=2433 — cortava a ÚLTIMA barra de cinco dos sete sistemas.
#   * `scale` ≈ 21, não 19. O corpo do texto deste livro é maior que o do
#     Bossa Nova 1; com 19 os tokens transbordam e empurram o vizinho, que é o
#     único jeito de o acorde sair de cima da sílaba. Ver `check_cifra.py`.
# ---------------------------------------------------------------------------

# --- As rosas não falam (livro 48, PDF 36) ---
# 7 sistemas, tudo numa página só (a p.49 é só partitura). O par `//` colado
# aparece impresso assim mesmo — o parser do app trata `/+` como marca (MARK em
# chords.js), então não vira acorde nem polui a grade de acordes.
# Um respingo de 6px de tinta a x=2428 no sistema 2 ficou de fora: barra de
# verdade tem ~34 linhas de altura e ~100px de tinta, esse tinha 5 linhas.
ROSAS_X0 = 212
ROSAS_SISTEMAS = [
    ([(219, 'Dm'), (380, '/'), (505, '/'), (556, '/'), (597, 'Dm/C'), (908, '/'), (997, '/'),
      (1105, '/'), (1178, 'Gm6/Bb'), (1416, '/'), (1499, '/'), (1544, '/'), (1586, 'Gm'),
      (1771, '/'), (1885, '/'), (1993, '/'), (2066, 'E7/G#'), (2255, '/'), (2350, '/'),
      (2397, '/')],
     [(214, 'Bate'), (319, 'ou—tra'), (477, 'vez'), (742, 'Com'), (855, 'es—peranças'),
      (1130, 'o'), (1175, 'meu'), (1358, 'co—ração'), (1676, 'Pois'), (1796, 'já'),
      (1857, 'vai'), (1932, 'ter—minando'), (2218, 'o'), (2289, 'verão')]),
    ([(213, 'A/G'), (331, '/'), (368, '/'), (412, '/'), (451, 'Dm/F'), (597, '/'), (634, '/'),
      (673, '/'), (713, 'E7'), (784, '/'), (824, 'A7'), (897, '/'), (937, 'Dm'), (1102, '/'),
      (1200, '/'), (1250, '/'), (1289, 'Dm/C'), (1572, '/'), (1665, '/'), (1734, '/'),
      (1853, 'E7/B'), (1985, '/'), (2083, '/'), (2127, '/'), (2168, 'E7'), (2321, '/')],
     [(399, 'Enfim'), (924, 'Volto'), (1043, 'ao'), (1124, 'jardim'), (1427, 'Com'),
      (1533, 'a'), (1596, 'certeza'), (1760, 'que'), (1845, 'devo'), (2003, 'chorar'),
      (2229, 'Pois'), (2346, 'bem')]),
    ([(242, '/'), (386, '/'), (520, 'Gm6/Bb'), (717, '/'), (832, '/'), (877, '/'), (918, 'A7'),
      (992, '/'), (1031, '/'), (1120, '/'), (1223, 'Dm'), (1313, '/'), (1355, '/'), (1396, '/'),
      (1440, 'D7/F#'), (1600, '/'), (1643, '/'), (1685, '/'), (1730, 'Gm7'), (1848, '/'),
      (2036, '/'), (2075, '/'), (2129, 'Em7(b5)'), (2398, '/')],
     [(213, 'sei'), (296, 'que'), (418, 'não'), (514, 'queres'), (760, 'voltar'),
      (1066, 'Pa—ra'), (1218, 'mim'), (1721, 'Queixo-me'), (1946, 'às'), (2018, 'rosas'),
      (2311, 'Que')]),
    ([(286, '/'), (405, '/'), (515, 'Dm'), (614, '/'), (754, '//'), (854, 'Dm/C'), (1081, '/'),
      (1213, '/'), (1364, '/'), (1429, 'E7/B'), (1607, '/'), (1685, '//'), (1778, 'E7'),
      (1894, '/'), (2001, '/'), (2084, '/'), (2212, 'Gm6/Bb'), (2398, '/')],
     [(214, 'bobagem!'), (431, 'As'), (508, 'rosas'), (646, 'não'), (737, 'falam'),
      (1000, 'Sim—plesmente'), (1307, 'as'), (1393, 'ro———sas'), (1634, 'exalam'),
      (1840, 'O'), (1922, 'perfume'), (2111, 'que'), (2203, 'roubam')]),
    ([(298, '/'), (343, '/'), (427, 'A7'), (503, '/'), (545, '/'), (587, '/'), (631, 'Dm'),
      (795, '/'), (897, '/'), (942, '/'), (989, 'Dm/C'), (1204, '/'), (1323, '/'), (1430, '/'),
      (1591, 'Gm6/Bb'), (1789, '/'), (1896, '/'), (1961, '/'), (2008, 'Gm'), (2154, '/'),
      (2329, '/'), (2398, '/')],
     [(212, 'de'), (283, 'ti,'), (368, 'ai'), (722, 'Devias'), (875, 'vir'), (1139, 'Pa—ra'),
      (1285, 'ver'), (1368, 'os'), (1458, 'meus'), (1576, 'olhos'), (1814, 'tristonhos'),
      (2103, 'E'), (2179, 'quem'), (2303, 'sabe')]),
    ([(263, 'E7/G#'), (424, '/'), (606, '//'), (769, 'A7(b9)'), (918, '/'), (960, '/'),
      (1024, '/'), (1083, 'Dm'), (1172, '/'), (1213, '/'), (1254, '/'), (1296, 'A7'),
      (1372, '/'), (1412, '/'), (1454, '/'), (1496, 'Dm'), (1653, '/'), (1756, '/'),
      (1801, '/'), (1849, 'Dm/C'), (2058, '/'), (2177, '/'), (2297, '/')],
     [(213, 'sonhavas'), (458, 'meus'), (580, 'so—nhos'), (990, 'Por'), (1078, 'fim'),
      (1582, 'Devias'), (1733, 'vir'), (1999, 'Pa—ra'), (2148, 'ver'), (2234, 'os'),
      (2329, 'meus')]),
    ([(219, 'Gm6/Bb'), (414, '/'), (515, '/'), (578, '/'), (626, 'Gm'), (768, '/'), (945, '/'),
      (1016, '/'), (1094, 'E7/G#'), (1252, '/'), (1427, '//'), (1583, 'A7(b9)'), (1729, '/'),
      (1768, '/'), (1832, '/'), (1893, 'Bb6'), (1989, '/'), (2030, '/'), (2072, '/'),
      (2114, 'Gm6'), (2225, '/'), (2266, '/'), (2307, '/'), (2350, 'Dm')],
     [(212, 'olhos'), (436, 'tristonhos'), (716, 'E'), (793, 'quem'), (919, 'sabe'),
      (1045, 'sonhavas'), (1279, 'meus'), (1397, 'so—nhos'), (1795, 'Por'), (1884, 'fim')]),
]

# --- Brasil pandeiro (livro 59, PDF 47) ---
# 12 sistemas e a página inteira é cifra — não há partitura na p.59; ela começa
# na p.60. Duas notações do livro viraram texto aqui:
#   * `A#` com o `°` de diminuto: mantido como `A#°`. O parser do app aceita.
#   * `E` com 7 e 4 empilhados mais `(9)` -> **`E7(4/9)`**, a convenção de tensão
#     empilhada já usada no songbook do Gil (pendencias.md §4 e Esotérico).
#     No impresso o `E⁷₄` e o `(9)` estão separados por mais de 13px, então a
#     medição os deu como dois tokens; foram unidos num só, no x do primeiro.
# Um respingo de 2px a x=332 (sistema 6) saiu pelo filtro de tinta.
PANDEIRO_X0 = 120
PANDEIRO_SISTEMAS = [
    ([(325, 'A7M'), (565, 'A#°'), (795, 'Bm7'), (1054, 'E7'), (1238, 'A6'), (1312, '/'),
      (1352, 'A7'), (1426, '/'), (1655, 'Em7'), (1900, '/'), (2076, 'A7'), (2294, '/')],
     [(120, 'Chegou'), (269, 'a'), (318, 'hora'), (432, 'dessa'), (554, 'gente'),
      (677, 'bronzeada'), (891, 'mostrar'), (1050, 'seu'), (1136, 'valor'), (1448, 'Eu'),
      (1525, 'fui'), (1604, 'à'), (1654, 'Penha'), (1788, 'e'), (1838, 'pedi'), (1934, 'à'),
      (1975, 'padroeira'), (2158, 'para'), (2257, 'me')]),
    ([(222, 'D6'), (294, '/'), (333, '/'), (371, '/'), (569, 'E7'), (767, '/'), (951, '/'),
      (1096, '/'), (1259, '/'), (1403, '/'), (1624, '/'), (1663, '/'), (1892, 'Bm7'),
      (2158, '/')],
     [(122, 'ajudar'), (392, 'Salve'), (513, 'o'), (564, 'Morro'), (700, 'do'),
      (793, 'Vintém,'), (977, 'Pendu—ra-a-sai—a,'), (1341, 'eu'), (1429, 'quero'),
      (1554, 'ver'), (1689, 'Eu'), (1764, 'quero'), (1889, 'ver'), (1990, 'o'), (2039, 'Tio'),
      (2126, 'Sam'), (2228, 'tocar')]),
    ([(181, 'E7'), (490, '/'), (744, 'A7M'), (865, '/'), (911, 'G6'), (992, '/'),
      (1181, 'A7M'), (1457, 'A#°'), (1681, 'Bm7'), (1964, 'E7'), (2067, 'A6'), (2164, '/'),
      (2211, 'A7'), (2291, '/')],
     [(122, 'pandeiro'), (295, 'para'), (397, 'o'), (450, 'mundo'), (597, 'sambar'),
      (1022, 'O'), (1082, 'Tio'), (1172, 'Sam'), (1296, 'está'), (1391, 'querendo'),
      (1578, 'conhecer'), (1782, 'a'), (1833, 'nossa'), (1956, 'batuca—da')]),
    ([(264, 'Em7'), (562, '/'), (787, 'A7'), (999, '/'), (1195, 'D6'), (1294, '/'),
      (1332, '/'), (1371, '/'), (1530, 'E7'), (1653, '/'), (1780, '/'), (1919, '/'),
      (2026, '/'), (2138, '/'), (2251, '/'), (2290, '/')],
     [(123, 'Anda'), (231, 'dizendo'), (392, 'que'), (477, 'o'), (522, 'molho'), (659, 'da'),
      (731, 'baiana'), (872, 'melhorou'), (1063, 'seu'), (1149, 'pra—to'), (1397, 'Vai'),
      (1488, 'entrar'), (1618, 'no'), (1691, 'cuzcuz,'), (1849, 'aca—rajé'), (2058, 'e'),
      (2104, 'a—bará')]),
    ([(320, 'Bm7'), (626, '/'), (813, 'E7'), (1079, '/'), (1256, 'A6'), (1335, '/'),
      (1382, 'A#°'), (1476, '/'), (1574, 'Bm7'), (1688, '/'), (1798, 'E7'), (2012, '/'),
      (2158, 'C#m7')],
     [(124, 'Na'), (198, 'Casa'), (313, 'Branca'), (463, 'já'), (535, 'dançou'), (688, 'a'),
      (739, 'batucada'), (918, 'com'), (1022, 'Ioiô'), (1119, 'e'), (1169, 'Iaiá'),
      (1510, 'Brasil,'), (1680, 'esquentai'), (1877, 'vossos'), (2048, 'pandei———ros')]),
    ([(151, '/'), (240, 'F#7'), (371, '/'), (480, 'Bm7'), (637, '/'), (788, 'E7'), (940, '/'),
      (1100, 'A6'), (1172, '/'), (1210, 'F#7'), (1297, '/'), (1336, 'Bm7'), (1438, '/'),
      (1659, 'E7'), (1816, '/'), (1920, 'C#m7'), (2090, '/'), (2216, 'F#7')],
     [(125, 'I—luminai'), (316, 'os'), (400, 'terrei——ros'), (621, 'Está'), (717, 'na'),
      (781, 'hora'), (879, 'de'), (968, 'sambar'), (1334, 'Há'), (1470, 'quem'),
      (1592, 'sam—be'), (1768, 'di—feren———te'), (2075, 'Outras'), (2212, 'terras,')]),
    ([(176, '/'), (329, 'Bm7'), (491, '/'), (607, 'E7'), (793, '/'), (947, 'A7M'), (1104, '/'),
      (1145, 'A#°'), (1258, '/'), (1336, 'Bm7'), (1490, '/'), (1525, 'Dm6'), (1768, '/'),
      (1859, 'C#m7'), (2061, '/'), (2120, 'F#7'), (2293, '/')],
     [(125, 'ou—tra'), (268, 'gen——te'), (451, 'Num'), (565, 'barulho'), (725, 'de'),
      (818, 'matar,'), (1059, 'oi'), (1226, 'Batuca——da'), (1472, 'reuní'), (1632, 'vossos'),
      (1797, 'valo——res'), (2030, 'Pastorinhas'), (2250, 'e')]),
    ([(200, 'Bm7'), (339, '/'), (499, 'E7'), (791, '/'), (1008, 'A6'), (1225, '/'),
      (1358, 'A#°'), (1453, '/'), (1556, 'Bm7'), (1683, '/'), (1793, 'E7'), (2013, '/'),
      (2159, 'C#m7')],
     [(124, 'canto——res'), (376, 'Expressões'), (600, 'que'), (699, 'não'), (827, 'têm'),
      (928, 'par'), (1085, 'Oh,'), (1183, 'meu'), (1292, 'Brasil'), (1494, 'Brasil,'),
      (1671, 'esquentai'), (1874, 'vossos'), (2049, 'pandei———ros')]),
    ([(128, '/'), (208, 'F#7'), (356, '/'), (478, 'Bm7'), (698, '/'), (910, 'E7'), (1037, '/'),
      (1215, 'Em7'), (1327, '/'), (1373, 'A7'), (1453, '/'), (1556, 'D6'), (1657, '/'),
      (1767, 'Dm6'), (2013, '/'), (2159, 'C#m7')],
     [(125, 'Iluminai'), (292, 'os'), (391, 'terrei——ros'), (642, 'Que'), (751, 'nós'),
      (846, 'queremos'), (1072, 'sambar'), (1492, 'Brasil,'), (1643, 'esquentai'),
      (1878, 'vossos'), (2050, 'pandei———ros')]),
    ([(129, '/'), (209, 'F#7'), (351, '/'), (466, 'Bm7'), (674, '/'), (867, 'E7'), (989, '/'),
      (1160, 'A6'), (1234, '/'), (1274, 'E7(4/9)'), (1398, '/'), (1639, 'A7M'), (1880, 'A#°'),
      (2089, 'Bm7')],
     [(127, 'Iluminai'), (293, 'os'), (382, 'terrei——ros'), (614, 'Que'), (716, 'nós'),
      (805, 'queremos'), (1021, 'sambar'), (1420, 'Chegou'), (1581, 'a'), (1631, 'hora'),
      (1747, 'dessa'), (1863, 'gente'), (1978, 'bronzeada'), (2189, 'mostrar')]),
    ([(132, 'E7'), (303, 'A6'), (376, '/'), (416, 'A7'), (491, '/'), (733, 'Em7'), (978, '/'),
      (1162, 'A7'), (1397, '/'), (1555, 'D6'), (1630, '/'), (1670, '/'), (1709, '/'),
      (1920, 'E7'), (2114, '/'), (2298, '/')],
     [(127, 'seu'), (203, 'valor'), (522, 'Eu'), (599, 'fui'), (677, 'à'), (728, 'Penha'),
      (862, 'e'), (911, 'pedi'), (1015, 'à'), (1064, 'padroeira'), (1251, 'para'),
      (1354, 'me'), (1436, 'ajudar'), (1740, 'Salve'), (1863, 'o'), (1915, 'Morro'),
      (2051, 'do'), (2145, 'Vintém,')]),
    ([(234, '/'), (396, '/'), (531, '/'), (757, '/'), (794, '/'), (1020, 'Bm7'), (1285, '/'),
      (1533, 'E7'), (1843, '/'), (2076, 'A7M'), (2185, '/'), (2224, 'G6'), (2296, '/')],
     [(128, 'Pendu—ra-a-sai—a,'), (473, 'eu'), (562, 'quero'), (687, 'ver'), (819, 'Eu'),
      (895, 'quero'), (1019, 'ver'), (1119, 'o'), (1169, 'Tio'), (1256, 'Sam'),
      (1358, 'tocar'), (1468, 'pandeiro'), (1652, 'para'), (1751, 'o'), (1800, 'mundo'),
      (1943, 'sambar')]),
]

# --- Caçador de mim (livro 63, PDF 51) ---
# 10 sistemas com letra + uma 11ª linha SÓ de acorde no fim (sem letra embaixo),
# mantida como sistema sem letra — é assim que o livro fecha a música.
# A página inteira é cifra; a partitura começa na p.64.
#
# `F⁷₄(9)` e `Bb⁷₄(9)` -> **`F7(4/9)`** e **`Bb7(4/9)`** (convenção de tensão
# empilhada de pendencias.md). No impresso o `(9)` fica separado do corpo
# empilhado por mais de 13px, então a medição deu dois tokens por acorde; foram
# unidos no x do primeiro. São 19 ocorrências ao todo.
#
# O corte de baixo (-y1) precisou de 0.90: com 0.89 a última banda saía com 17px
# de altura em vez de 52 — a linha final de acordes vinha cortada no meio, e com
# ela os tokens saíam picados em pedaços de 8 a 30px.
#
# Melisma: onde o livro estica a sílaba com um traço longo ("lu———ta"), o número
# de travessões ficou um pouco ABAIXO da largura impressa, de propósito — token
# mais curto nunca empurra o vizinho, e é o empurrão que tira acorde de cima de
# sílaba. A perda é só cosmética, no comprimento do traço.
CACADOR_X0 = 109
CACADOR_SISTEMAS = [
    ([(117, 'Bb'), (360, '/'), (514, 'Bb7M'), (742, '/'), (853, 'F7(4/9)'), (1081, '/'),
      (1178, 'Gm'), (1269, 'Gm/F'), (1421, 'Eb7M'), (1662, '/'), (1722, 'Bb(add9)/D'),
      (2093, '/'), (2162, 'F7(4/9)'), (2283, '/')],
     [(112, 'Por'), (191, 'tanto'), (303, 'amor'), (420, 'Por'), (508, 'tanta'),
      (641, 'emoção'), (798, 'A'), (852, 'vida'), (976, 'me'), (1057, 'fez'), (1139, 'assim'),
      (1412, 'Doce'), (1541, 'ou'), (1608, 'atroz'), (1718, 'Manso'), (1974, 'ou'),
      (2040, 'feroz'), (2156, 'Eu,')]),
    ([(182, 'Bb'), (324, 'F7(4/9)'), (446, 'Bb'), (520, 'F7(4/9)'), (643, 'Bb'), (874, '/'),
      (997, 'Bb7M'), (1242, '/'), (1412, 'F7(4/9)'), (1585, '/'), (1689, 'Gm'),
      (1782, 'Gm/F'), (1933, 'Eb7M'), (2274, '/')],
     [(111, 'caçador'), (254, 'de'), (319, 'mim'), (631, 'Preso'), (749, 'à'),
      (790, 'canções'), (947, 'Entregue'), (1124, 'à'), (1165, 'paixões'), (1316, 'Que'),
      (1411, 'nunca'), (1534, 'tiveram'), (1688, 'fim'), (1932, 'Vou'), (2064, 'me'),
      (2144, 'encontrar')]),
    ([(231, 'Bb(add9)/D'), (635, '/'), (696, 'F7(4/9)'), (816, '/'), (920, 'Bb7(4/9)'),
      (1160, '/'), (1217, '/'), (1257, 'D7/F#'), (1414, 'Gm'), (1636, '/'), (1733, 'Dm/F'),
      (1981, '/'), (2088, 'Eb7M'), (2212, '/'), (2248, '/'), (2284, '/')],
     [(111, 'Longe'), (224, 'do'), (474, 'meu'), (572, 'lugar'), (688, 'Eu,'),
      (840, 'caçador'), (1063, 'de'), (1127, 'mim'), (1410, 'Nada'), (1523, 'a'),
      (1565, 'temer'), (1686, 'Senão'), (1864, 'o'), (1907, 'correr'), (2027, 'da'),
      (2088, 'lu———ta')]),
    ([(116, 'Cm7'), (314, '/'), (417, 'F7(4/9)'), (652, '/'), (751, 'Bb'), (821, 'F7(4/9)'),
      (939, 'Bb'), (1015, 'D7/F#'), (1172, 'Gm'), (1372, '/'), (1500, 'Dm/F'), (1688, '/'),
      (1841, 'Em7(b5)'), (2011, '/'), (2046, 'Eb7M'), (2177, '/'), (2217, 'Cm7')],
     [(111, 'Nada'), (213, 'a'), (256, 'fazer'), (368, 'Senão'), (531, 'esquecer'),
      (704, 'o'), (749, 'me————do'), (1173, 'Abrir'), (1293, 'o'), (1345, 'peito'),
      (1453, 'à'), (1494, 'força'), (1643, 'Numa'), (1777, 'procu—————ra'), (2208, 'Fugir')]),
    ([(169, '/'), (252, 'F7(4/9)'), (410, '/'), (601, 'Bb'), (671, 'F7(4/9)'), (810, 'Bb'),
      (886, 'F7(4/9)'), (1010, 'Bb'), (1220, '/'), (1323, 'Bb7M'), (1550, '/'),
      (1730, 'F7(4/9)'), (1963, '/'), (2078, 'Gm'), (2176, 'Gm/F')],
     [(110, 'às'), (162, 'armadilhas'), (374, 'Da'), (452, 'mata'), (558, 'escu————ra'),
      (1002, 'Longe'), (1133, 'se'), (1192, 'vai'), (1273, 'Sonhando'), (1470, 'demais'),
      (1620, 'Mas'), (1723, 'onde'), (1846, 'se'), (1911, 'chega'), (2039, 'assim?')]),
    ([(115, 'Eb7M'), (370, '/'), (561, 'Bb(add9)/D'), (969, '/'), (1035, 'F7(4/9)'),
      (1163, '/'), (1278, 'Bb7(4/9)'), (1537, '/'), (1595, '/'), (1643, 'D7/F#'),
      (1807, 'Gm'), (2039, '/'), (2140, 'Dm/F')],
     [(111, 'Vou'), (234, 'descobrir'), (415, 'o'), (460, 'que'), (553, 'me'), (814, 'faz'),
      (897, 'sentir'), (1031, 'Eu,'), (1196, 'caçador'), (1429, 'de'), (1500, 'mim'),
      (1796, 'Nada'), (1915, 'a'), (1964, 'temer'), (2089, 'Senão'), (2281, 'o')]),
    ([(180, '/'), (309, 'Eb7M'), (435, '/'), (480, '/'), (526, '/'), (574, 'Cm7'), (796, '/'),
      (901, 'F7(4/9)'), (1147, '/'), (1262, 'Bb'), (1340, 'F7(4/9)'), (1466, 'Bb'),
      (1548, 'D7/F#'), (1713, 'Gm'), (1915, '/'), (2054, 'Dm/F'), (2243, '/')],
     [(109, 'correr'), (230, 'da'), (302, 'lu———ta'), (561, 'Nada'), (681, 'a'),
      (731, 'fazer'), (847, 'Senão'), (1022, 'esquecer'), (1198, 'o'), (1250, 'me————do'),
      (1708, 'Abrir'), (1829, 'o'), (1881, 'peito'), (1994, 'à'), (2043, 'força'),
      (2202, 'Numa')]),
    ([(171, 'Em7(b5)'), (345, '/'), (387, 'Eb7M'), (525, '/'), (572, 'Cm7'), (770, '/'),
      (856, 'F7(4/9)'), (1027, '/'), (1236, 'Bb'), (1311, 'F7(4/9)'), (1472, 'Bb'),
      (1554, 'F7(4/9)'), (1692, 'Bb'), (1928, '/'), (2037, 'Bb7M'), (2267, '/')],
     [(109, 'procu—————ra'), (561, 'Fugir'), (690, 'às'), (763, 'armadilhas'), (987, 'Da'),
      (1073, 'mata'), (1190, 'escu————ra'), (1681, 'Longe'), (1825, 'se'), (1897, 'vai'),
      (1985, 'Sonhando'), (2185, 'demais')]),
    ([(220, 'F7(4/9)'), (465, '/'), (589, 'Gm'), (688, 'Gm/F'), (848, 'Eb7M'), (1125, '/'),
      (1327, 'Bb(add9)/D'), (1733, '/'), (1794, 'F7(4/9)'), (1918, '/'), (1960, '/'),
      (2001, '/'), (2116, 'Bb7(4/9)')],
     [(111, 'Mas'), (212, 'onde'), (344, 'se'), (415, 'chega'), (550, 'assim?'),
      (844, 'Vou'), (988, 'descobrir'), (1174, 'o'), (1225, 'que'), (1317, 'me'),
      (1576, 'faz'), (1660, 'sentir'), (1791, 'Eu,'), (2038, 'caçador'), (2262, 'de')]),
    ([(141, '/'), (202, '/'), (249, 'D7/F#'), (411, 'Gm'), (503, '/'), (546, 'Dm/F'),
      (701, '/'), (744, 'Eb7M'), (883, '/'), (924, '/'), (965, '/'), (1009, 'Cm7'),
      (1119, '/'), (1162, 'F7(4/9)'), (1287, '/'), (1330, 'Bb'), (1408, 'F7(4/9)'),
      (1536, 'Bb'), (1614, 'D7/F#'), (1778, 'Gm'), (1870, '/'), (1913, 'Dm/F'), (2064, '/'),
      (2107, 'Em7(b5)'), (2287, '/')],
     [(110, 'mim')]),
    # última linha do livro: só acordes, sem letra
    ([(110, 'Eb7M'), (240, '/'), (284, 'Cm7'), (394, '/'), (437, 'F7(4/9)'), (563, '/'),
      (606, 'Bb'), (685, 'F7(4/9)'), (815, 'Bb'), (893, 'D7/F#')],
     []),
]

# --- Se acaso você chegasse (livro 156, PDF 144) ---
# 7 sistemas, tudo numa página só (a p.157 é só partitura).
# Um cisco de 1px de tinta a x=227 entre os sistemas 4 e 5 (y=722 do bloco) foi
# ignorado: `tokens_skel.py` o lia como banda e isso INVERTIA a alternância
# acorde/letra de todos os sistemas seguintes. Medido em duas faixas, uma antes e
# outra depois do cisco (-y1 0.745 / -y0 0.748).
SEACASO_X0 = 132
SEACASO_SISTEMAS = [
    ([(256, 'G6'), (430, '/'), (606, '/'), (695, '/'), (911, '/'), (1069, '/'), (1281, '/'),
      (1370, '/'), (1492, 'G6/B'), (1758, '/'), (1806, 'Bb°'), (1944, '/'), (2086, 'Am7'),
      (2318, '/')],
     [(134, 'Se aca—so vo—cê chegasse'), (729, 'No meu'), (947, 'chatô'),
      (1099, 'e encontrasse'), (1404, 'Aque——la mulher'), (1895, 'que você'), (2187, 'gostou')]),
    ([(134, 'E7(b9)'), (279, '/'), (412, 'Am'), (627, 'Am(7M)'), (919, 'Am7'), (1034, '/'),
      (1186, 'D7(9)'), (1432, '/'), (1609, '/'), (1687, '/'), (1828, 'Am7'), (2086, '/'),
      (2133, 'D7(#5)'), (2317, '/')],
     [(307, 'Será'), (504, 'que ti————nha coragem'), (1066, 'De tro——car nos—sa amizade'),
      (1714, 'Por e——la que já'), (2285, 'lhe')]),
    ([(206, 'G6'), (373, '/'), (418, '/'), (463, '/'), (652, '/'), (811, '/'), (989, '/'),
      (1071, '/'), (1277, '/'), (1434, '/'), (1649, '/'), (1739, '/'), (1862, 'G6/B'),
      (2130, '/'), (2183, 'Bb°'), (2317, '/')],
     [(135, 'aban—donou'), (499, 'Se aca—so'), (752, 'vo—cê chegasse'), (1103, 'No meu'),
      (1317, 'chatô'), (1469, 'e encontrasse'), (1778, 'Aque——la mulher'), (2270, 'que')]),
    ([(231, 'Am7'), (449, '/'), (490, 'E7(b9)'), (634, '/'), (756, 'Am'), (960, 'Am(7M)'),
      (1241, 'Am7'), (1356, '/'), (1508, 'D7(9)'), (1758, '/'), (1935, '/'), (2005, '/'),
      (2138, 'Am7')],
     [(135, 'você'), (322, 'gostou'), (662, 'Será'), (841, 'que ti————nha coragem'),
      (1386, 'De tro——car nos—sa amizade'), (2036, 'Por e——la que')]),
    ([(152, '/'), (190, 'D7(#5)'), (356, '/'), (477, 'G6'), (634, '/'), (674, '/'), (713, '/'),
      (818, 'G7M'), (1008, '/'), (1229, 'G6'), (1329, '/'), (1464, 'G7M'), (1787, '/'),
      (1835, 'G6'), (2010, '/'), (2217, 'Dm7')],
     [(132, 'já'), (318, 'lhe aban—donou'), (737, 'Eu falo'), (936, 'por—que essa dona'),
      (1351, 'já mo——ra no meu'), (1910, 'barra—co À bei——ra')]),
    ([(279, '/'), (375, 'G7(#5)'), (588, '/'), (756, 'C6(9)'), (1052, '/'), (1091, '/'),
      (1130, '/'), (1271, 'C7M(9)'), (1506, '/'), (1697, 'A7/C#'), (1858, '/'), (2012, 'G/D'),
      (2223, '/')],
     [(136, 'de um'), (307, 'rega————to e'), (616, 'um bos—que em flor'),
      (1158, 'De di———a me'), (1540, 'lava a roupa'), (1887, 'De noi——te me'), (2252, 'beija')]),
    ([(191, 'E7'), (284, '/'), (405, 'Am7'), (726, '/'), (887, 'D7(9)'), (1009, '/'),
      (1211, 'G6'), (1286, '/'), (1325, '/'), (1364, '/')],
     [(136, 'a boca'), (312, 'E as——sim nós va—mos vivendo'), (1034, 'de amor')]),
]

# --- Falsa baiana (livro 106, PDF 94) ---
# 9 sistemas, tudo numa página só (as pp.107–108 são partitura).
# Aqui a letra ficou medida PALAVRA POR PALAVRA, não em frases como no
# `As rosas não falam`, e de propósito: com `--scale 21` o gap de 2.2 colunas dá
# 46px e a linha COLAPSA em 3 tokens (o gap entre palavras deste livro é 42–46px,
# um degrau estreito). Frase inteira num token só significa que o espaçamento
# interno passa a vir da string, não da medição — e aí o acorde escorrega de
# sílaba dentro da frase. Palavra por palavra reancora cada uma no x medido.
FALSA_X0 = 177
FALSA_SISTEMAS = [
    ([(238, 'G7M'), (457, '/'), (636, 'G6'), (869, '/'), (1023, 'A7(13)'), (1321, '/'),
      (1530, 'A7(b13)'), (1817, '/'), (2045, 'Am7'), (2327, '/')],
     [(178, 'Baiana'), (353, 'que'), (444, 'entra'), (558, 'na'), (629, 'roda'), (734, 'e'),
      (785, 'só'), (853, 'fica'), (947, 'para——da'), (1194, 'Não'), (1293, 'canta,'),
      (1422, 'não'), (1513, 'samba,'), (1694, 'não'), (1786, 'bole,'), (1899, 'nem'),
      (2002, 'na——da'), (2200, 'Não'), (2305, 'sabe')]),
    ([(233, 'D7(9)'), (515, '/'), (651, 'G7M'), (792, '/'), (840, 'G7'), (973, '/'),
      (1133, 'C7M'), (1356, '/'), (1541, 'C#°'), (1867, '/'), (2021, 'Bm7'), (2325, '/')],
     [(177, 'deixar'), (353, 'a'), (403, 'mocidade'), (595, 'lou——ca'), (906, 'Baiana'),
      (1052, 'é'), (1103, 'aquela'), (1251, 'que'), (1342, 'entra'), (1456, 'no'),
      (1529, 'samba'), (1667, 'de'), (1738, 'qualquer'), (1916, 'manei——ra'), (2174, 'Que'),
      (2280, 'mexe,')]),
    ([(221, 'E7(b9)'), (462, '/'), (640, 'A7(13)'), (866, '/'), (1070, 'D7(b9)'), (1320, '/'),
      (1530, 'G6'), (1599, '/'), (1647, 'D7(b9/13)'), (1798, '/'), (1896, 'G7M'), (2130, '/'),
      (2313, 'G6')],
     [(178, 'remexe,'), (361, 'dá'), (431, 'nó'), (503, 'nas'), (590, 'cadeiras'), (780, 'E'),
      (836, 'deixa'), (959, 'a'), (1009, 'moçada'), (1210, 'com'), (1313, 'água'), (1422, 'na'),
      (1493, 'bo—ca'), (1834, 'Baiana'), (2022, 'que'), (2116, 'entra'), (2233, 'na'),
      (2307, 'roda')]),
    ([(300, '/'), (440, 'A7(13)'), (727, '/'), (938, 'A7(b13)'), (1216, '/'), (1449, 'Am7'),
      (1708, '/'), (1830, 'D7(9)'), (2097, '/'), (2224, 'G7M'), (2363, '/')],
     [(178, 'e'), (220, 'só'), (282, 'fica'), (368, 'para——da'), (607, 'Não'), (701, 'canta,'),
      (832, 'não'), (924, 'samba,'), (1093, 'não'), (1184, 'bole,'), (1297, 'nem'),
      (1398, 'na——da'), (1585, 'Não'), (1680, 'sabe'), (1778, 'deixar'), (1940, 'a'),
      (1983, 'mocidade'), (2171, 'lou——ca')]),
    ([(179, 'G7'), (317, '/'), (494, 'C7M'), (707, '/'), (893, 'C#°'), (1218, '/'),
      (1376, 'Bm7'), (1682, '/'), (1817, 'E7(b9)'), (2065, '/'), (2260, 'A7(13)')],
     [(254, 'Baiana'), (408, 'é'), (468, 'aquela'), (607, 'que'), (699, 'entra'), (814, 'no'),
      (888, 'samba'), (1026, 'de'), (1096, 'qualquer'), (1272, 'manei——ra'), (1529, 'Que'),
      (1641, 'mexe,'), (1773, 'remexe,'), (1959, 'dá'), (2040, 'nó'), (2123, 'nas'),
      (2213, 'cadeiras')]),
    ([(265, '/'), (447, 'D7(b9)'), (699, '/'), (917, 'G6'), (986, '/'), (1028, 'E7(b9)'),
      (1250, '/'), (1396, 'Am7'), (1611, '/'), (1815, 'D/C'), (2052, '/'), (2264, 'G6/B')],
     [(183, 'E'), (231, 'deixa'), (345, 'a'), (387, 'moçada'), (587, 'com'), (691, 'água'),
      (801, 'na'), (872, 'bo—ca'), (1169, 'A'), (1230, 'falsa'), (1338, 'baiana'),
      (1498, 'quando'), (1652, 'cai'), (1733, 'no'), (1807, 'samba'), (1945, 'ninguém'),
      (2120, 'se'), (2186, 'incomoda')]),
    ([(298, '/'), (480, 'E7(b9)'), (736, '/'), (972, 'Am7'), (1192, '/'), (1388, 'D7(b9)'),
      (1539, '/'), (1794, 'G7M'), (2009, '/'), (2075, 'G7'), (2323, '/')],
     [(184, 'Ninguém'), (367, 'bate'), (467, 'palma'), (621, 'Ninguém'), (807, 'abre'),
      (910, 'a'), (960, 'roda'), (1076, 'Ninguém'), (1260, 'grita'), (1369, '"oba!"'),
      (1568, 'Salve'), (1692, 'a'), (1743, 'Bahia,'), (1913, 'Senhor!'), (2141, 'Mas'),
      (2241, 'a'), (2290, 'gente')]),
    ([(247, 'C7M'), (493, '/'), (709, 'Cm6'), (1037, '/'), (1109, 'Bm7'), (1369, '/'),
      (1584, 'E7(b9)'), (1841, '/'), (2007, 'Am7'), (2207, '/')],
     [(183, 'gos——ta'), (383, 'quando'), (537, 'uma'), (639, 'baia——na'), (863, 'quebra'),
      (1008, 'direiti——nho'), (1276, 'De'), (1349, 'cima'), (1454, 'em'), (1530, 'bai———xo'),
      (1768, 'Revira'), (1909, 'os'), (1970, 'olhinhos'), (2138, 'E'), (2184, 'diz'),
      (2259, 'eu'), (2324, 'sou')]),
    ([(190, 'D7(9)'), (410, '/'), (575, 'G6'), (651, '/'), (690, '/'), (729, '/')],
     [(184, 'filha'), (311, 'de'), (381, 'São'), (474, 'Salvador')]),
]

# Músicas já transcritas. Cada entrada:
#   {'title', 'artist', 'tom', 'estilo', 'pagina_livro', 'pagina_pdf',
#    'texto' OU ('systems' + 'x0' + 'scale'), 'acordes': [...],
#    'digitacoes': {...}, 'fonte': 'Songbook'}
SONGS = [
    {
        'title': 'As rosas não falam',
        'artist': artista_de('Cartola'),
        'tom': 'Dm',
        'estilo': 'Samba',
        'fonte': 'Songbook',
        'pagina_livro': 48,
        'pagina_pdf': pdf_page(48),
        'systems': ROSAS_SISTEMAS,
        'x0': ROSAS_X0,
        # Maior escala que não empurra token nenhum (check_cifra.py): 109 colunas.
        # Acima disso o par `/ /` a 37px do sistema 2 transborda e desloca o Dm/F.
        'scale': 20.3,
        # Ordem da grade de diagramas do livro (16 caixas, 2 fileiras de 8), que
        # aqui é também a ordem de primeira aparição na cifra.
        'acordes': ['Dm', 'Dm/C', 'Gm6/Bb', 'Gm', 'E7/G#', 'A/G', 'Dm/F', 'E7',
                    'A7', 'E7/B', 'D7/F#', 'Gm7', 'Em7(b5)', 'A7(b9)', 'Bb6', 'Gm6'],
    },
    {
        'title': 'Se acaso você chegasse',
        'artist': artista_de('Lupicínio Rodrigues e Felisberto Martins'),
        'tom': 'G',
        'estilo': 'Samba',
        'fonte': 'Songbook',
        'pagina_livro': 156,
        'pagina_pdf': pdf_page(156),
        'systems': SEACASO_SISTEMAS,
        'x0': SEACASO_X0,
        # Maior escala sem empurrão nenhum (check_cifra.py): 106 colunas.
        'scale': 21.0,
        # Ordem da grade de diagramas do livro (17 caixas, 3 fileiras: 6+6+5),
        # que é também a ordem de primeira aparição na cifra.
        # `C⁶₉` (6 sobre 9) virou `C6(9)`, seguindo a convenção de tensão
        # empilhada de pendencias.md (o `F6(9)` do songbook do Gil).
        'acordes': ['G6', 'G6/B', 'Bb°', 'Am7', 'E7(b9)', 'Am', 'Am(7M)', 'D7(9)',
                    'D7(#5)', 'G7M', 'Dm7', 'G7(#5)', 'C6(9)', 'C7M(9)', 'A7/C#',
                    'G/D', 'E7'],
    },
    {
        'title': 'Falsa baiana',
        'artist': artista_de('Geraldo Pereira'),
        'tom': 'G',
        'estilo': 'Samba',
        'fonte': 'Songbook',
        'pagina_livro': 106,
        'pagina_pdf': pdf_page(106),
        'systems': FALSA_SISTEMAS,
        'x0': FALSA_X0,
        # A maior escala que não empurra NADA seria 16.1, e daria 137 colunas —
        # largo demais para um tablet. O que a limita é um token só: `D7(b9/13)`
        # tem 9 caracteres e só 151px até a barra seguinte. A 18.1 (122 colunas)
        # o único empurrão do livro inteiro é ESSA barra, deslocada 1 coluna —
        # barra não fica sobre sílaba, então nada de letra ou acorde sai de lugar.
        'scale': 18.1,
        # Ordem da grade de diagramas do livro (16 caixas, 3 fileiras: 6+5+5),
        # que é também a ordem de primeira aparição na cifra.
        # `D7(♭9₁₃)` (b9 sobre 13) virou `D7(b9/13)`, convenção de tensão
        # empilhada de pendencias.md — forma que já existe no songbook do Gil.
        'acordes': ['G7M', 'G6', 'A7(13)', 'A7(b13)', 'Am7', 'D7(9)', 'G7', 'C7M',
                    'C#°', 'Bm7', 'E7(b9)', 'D7(b9)', 'D7(b9/13)', 'D/C', 'G6/B', 'Cm6'],
    },
    {
        'title': 'Brasil pandeiro',
        'artist': artista_de('Assis Valente'),
        'tom': 'A',
        'estilo': 'Samba',
        'fonte': 'Songbook',
        'pagina_livro': 59,
        'pagina_pdf': pdf_page(59),
        'systems': PANDEIRO_SISTEMAS,
        'x0': PANDEIRO_X0,
        # 17.1 é a maior escala sem empurrão nenhum, e dá 129 colunas. Escalas
        # maiores estreitam a linha (18.5 -> 120), mas aí a linearização do
        # `E⁷₄(9)` — `E7(4/9)` tem 7 caracteres onde o impresso empilha em ~5
        # colunas — encosta na barra seguinte e a desloca. Largura não é problema:
        # `wrapBlock` (chords.js) reflui acorde e letra JUNTOS, na mesma coluna.
        # Alinhamento perdido, ao contrário de largura, não tem volta.
        'scale': 17.1,
        # Ordem da grade de diagramas do livro (13 caixas, 2 fileiras: 7+6), que é
        # também a ordem de primeira aparição na cifra.
        'acordes': ['A7M', 'A#°', 'Bm7', 'E7', 'A6', 'A7', 'Em7', 'D6', 'G6', 'C#m7',
                    'F#7', 'Dm6', 'E7(4/9)'],
    },
    {
        'title': 'Caçador de mim',
        'artist': artista_de('Sérgio Magrão e Luís Carlos Sá'),
        'tom': 'Bb',
        'estilo': 'MPB',
        'fonte': 'Songbook',
        'pagina_livro': 63,
        'pagina_pdf': pdf_page(63),
        'systems': CACADOR_SISTEMAS,
        'x0': CACADOR_X0,
        # A cifra mais larga das três: 142 colunas, e é o preço de não empurrar
        # nada. Esta música tem 19 `F7(4/9)`/`Bb7(4/9)`, de 7 e 8 caracteres,
        # onde o livro empilha o 7/4 em ~4 colunas; em trechos como
        # `Bb F⁷₄(9) Bb F⁷₄(9) Bb` isso não caberia sem transbordar. Qualquer
        # escala acima desta já empurra ACORDE (16.0 empurra 2), e aí o acorde
        # muda de sílaba. Largura o app resolve com `wrapBlock`; alinhamento não.
        'scale': 15.4,
        # Ordem da grade de diagramas do livro (12 caixas, 2 fileiras de 6), que é
        # também a ordem de primeira aparição na cifra.
        'acordes': ['Bb', 'Bb7M', 'F7(4/9)', 'Gm', 'Gm/F', 'Eb7M', 'Bb(add9)/D',
                    'Bb7(4/9)', 'D7/F#', 'Dm/F', 'Cm7', 'Em7(b5)'],
    },
]
