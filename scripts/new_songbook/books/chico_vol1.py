# Songbook Chico Buarque vol. 1 (Almir Chediak / Lumiar, 1999) — 56 músicas,
# 228 págs no PDF.
# chords/-new-songbook/Chico Buarque Vol 1 - Almir Chediak/770489405-Songbook-ChicoBuarque1.pdf
#
# Diferente do Caetano vol. 2, este scan é regular: página do PDF = página do
# livro + 1, do começo ao fim, sem página faltando, duplicada ou em branco.
# Conferido título a título nas 56 músicas, e a última página de cada uma bate
# com o `Copyright` impresso.

BOOK = 'chico-vol1'
FOLDER = ('/Users/somacavalieri/Library/CloudStorage/GoogleDrive-somacavalieri@gmail.com/'
          'My Drive/_claude/somaplay/chords/-new-songbook/Chico Buarque Vol 1 - Almir Chediak')
PDF = f'{FOLDER}/770489405-Songbook-ChicoBuarque1.pdf'

# Segunda cópia parcial (fotos em alta, só págs. 31–130 do livro, com falhas),
# deixada na pasta-mãe. Só para reler uma página ilegível do scan principal.
PDF_FOTOS = ('/Users/somacavalieri/Library/CloudStorage/GoogleDrive-somacavalieri@gmail.com/'
             'My Drive/_claude/somaplay/chords/-new-songbook/'
             'chicobuarque-songbook1almirchediak1-160628133620.pdf')


def pdf_page(livro):
    """Página do PDF (1-based) para uma página do livro."""
    if not 1 <= livro <= 227:
        raise ValueError(f'página {livro} fora do livro')
    return livro + 1


# Índice completo, em ORDEM DE PÁGINA (o índice impresso é alfabético; esta
# ordem é a de extração). (título, 1ª página do livro, última, compositores)
# Compositores lidos do subtítulo da página da música, não do índice.
INDICE = [
    ('Acalanto para Helena', 31, 32, 'Chico Buarque'),
    ('A banda', 33, 35, 'Chico Buarque'),
    ('A foto da capa', 36, 39, 'Chico Buarque'),
    ('Agora falando sério', 40, 42, 'Chico Buarque'),
    ('Almanaque', 43, 49, 'Chico Buarque'),
    ('Ano Novo', 50, 52, 'Chico Buarque'),
    ('A ostra e o vento', 53, 55, 'Chico Buarque'),
    ('A noiva da cidade', 56, 59, 'Francis Hime e Chico Buarque'),
    ('Apesar de você', 60, 64, 'Chico Buarque'),
    ('Até pensei', 65, 67, 'Chico Buarque'),
    ('A Rosa', 68, 71, 'Chico Buarque'),
    ('Bancarrota blues', 72, 75, 'Edu Lobo e Chico Buarque'),
    ('Benvinda', 76, 79, 'Chico Buarque'),
    ('Bom conselho', 80, 82, 'Chico Buarque'),
    ('Cala a boca, Bárbara', 83, 85, 'Chico Buarque e Ruy Guerra'),
    ('Cantando no toró', 86, 90, 'Chico Buarque'),
    ('Deixe a menina', 91, 94, 'Chico Buarque'),
    ('Desalento', 95, 97, 'Chico Buarque e Vinicius de Moraes'),
    ('De volta ao samba', 98, 100, 'Chico Buarque'),
    ('Ela e sua janela', 101, 103, 'Chico Buarque'),
    ('Estação derradeira', 104, 106, 'Chico Buarque'),
    ('Fantasia', 107, 109, 'Chico Buarque'),
    ('Geni e o zepelim', 110, 113, 'Chico Buarque'),
    ('Grande hotel', 114, 116, 'Wilson das Neves e Chico Buarque'),
    ('Hino de Duran', 117, 119, 'Chico Buarque'),
    ('Ilmo. Sr. Ciro Monteiro', 120, 123, 'Chico Buarque'),
    ('Imagina', 124, 127, 'Antonio Carlos Jobim e Chico Buarque'),
    ('Já passou', 128, 130, 'Chico Buarque'),
    ('Leve', 131, 134, 'Carlinhos Vergueiro e Chico Buarque'),
    ('Logo eu?', 135, 137, 'Chico Buarque'),
    ('Mambembe', 138, 140, 'Chico Buarque'),
    ('Mar e lua', 141, 143, 'Chico Buarque'),
    ('Meninos, eu vi', 144, 148, 'Antonio Carlos Jobim e Chico Buarque'),
    ('Não existe pecado ao sul do equador', 149, 151, 'Chico Buarque e Ruy Guerra'),
    ('Não sonho mais', 152, 154, 'Chico Buarque'),
    ('O futebol', 155, 158, 'Chico Buarque'),
    ('Onde é que você estava', 159, 161, 'Chico Buarque'),
    ('Outra noite', 162, 164, 'Luiz Cláudio Ramos e Chico Buarque'),
    ('O Velho Francisco', 165, 167, 'Chico Buarque'),
    ('O cio da terra', 168, 168, 'Milton Nascimento e Chico Buarque'),
    ('Pedaço de mim', 169, 171, 'Chico Buarque'),
    ('Pedro pedreiro', 172, 175, 'Chico Buarque'),
    ('Realejo', 176, 178, 'Chico Buarque'),
    ('Rio 42', 179, 181, 'Chico Buarque'),
    ('Retrato em branco e preto', 182, 183, 'Antonio Carlos Jobim e Chico Buarque'),
    ('Será que Cristina volta?', 184, 186, 'Chico Buarque'),
    ('Samba e amor', 187, 189, 'Chico Buarque'),
    ('Sem açúcar', 190, 192, 'Chico Buarque'),
    ('Sonhos sonhos são', 193, 196, 'Chico Buarque'),
    ('Tango do covil', 197, 199, 'Chico Buarque'),
    ('Tem mais samba', 200, 201, 'Chico Buarque'),
    ('Trapaças', 202, 203, 'Chico Buarque'),
    ('Uma canção desnaturada', 204, 206, 'Chico Buarque'),
    ('Vida', 207, 209, 'Chico Buarque'),
    ('Valsinha', 210, 211, 'Vinicius de Moraes e Chico Buarque'),
    ('Vence na vida quem diz sim', 212, 213, 'Chico Buarque e Ruy Guerra'),
]

# Artista no app: 'Chico Buarque' para todas as 56, mesmo nas 9 em parceria —
# senão a lente de Artistas fragmenta o songbook em dez artistas. O crédito
# completo do livro fica em INDICE.
ARTISTA = 'Chico Buarque'

# --- A Rosa (livro 68–71, PDF 69–72) ---
# O bloco letra+acordes ocupa as págs. 68 e 69 do livro; as 70 e 71 são só a
# pauta melódica (4 estrofes empilhadas), que não entra na cifra em texto.
#
# Tokens MEDIDOS POR PIXEL na página renderizada a 300 dpi (x = borda esquerda do
# token), com `scripts/new_songbook/measure_cifra.py`. Conferido: a contagem de
# acordes, barras e palavras medida bate com a leitura da imagem nos 28 sistemas.
#
# As duas páginas têm margem esquerda diferente (a 69 é ímpar, com a espiral à
# esquerda): cada uma é normalizada pelo x0 da sua própria página, senão a p.69
# sairia indentada ~5 colunas.
A_ROSA_X0_P68 = 154
A_ROSA_X0_P69 = 247

# Melisma: o livro estica a sílaba com traço longo ("Arra——sa", "cami——nho").
# O traço é recurso de gravação musical, não texto — as palavras entram inteiras
# e a posição vem da medição. Onde o traço ligava DUAS palavras ("À-to-a,") o
# espaço foi devolvido ("À toa,").
A_ROSA_SISTEMAS_P68 = [
    ([(230, 'C7M(9)'), (416, '/'), (590, 'G7(9)'), (825, '/'), (965, 'C6/9'), (1060, '/'),
      (1109, 'E7'), (1184, '/'), (1312, 'Am6'), (1468, '/'), (1584, 'E7/G#'), (1896, '/'),
      (2024, 'Gm7'), (2179, '/'), (2220, 'Gm6'), (2329, '/')],
     [(156, 'Arrasa'), (454, 'o'), (507, 'meu'), (713, 'projeto'), (861, 'de'), (932, 'vida'),
      (1219, 'Querida,'), (1504, 'estrela'), (1774, 'do'), (1847, 'meu'), (1947, 'caminho')]),
    ([(230, 'Ab7'), (389, '/'), (548, '/'), (829, '/'), (976, 'C7M'), (1124, '/'), (1278, 'B7'),
      (1383, '/'), (1536, 'Gm6/Bb'), (1773, '/'), (1919, 'A7(b13)'), (2228, '/')],
     [(156, 'Espinho'), (426, 'cravado'), (652, 'em'), (736, 'minha'), (869, 'garganta'),
      (1165, 'Garganta'), (1430, 'A'), (1490, 'santa'), (1812, 'às'), (1881, 'vezes'),
      (2156, 'troca'), (2277, 'meu')]),
    ([(194, 'F7M/A'), (422, '/'), (533, 'Fm6/Ab'), (774, '/'), (890, 'C7M/G'), (1111, '/'),
      (1251, 'G7(9)'), (1528, '/'), (1631, 'C6/9'), (1731, '/'), (1771, 'E7'), (1839, '/'),
      (1947, 'Am6'), (2098, '/'), (2214, 'E7/G#')],
     [(156, 'nome'), (456, 'E'), (506, 'some'), (814, 'E'), (864, 'some'), (1148, 'nas'),
      (1232, 'altas'), (1419, 'da'), (1488, 'madrugada'), (1859, 'Coitada,'), (2134, 'trabalha')]),
    ([(264, '/'), (375, 'Gm7'), (492, '/'), (534, 'Gm6'), (644, '/'), (742, 'Ab7'), (875, '/'),
      (1037, '/'), (1194, '/'), (1315, 'C7M'), (1457, '/'), (1579, 'B7'), (1680, '/'),
      (1801, 'Gm6/Bb'), (2047, '/'), (2169, 'A7(b13)')],
     [(154, 'de'), (225, 'plantonista'), (659, 'Artista,'), (905, 'é'), (954, 'doida'),
      (1133, 'pela'), (1234, 'Portela'), (1494, 'Ói'), (1565, 'ela'), (1717, 'Ói'),
      (1788, 'ela,'), (2083, 'vestida')]),
    ([(260, '/'), (427, 'F7M/A'), (638, '/'), (767, 'Fm6/Ab'), (987, '/'), (1127, 'C7M/G'),
      (1330, '/'), (1459, 'B7/D#'), (1755, '/'), (1914, 'Gm6/D'), (2133, '/'), (2175, 'A7/C#'),
      (2332, '/')],
     [(155, 'de'), (226, 'verde'), (349, 'e'), (399, 'rosa'), (670, 'A'), (728, 'Rosa'),
      (1024, 'A'), (1085, 'Rosa'), (1365, 'garante'), (1599, 'que'), (1684, 'é'),
      (1725, 'sempre'), (1876, 'minha')]),
    ([(263, 'F7M/C'), (516, '/'), (640, 'Bbm6/Db'), (1047, '/'), (1200, 'Dm7(9)'), (1379, '/'),
      (1424, '/'), (1469, '/'), (1652, 'Ab7'), (1784, '/'), (2010, '/'), (2230, '/')],
     [(156, 'Quietinha,'), (548, 'saiu'), (854, 'pra'), (937, 'comprar'), (1116, 'cigarro'),
      (1490, 'Que'), (1599, 'sarro,'), (1828, 'trouxe'), (1975, 'umas'), (2160, 'coisas'),
      (2302, 'do')]),
    ([(217, 'C7M'), (361, '/'), (535, 'B7'), (631, '/'), (802, 'Gm6/Bb'), (1040, '/'),
      (1192, 'A7(b13)'), (1468, '/'), (1565, 'F7M/A'), (1758, '/'), (1798, 'Fm6/Ab'),
      (1985, '/'), (2120, 'C7M/G'), (2331, '/')],
     [(156, 'Norte'), (391, 'Que'), (486, 'sorte'), (668, 'Que'), (762, 'sorte,'),
      (1076, 'voltou'), (1343, 'toda'), (1438, 'sorridente'), (2005, 'Demente,')]),
    ([(236, 'G7(9)'), (454, '/'), (547, 'C6/9'), (658, '/'), (698, 'E7'), (765, '/'),
      (855, 'Am6'), (1012, '/'), (1209, 'E7/G#'), (1556, '/'), (1684, 'Gm7'), (1804, '/'),
      (1842, 'Gm6'), (1950, '/'), (2029, 'Ab7'), (2162, '/'), (2332, '/')],
     [(156, 'inventa'), (385, 'cada'), (486, 'carícia'), (786, 'Egípcia,'), (1046, 'me'),
      (1120, 'encontra'), (1404, 'e'), (1446, 'me'), (1528, 'vira'), (1615, 'a'), (1655, 'cara'),
      (1964, 'Odara,'), (2197, 'gravou')]),
    ([(345, '/'), (500, 'C7M'), (650, '/'), (761, 'B7'), (868, '/'), (1032, 'Gm6/Bb'),
      (1258, '/'), (1392, 'A7(b13)'), (1735, '/'), (1903, 'F7M/A'), (2105, '/'),
      (2144, 'Fm6/Ab'), (2330, '/')],
     [(156, 'meu'), (258, 'nome'), (382, 'na'), (452, 'blusa'), (686, 'Abusa,'), (906, 'me'),
      (986, 'acusa'), (1298, 'Revista'), (1587, 'os'), (1655, 'bolsos'), (1791, 'da'),
      (1858, 'calça')]),
    ([(254, 'C7M/G'), (465, '/'), (638, 'G7(9)'), (899, '/'), (1026, 'C6/9'), (1122, '/'),
      (1164, 'E7'), (1233, '/'), (1361, 'Am6'), (1505, '/'), (1659, 'E7/G#'), (1940, '/'),
      (2019, 'Gm7'), (2184, '/'), (2223, 'Gm6'), (2329, '/')],
     [(155, 'A'), (215, 'falsa'), (503, 'limpou'), (756, 'a'), (805, 'minha'), (938, 'carteira'),
      (1260, 'Maneira,'), (1542, 'pagou'), (1808, 'a'), (1858, 'nossa'), (1974, 'despesa')]),
]

A_ROSA_SISTEMAS_P69 = [
    ([(340, 'Ab7'), (481, '/'), (668, '/'), (879, '/'), (1079, 'C7M'), (1245, '/'), (1420, 'B7'),
      (1532, '/'), (1702, 'Gm6/Bb'), (1940, '/'), (2144, 'A7(b13)')],
     [(260, 'Beleza,'), (518, 'na'), (598, 'hora'), (766, 'do'), (850, 'bom'), (955, 'me'),
      (1033, 'deixa,'), (1275, 'se'), (1349, 'queixa'), (1564, 'A'), (1635, 'gueixa'),
      (1983, 'Que'), (2093, 'coisa'), (2358, 'mais')]),
    ([(263, '/'), (362, 'F7M/A'), (576, '/'), (723, 'Fm6/Ab'), (954, '/'), (1123, 'C7M/G'),
      (1355, '/'), (1586, 'B7/D#'), (1845, '/'), (1986, 'Gm6/D'), (2213, '/'), (2259, 'A7/C#'),
      (2423, '/')],
     [(259, 'amorosa'), (617, 'A'), (679, 'Rosa'), (996, 'Ah,'), (1088, 'Rosa,'), (1391, 'e'),
      (1441, 'o'), (1493, 'meu'), (1738, 'projeto'), (1884, 'de'), (1956, 'vida?')]),
    ([(354, 'F7M/C'), (581, '/'), (703, 'Bbm6/Db'), (1106, '/'), (1227, 'Dm7(9)'), (1387, '/'),
      (1424, '/'), (1462, '/'), (1559, 'Ab7'), (1684, '/'), (1922, '/'), (2123, '/'),
      (2278, 'C7M'), (2419, '/')],
     [(260, 'Bandida,'), (614, 'cadê'), (906, 'minha'), (1038, 'estrela'), (1175, 'guia'),
      (1481, 'Vadia,'), (1723, 'me'), (1803, 'esquece'), (2024, 'na'), (2094, 'noite'),
      (2207, 'escura')]),
    ([(390, 'B7'), (497, '/'), (644, 'Gm6/Bb'), (868, '/'), (1111, 'A7(b13)'), (1366, '/'),
      (1518, 'F7M/A'), (1726, '/'), (1773, 'Fm6/Ab'), (1969, '/'), (2068, 'C7M/G'), (2285, '/')],
     [(259, 'Mas'), (356, 'jura'), (529, 'Me'), (611, 'jura'), (903, 'que'), (995, 'um'),
      (1077, 'dia'), (1295, 'volta'), (1406, 'pra'), (1488, 'casa'), (1994, 'Arrasa'),
      (2318, 'o'), (2370, 'meu')]),
    ([(258, 'G7(9)'), (481, '/'), (615, 'C6/9'), (709, '/'), (747, 'E7'), (814, '/'),
      (929, 'Am6'), (1084, '/'), (1187, 'E7/G#'), (1477, '/'), (1603, 'Gm7'), (1748, '/'),
      (1787, 'Gm6'), (1895, '/'), (1993, 'Ab7'), (2140, '/'), (2291, '/')],
     [(372, 'projeto'), (513, 'de'), (579, 'vida'), (834, 'Querida,'), (1114, 'estrela'),
      (1368, 'do'), (1435, 'meu'), (1528, 'caminho'), (1920, 'Espinho'), (2176, 'cravado'),
      (2387, 'em')]),
    ([(349, '/'), (496, 'C7M'), (639, '/'), (792, 'B7'), (891, '/'), (1024, 'Gm6/Bb'),
      (1242, '/'), (1369, 'A7(b13)'), (1710, '/'), (1883, 'F7M/A'), (2086, '/'),
      (2211, 'Fm6/Ab'), (2424, '/')],
     [(260, 'minha'), (386, 'garganta'), (670, 'Garganta'), (919, 'A'), (974, 'santa'),
      (1271, 'às'), (1330, 'vezes'), (1581, 'me'), (1655, 'chama'), (1789, 'Alberto'),
      (2120, 'Alberto')]),
    ([(356, 'C7M/G'), (568, '/'), (750, 'G7(9)'), (1088, '/'), (1203, 'C6/9'), (1303, '/'),
      (1352, 'E7'), (1427, '/'), (1535, 'Am6'), (1678, '/'), (1801, 'E7/G#'), (2122, '/'),
      (2300, 'Gm7'), (2425, '/')],
     [(259, 'Decerto'), (606, 'sonhou'), (867, 'com'), (980, 'alguma'), (1132, 'novela'),
      (1455, 'Penélope,'), (1728, 'espera'), (1991, 'por'), (2078, 'mim'), (2186, 'bordando')]),
    ([(258, 'Gm6'), (367, '/'), (470, 'Ab7'), (604, '/'), (740, '/'), (915, '/'), (1067, 'C7M'),
      (1227, '/'), (1371, 'B7'), (1491, '/'), (1604, 'Gm6/Bb'), (1862, '/'), (2040, 'A7(b13)'),
      (2411, '/')],
     [(382, 'Suando,'), (629, 'ficou'), (764, 'de'), (827, 'cama'), (939, 'com'), (1035, 'febre'),
      (1252, 'Que'), (1346, 'febre'), (1522, 'A'), (1576, 'lebre,'), (1884, 'como'), (2001, 'é'),
      (2185, 'que'), (2276, 'ela'), (2349, 'é'), (2391, 'tão')]),
    ([(326, 'F7M/A'), (547, '/'), (700, 'Fm6/Ab'), (932, '/'), (1083, 'C7M/G'), (1304, '/'),
      (1455, 'B7/D#'), (1770, '/'), (1898, 'Gm6/D'), (2112, '/'), (2166, 'A7/C#'), (2338, '/')],
     [(257, 'fogosa'), (585, 'A'), (657, 'Rosa'), (974, 'A'), (1046, 'Rosa'), (1338, 'jurou'),
      (1612, 'seu'), (1709, 'amor'), (1834, 'eterno'), (2366, 'Meu')]),
    ([(301, 'F7M/C'), (516, '/'), (664, 'Bbm6/Db'), (1006, '/'), (1084, 'Dm7(9)'), (1251, '/'),
      (1295, '/'), (1339, '/'), (1490, 'Ab7'), (1603, '/'), (1822, '/'), (2049, '/'),
      (2197, 'C7M'), (2346, '/')],
     [(258, 'terno'), (559, 'ficou'), (881, 'na'), (951, 'tinturaria'), (1369, 'Um'),
      (1457, 'dia'), (1642, 'me'), (1734, 'trouxe'), (1927, 'uma'), (2029, 'roupa'),
      (2152, 'justa'), (2386, 'Me')]),
    ([(318, 'B7'), (426, '/'), (591, 'Gm6/Bb'), (816, '/'), (992, 'A7(b13)'), (1297, '/'),
      (1480, 'F7M/A'), (1681, '/'), (1723, 'Fm6/Ab'), (1913, '/'), (2087, 'C7M/G'), (2303, '/')],
     [(255, 'gusta,'), (458, 'me'), (538, 'gusta'), (851, 'Cismou'), (1143, 'de'),
      (1212, 'dançar'), (1354, 'um'), (1436, 'tango'), (1933, 'Meu'), (2038, 'rango'),
      (2340, 'sumiu')]),
    ([(255, 'G7(9)'), (522, '/'), (606, 'C6/9'), (695, '/'), (737, 'E7'), (807, '/'),
      (915, 'Am6'), (1059, '/'), (1218, 'E7/G#'), (1599, '/'), (1672, 'Gm7'), (1813, '/'),
      (1854, 'Gm6'), (1965, '/'), (2106, 'Ab7'), (2259, '/'), (2378, '/')],
     [(370, 'lá'), (422, 'da'), (488, 'geladeira'), (823, 'Caseira,'), (1094, 'seu'),
      (1174, 'molho'), (1423, 'é'), (1466, 'uma'), (1561, 'maravilha'), (1983, 'Que'),
      (2084, 'filha,'), (2296, 'visita')]),
    ([(378, '/'), (605, 'C7M'), (753, '/'), (931, 'B7'), (1049, '/'), (1212, 'Gm6/Bb'),
      (1442, '/'), (1606, 'A7(b13)'), (1883, '/'), (1994, 'F7M/A'), (2192, '/'),
      (2234, 'Fm6/Ab'), (2423, '/')],
     [(255, 'a'), (304, 'família'), (452, 'em'), (534, 'Sampa'), (787, 'Às'), (864, 'pampa,'),
      (1082, 'às'), (1147, 'pampa'), (1479, 'Voltou'), (1757, 'toda'), (1852, 'descascada')]),
    ([(341, 'C7M/G'), (570, '/'), (655, 'G7(9)'), (992, '/'), (1115, 'C6/9'), (1208, '/'),
      (1251, 'E7'), (1320, '/'), (1435, 'Am6'), (1583, '/'), (1694, 'E7/G#'), (2032, '/'),
      (2137, 'Gm7'), (2271, '/'), (2314, 'Gm6'), (2423, '/')],
     [(255, 'A'), (316, 'fada,'), (604, 'acaba'), (810, 'com'), (911, 'a'), (962, 'minha'),
      (1095, 'lira'), (1344, 'A'), (1404, 'gira,'), (1620, 'esgota'), (1882, 'a'),
      (1933, 'minha'), (2069, 'laringe')]),
    ([(340, 'Ab7'), (480, '/'), (618, '/'), (842, '/'), (969, 'C7M'), (1105, '/'), (1208, 'B7'),
      (1307, '/'), (1428, 'Gm6/Bb'), (1647, '/'), (1824, 'A7(b13)'), (2141, '/'),
      (2221, 'F7M/A'), (2422, '/')],
     [(254, 'Esfinge,'), (512, 'devora'), (707, 'a'), (749, 'minha'), (882, 'pessoa'),
      (1134, 'À toa,'), (1340, 'a'), (1390, 'boa'), (1674, 'Que'), (1773, 'coisa'),
      (2010, 'mais'), (2114, 'saborosa')]),
    ([(353, 'Fm6/Ab'), (587, '/'), (745, 'C7M/G'), (966, '/'), (1070, 'B7/D#'), (1426, '/'),
      (1564, 'Gm6/D'), (1787, '/'), (1829, 'A7/C#'), (1989, '/'), (2100, 'F7M/C'), (2329, '/')],
     [(254, 'A'), (309, 'Rosa'), (618, 'Ah,'), (705, 'Rosa,'), (997, 'e'), (1041, 'o'),
      (1216, 'meu'), (1317, 'projeto'), (1462, 'de'), (1533, 'vida?'), (2006, 'Bandida,'),
      (2360, 'cadê')]),
    ([(254, 'Bbm6/Db'), (686, '/'), (802, 'Dm7(9)'), (986, '/'), (1030, '/'), (1075, '/'),
      (1190, 'Ab7'), (1310, '/'), (1550, '/'), (1768, '/'), (1922, 'C7M'), (2066, '/'),
      (2235, 'B7'), (2342, '/')],
     [(470, 'minha'), (614, 'estrela'), (752, 'guia?'), (1109, 'Vadia,'), (1351, 'me'),
      (1429, 'esquece'), (1657, 'na'), (1738, 'noite'), (1850, 'escura'), (2105, 'Mas'),
      (2203, 'jura'), (2379, 'Me')]),
    ([(276, 'Gm6/Bb'), (510, '/'), (748, 'A7(b13)'), (992, '/'), (1151, 'F7M/A'), (1351, '/'),
      (1392, 'Fm6/Ab'), (1579, '/'), (1677, 'C7M(9)')],
     [(247, 'jura'), (542, 'que'), (634, 'um'), (716, 'dia'), (923, 'volta'), (1035, 'pra'),
      (1116, 'casa'), (1607, 'Arrasa')]),
]


def _desloca(sistemas, x0):
    """Normaliza os x pela margem da própria página (x0 vira coluna 0)."""
    return [([(x - x0, t) for x, t in ac], [(x - x0, t) for x, t in le])
            for ac, le in sistemas]


A_ROSA_SISTEMAS = (_desloca(A_ROSA_SISTEMAS_P68, A_ROSA_X0_P68)
                   + _desloca(A_ROSA_SISTEMAS_P69, A_ROSA_X0_P69))

# Ordem da grade de diagramas do livro (3 fileiras: 8 + 7 + 7), que é a ordem em
# que o painel "Acordes desta música" mostra.
A_ROSA_ACORDES = [
    'C7M(9)', 'G7(9)', 'C6/9', 'E7', 'Am6', 'E7/G#', 'Gm7', 'Gm6',
    'Ab7', 'C7M', 'B7', 'Gm6/Bb', 'A7(b13)', 'F7M/A', 'Fm6/Ab',
    'C7M/G', 'B7/D#', 'Gm6/D', 'A7/C#', 'F7M/C', 'Bbm6/Db', 'Dm7(9)',
]

# Formas da grade de diagramas do livro (22 caixas, 3 fileiras de 8+7+7), lidas
# por pixel a 300 dpi: ponto = corrida horizontal de tinta ≥14 px no centro da
# casa; ○ acima do braço = corda solta; corda sem marca = não toca. As linhas do
# braço só aparecem inteiras com limiar 170 (a corda mais à direita sai clara
# neste scan) — com 128 some uma corda por caixa.
#
# Casa-base resolvida pelo TESTE DAS NOTAS, não pelo OCR do algarismo romano:
# para cada casa-base de 1 a 12, aceita a que faz as notas do voicing caberem no
# nome do acorde com o baixo nomeado na corda mais grave. **As 22 fecharam com
# solução única**, e a casa que o teste achou bate com o algarismo impresso em
# todas as 9 caixas que trazem algarismo (Am6 IV, Ab7 IV, C7M III, A7(b13) V,
# F7M/A III, Fm6/Ab III, B7/D# IV, Gm6/D III, A7/C# II, Bbm6/Db III, Dm7(9) III).
# Nenhuma divergência livro×nome aqui, diferente de "Samba de uma nota só".
#
# frets = [Mi grave, Lá, Ré, Sol, Si, Mi agudo], casa ABSOLUTA, -1 = não toca, 0 = solta.
A_ROSA_DIGITACOES = {
    'C7M(9)':  {'frets': [-1, 3, 2, 4, 3, -1]},    # C  E  B  D
    'G7(9)':   {'frets': [3, -1, 3, 2, 0, -1]},    # G  F  A  B
    'C6/9':    {'frets': [-1, 3, 2, 2, 3, -1]},    # C  E  A  D
    'E7':      {'frets': [0, 2, 2, 1, 3, -1]},     # E  B  E  G# D
    'Am6':     {'frets': [5, -1, 4, 5, 5, -1]},    # A  F# C  E
    'E7/G#':   {'frets': [4, -1, 2, 4, 3, -1]},    # G# E  B  D
    'Gm7':     {'frets': [3, -1, 3, 3, 3, -1]},    # G  F  Bb D
    'Gm6':     {'frets': [3, -1, 2, 3, 3, -1]},    # G  E  Bb D
    'Ab7':     {'frets': [4, -1, 4, 5, 4, -1]},    # Ab Gb C  Eb
    'C7M':     {'frets': [-1, 3, 5, 4, 5, 3]},     # C  G  B  E  G
    'B7':      {'frets': [-1, 2, 4, 2, 4, 2]},     # B  F# A  D# F#
    'Gm6/Bb':  {'frets': [-1, 1, 2, 0, 3, 0]},     # Bb E  G  D  E
    'A7(b13)': {'frets': [5, -1, 5, 6, 6, -1]},    # A  G  C# F
    'F7M/A':   {'frets': [5, -1, 3, 5, 5, -1]},    # A  F  C  E
    'Fm6/Ab':  {'frets': [4, -1, 3, 5, 3, -1]},    # Ab F  C  D
    'C7M/G':   {'frets': [3, -1, 2, 4, 1, -1]},    # G  E  B  C
    'B7/D#':   {'frets': [-1, 6, 7, 4, 7, -1]},    # D# A  B  F#
    'Gm6/D':   {'frets': [-1, 5, 5, 3, 5, -1]},    # D  G  Bb E
    'A7/C#':   {'frets': [-1, 4, 5, 2, 5, -1]},    # C# G  A  E
    'F7M/C':   {'frets': [-1, 3, 3, 2, 1, 0]},     # C  F  A  C  E
    'Bbm6/Db': {'frets': [-1, 4, 5, 3, 6, 3]},     # Db G  Bb F  G
    'Dm7(9)':  {'frets': [-1, 5, 3, 5, 5, -1]},    # D  F  C  E
}

# --- Mambembe (livro 138–140, PDF 139–141) ---
# Cifra inteira na p.138 (as 139–140 são pauta melódica): 1 linha de introdução
# só com acordes + 10 sistemas. A linha "Introdução:" é rótulo com dois-pontos —
# `stripLabels` em chords.js reconhece e a linha continua valendo como linha de
# acordes.
MAMBEMBE_X0 = 174
MAMBEMBE_SISTEMAS = [
    ([(183, 'Introdução:'), (420, 'D7M'), (534, '/'), (575, 'F6/9'), (648, '/'), (688, 'Bb7M'),
      (820, '/'), (861, 'A7'), (934, '/'), (975, 'D7M'), (1087, '/'), (1128, 'F6/9'), (1200, '/'),
      (1242, 'Bb7M'), (1372, '/'), (1413, 'A7'), (1486, '/')],
     []),
    ([(182, 'D7M'), (414, '/'), (587, 'F6/9'), (807, '/'), (1016, 'Bb7M'), (1246, '/'),
      (1348, 'A7'), (1420, '/'), (1461, 'D7M'), (1667, '/'), (1871, 'F#7/C#'), (2104, '/'),
      (2259, 'Bm7'), (2363, '/')],
     [(297, 'No'), (378, 'palco,'), (512, 'na'), (581, 'praça,'), (712, 'no'), (784, 'circo,'),
      (909, 'num'), (1012, 'banco'), (1150, 'de'), (1216, 'jardim'), (1574, 'Correndo'),
      (1764, 'no'), (1836, 'escuro,'), (2040, 'pixado'), (2187, 'no'), (2260, 'muro')]),
    ([(314, 'F#7'), (528, '/'), (736, 'G6'), (812, '/'), (1007, 'A7'), (1117, '/'),
      (1232, 'F#m7(b5)'), (1462, '/'), (1503, 'B7(b9)'), (1770, '/'), (2032, 'E7(9)'),
      (2186, '/'), (2231, 'C7(9)'), (2362, '/')],
     [(182, 'Você'), (312, 'vai'), (403, 'saber'), (564, 'de'), (636, 'mim'), (844, 'Mambembe,'),
      (1164, 'cigano'), (1643, 'Debaixo'), (1888, 'da'), (1970, 'ponte,')]),
    ([(284, 'F#m7'), (431, '/'), (474, 'F7(13)'), (759, '/'), (963, 'Bb7M'), (1135, '/'),
      (1175, 'A7'), (1246, '/'), (1377, 'D7M'), (1517, '/'), (1558, 'C#m7'), (1812, '/'),
      (2019, 'E7(9)'), (2180, '/'), (2221, 'A7(13)'), (2362, '/')],
     [(180, 'cantando'), (603, 'Por'), (685, 'baixo'), (862, 'da'), (927, 'terra,'),
      (1269, 'cantando'), (1676, 'Na'), (1751, 'boca'), (1916, 'do'), (1984, 'povo,')]),
    ([(288, 'D7M'), (550, '/'), (685, 'F6/9'), (899, '/'), (1064, 'Bb7M'), (1313, '/'),
      (1459, 'A7'), (1532, '/'), (1679, 'D7M'), (1930, '/'), (2054, 'F#7/C#'), (2312, '/')],
     [(180, 'cantando'), (444, 'Mendigo,'), (634, 'malandro,'), (829, 'moleque,'),
      (1010, 'mulambo,'), (1205, 'bem'), (1305, 'ou'), (1378, 'mal'), (1560, '(cantando)'),
      (1850, 'Escravo'), (2015, 'fugido'), (2220, 'ou'), (2289, 'louco')]),
    ([(231, 'Bm7'), (342, '/'), (516, 'F#7'), (784, '/'), (924, 'G6'), (999, '/'), (1189, 'A7'),
      (1311, '/'), (1414, 'F#m7(b5)'), (1646, '/'), (1688, 'B7(b9)'), (1956, '/'),
      (2207, 'E7(9)'), (2363, '/')],
     [(181, 'varrido'), (374, 'Vou'), (487, 'fazer'), (612, 'meu'), (714, 'festival'),
      (1031, 'Mambembe,'), (1350, 'cigano'), (1837, 'Debaixo'), (2077, 'da'), (2156, 'ponte,')]),
    ([(180, 'C7(9)'), (302, '/'), (444, 'F#m7'), (592, '/'), (634, 'F7(13)'), (919, '/'),
      (1140, 'Bb7M'), (1308, '/'), (1350, 'A7'), (1422, '/'), (1551, 'D7M'), (1662, '/'),
      (1704, 'C#m7'), (1978, '/'), (2192, 'E7(9)'), (2359, '/')],
     [(334, 'cantando'), (767, 'Por'), (851, 'baixo'), (1032, 'da'), (1100, 'terra,'),
      (1441, 'cantando'), (1832, 'Na'), (1912, 'boca'), (2084, 'do'), (2160, 'povo,')]),
    ([(180, 'A7(13)'), (321, '/'), (450, 'D7M'), (662, '/'), (784, 'F6/9'), (967, '/'),
      (1084, 'Bb7M'), (1270, '/'), (1471, 'A7'), (1545, '/'), (1680, 'D7M'), (1956, '/'),
      (2150, 'F#7/C#')],
     [(342, 'cantando'), (608, 'Poeta,'), (740, 'palhaço,'), (909, 'pirata,'), (1042, 'corisco,'),
      (1212, 'errante'), (1352, 'judeu'), (1561, '(cantando)'), (1853, 'Dormindo'), (2048, 'na'),
      (2111, 'estrada,'), (2321, 'não')]),
    ([(256, '/'), (487, 'Bm7'), (598, '/'), (795, 'F#7'), (1044, '/'), (1252, 'G6'), (1332, '/'),
      (1516, 'A7'), (1639, '/'), (1750, 'F#m7(b5)'), (1984, '/'), (2027, 'B7(b9)'), (2296, '/')],
     [(177, 'é'), (227, 'nada,'), (348, 'não'), (438, 'é'), (490, 'nada'), (640, 'E'),
      (695, 'esse'), (796, 'mundo'), (940, 'é'), (991, 'todo'), (1158, 'meu'), (1362, 'Mambembe,'),
      (1683, 'cigano'), (2172, 'Debaixo')]),
    ([(303, 'E7(9)'), (452, '/'), (494, 'C7(9)'), (616, '/'), (745, 'F#m7'), (892, '/'),
      (935, 'F7(13)'), (1231, '/'), (1451, 'Bb7M'), (1622, '/'), (1662, 'A7'), (1736, '/'),
      (1866, 'D7M'), (1986, '/'), (2028, 'C#m7'), (2296, '/')],
     [(175, 'da'), (246, 'ponte,'), (640, 'cantando'), (1068, 'Por'), (1157, 'baixo'),
      (1341, 'da'), (1412, 'terra,'), (1756, 'cantando'), (2154, 'Na'), (2234, 'boca')]),
    ([(290, 'E7(9)'), (447, '/'), (487, 'A7(13)'), (630, '/'), (764, 'D7M'), (914, '/'),
      (955, 'F6/9'), (1027, '/'), (1068, 'Bb7M'), (1200, '/'), (1241, 'A7'), (1314, '/'),
      (1355, 'D7M'), (1466, '/'), (1509, 'F6/9'), (1580, '/'), (1623, 'Bb7M'), (1756, '/'),
      (1798, 'A7'), (1871, '/'), (1914, 'D7M'), (2027, '/')],
     [(174, 'do'), (248, 'povo,'), (653, 'cantando')]),
]
MAMBEMBE_ACORDES = [
    'D7M', 'F6/9', 'Bb7M', 'A7', 'F#7/C#', 'Bm7', 'F#7', 'G6',
    'F#m7(b5)', 'B7(b9)', 'E7(9)', 'C7(9)', 'F#m7', 'F7(13)', 'C#m7', 'A7(13)',
]
MAMBEMBE_DIGITACOES = {
    'D7M':      {'frets': [-1, -1, 0, 2, 2, 2]},   # D  A  C# F#
    'F6/9':     {'frets': [-1, -1, 3, 2, 3, 3]},   # F  A  D  G
    'Bb7M':     {'frets': [-1, 1, 3, 2, 3, 1]},    # Bb F  A  D  F
    'A7':       {'frets': [-1, 0, 2, 0, 2, 0]},    # A  E  G  C# E
    'F#7/C#':   {'frets': [-1, 4, 4, 3, 5, -1]},   # C# F# A# E
    'Bm7':      {'frets': [-1, 2, 4, 2, 3, 2]},    # B  F# A  D  F#
    'F#7':      {'frets': [2, -1, 2, 3, 2, -1]},   # F# E  A# C#
    'G6':       {'frets': [3, -1, 2, 4, 3, -1]},   # G  E  B  D
    'F#m7(b5)': {'frets': [2, -1, 2, 2, 1, -1]},   # F# E  A  C
    'B7(b9)':   {'frets': [-1, 2, 1, 2, 1, -1]},   # B  D# A  C
    'E7(9)':    {'frets': [0, -1, 2, 1, 3, 2]},    # E  E  G# D  F#
    'C7(9)':    {'frets': [-1, 3, 2, 3, 3, -1]},   # C  E  Bb D
    'F#m7':     {'frets': [2, -1, 2, 2, 2, -1]},   # F# E  A  C#
    'F7(13)':   {'frets': [1, -1, 1, 2, 3, -1]},   # F  Eb A  D
    'C#m7':     {'frets': [-1, 4, 6, 4, 5, 4]},    # C# G# B  E  G#
    'A7(13)':   {'frets': [-1, 0, -1, 0, 2, 2]},   # A  G  C# F#
}

# --- Não sonho mais (livro 152–154, PDF 153–155) ---
# 13 sistemas: 11 na p.152 e 2 no alto da p.153 (o resto da 153 e a 154 são
# pauta). Margem esquerda diferente nas duas páginas, cada uma normalizada
# pelo seu x0.
NAO_SONHO_X0_P152 = 140
NAO_SONHO_X0_P153 = 217
NAO_SONHO_SISTEMAS_P152 = [
    ([(144, 'G(add9)'), (465, '/'), (669, 'D6/F#'), (909, '/'), (1067, 'Em7(9)'), (1329, '/'),
      (1550, 'E/D'), (1750, '/'), (1918, 'A7/C#'), (2291, '/')],
     [(144, 'Hoje'), (317, 'eu'), (399, 'sonhei'), (602, 'contigo'), (819, 'Tanta'),
      (1010, 'desdita,'), (1218, 'amor'), (1365, 'Nem'), (1482, 'te'), (1545, 'digo'),
      (1660, 'Tanto'), (1862, 'castigo'), (2086, 'Que'), (2192, 'eu'), (2270, 'tava')]),
    ([(199, 'D/C'), (449, '/'), (491, 'G(#9)'), (620, '/'), (666, '/'), (711, '/'),
      (759, 'G(add9)'), (1062, '/'), (1251, 'D6/F#'), (1496, '/'), (1768, 'Em7(9)'),
      (2011, '/'), (2128, 'E/D')],
     [(143, 'aflita'), (353, 'de'), (425, 'te'), (486, 'contar'), (756, 'Foi'), (926, 'um'),
      (1007, 'sonho'), (1198, 'medonho'), (1403, 'Desses'), (1608, 'que'), (1700, 'às'),
      (1768, 'vezes'), (1925, 'a'), (1979, 'gente'), (2101, 'sonha'), (2313, 'E')]),
    ([(210, '/'), (414, 'A7/C#'), (730, '/'), (827, 'D/C'), (1169, '/'), (1211, 'G(#9)'),
      (1340, '/'), (1385, '/'), (1430, '/'), (1477, 'Em7(9)'), (1742, '/'), (1909, 'B7/F#'),
      (2263, '/')],
     [(144, 'baba'), (328, 'na'), (409, 'fronha'), (569, 'E'), (626, 'se'), (692, 'urina'),
      (807, 'toda'), (991, 'E'), (1046, 'quer'), (1150, 'sufocar'), (1475, 'Meu'), (1632, 'amor'),
      (1781, 'Vi'), (1854, 'chegando'), (2068, 'um'), (2152, 'trem'), (2300, 'de')]),
    ([(206, 'G7(9)'), (450, '/'), (704, 'E7/G#'), (1064, '/'), (1326, 'Am7(9)'), (1636, '/'),
      (1752, 'D7(9)'), (2032, '/'), (2193, 'G7/4(9)'), (2324, '/')],
     [(142, 'candango'), (344, 'Formando'), (559, 'um'), (654, 'bando'), (910, 'Mas'),
      (1009, 'que'), (1099, 'era'), (1181, 'um'), (1264, 'bando'), (1518, 'de'),
      (1588, 'orangotango'), (1913, 'Pra'), (2011, 'te'), (2082, 'pegar')]),
    ([(143, 'G7(9)'), (267, '/'), (309, 'Em7(9)'), (532, '/'), (724, 'B7/D#'), (964, '/'),
      (1124, 'E/D'), (1323, '/'), (1466, '/'), (1648, '/'), (1883, 'A7/C#'), (2138, '/')],
     [(308, 'Vinha'), (464, 'nego'), (639, 'humilhado'), (878, 'Vinha'), (1008, 'morto-vivo'),
      (1234, 'Vinha'), (1365, 'flagelado'), (1550, 'De'), (1628, 'tudo'), (1733, 'que'),
      (1827, 'é'), (1881, 'lado'), (2047, 'Vinha'), (2181, 'um'), (2264, 'bom')]),
    ([(199, 'D/C'), (423, '/'), (500, 'G(#9)'), (622, '/'), (658, '/'), (693, '/'),
      (732, 'G(add9)'), (998, '/'), (1144, 'D6/F#'), (1395, '/'), (1511, 'Em7(9)'), (1759, '/'),
      (1844, 'E/D'), (2060, '/'), (2203, 'A7/C#')],
     [(143, 'motivo'), (312, 'Pra'), (400, 'te'), (461, 'esfolar'), (730, 'Quanto'), (894, 'mais'),
      (1031, 'tu'), (1088, 'corria'), (1287, 'Mais'), (1431, 'tu'), (1488, 'ficava'),
      (1652, 'Mais'), (1796, 'atolava'), (1949, 'Mais'), (2096, 'te'), (2157, 'sujava')]),
    ([(302, '/'), (414, 'D/C'), (699, '/'), (740, 'G(#9)'), (974, '/'), (1018, '/'), (1063, '/'),
      (1110, 'G(add9)'), (1439, '/'), (1599, 'D6/F#'), (1854, '/'), (2084, 'Em7(9)'), (2314, '/')],
     [(142, 'Amor,'), (281, 'tu'), (345, 'fedia'), (565, 'Empestava'), (865, 'o'), (916, 'ar'),
      (1112, 'Tu,'), (1281, 'que'), (1372, 'foi'), (1480, 'tão'), (1561, 'valente'),
      (1753, 'Chorou'), (1984, 'pra'), (2079, 'gente'), (2244, 'Pediu')]),
    ([(230, 'E/D'), (527, '/'), (698, 'A7/C#'), (956, '/'), (1095, 'D/C'), (1352, '/'),
      (1381, 'G(#9)'), (1500, '/'), (1534, '/'), (1567, '/'), (1604, 'Em7(9)'), (1872, '/'),
      (1984, 'B7/F#'), (2198, '/')],
     [(142, 'piedade'), (375, 'E'), (425, 'olha'), (556, 'que'), (642, 'maldade'), (843, 'Me'),
      (922, 'deu'), (1008, 'vontade'), (1250, 'De'), (1322, 'gargalhar'), (1602, 'Ao'),
      (1746, 'pé'), (1810, 'da'), (1907, 'ribanceira'), (2119, 'Acabou-se')]),
    ([(196, 'G7(9)'), (484, '/'), (633, 'E7/G#'), (914, '/'), (1031, 'Am7(9)'), (1334, '/'),
      (1431, 'D7(9)'), (1682, '/'), (1868, 'G7/4(9)'), (1999, '/'), (2040, 'G7(9)'), (2164, '/'),
      (2207, 'Em7(9)')],
     [(140, 'a'), (191, 'liça'), (307, 'E'), (354, 'escarrei-te'), (561, 'inteira'), (815, 'A'),
      (868, 'tua'), (948, 'carniça'), (1216, 'E'), (1263, 'tinha'), (1366, 'justiça'),
      (1591, 'Nesse'), (1719, 'escarrar'), (2207, 'Te')]),
    ([(250, '/'), (475, 'B7/D#'), (724, '/'), (891, 'E/D'), (1108, '/'), (1331, '/'), (1524, '/'),
      (1703, 'A7/C#'), (2108, '/'), (2206, 'D/C')],
     [(140, 'rasgamo'), (375, 'a'), (425, 'carcaça'), (635, 'Descemo'), (818, 'a'), (869, 'ripa'),
      (1046, 'Viramo'), (1200, 'as'), (1267, 'tripa'), (1434, 'Comemo'), (1616, 'os'),
      (1685, 'ovo'), (1906, 'Ai,'), (1987, 'e'), (2036, 'aquele'), (2177, 'povo')]),
    ([(212, '/'), (328, 'G(#9)'), (454, '/'), (493, '/'), (532, '/'), (574, 'G(add9)'),
      (874, '/'), (1062, 'D6/F#'), (1307, '/'), (1585, 'Em7(9)'), (1820, '/'), (1938, 'E/D'),
      (2254, '/')],
     [(140, 'Pôs-se'), (278, 'a'), (328, 'cantar'), (567, 'Foi'), (737, 'um'), (820, 'sonho'),
      (1011, 'medonho'), (1216, 'Desses'), (1422, 'que'), (1512, 'às'), (1579, 'vezes'),
      (1733, 'a'), (1783, 'gente'), (1906, 'sonha'), (2123, 'E'), (2188, 'baba'), (2298, 'na')]),
]
NAO_SONHO_SISTEMAS_P153 = [
    ([(260, 'A7/C#'), (615, '/'), (725, 'D/C'), (982, '/'), (1042, 'G(#9)'), (1244, '/'),
      (1283, '/'), (1321, '/'), (1363, 'G(add9)'), (1670, '/'), (1804, 'D6/F#'), (2100, '/'),
      (2242, 'Em7(9)')],
     [(217, 'fronha'), (483, 'E'), (539, 'se'), (606, 'urina'), (721, 'toda'), (834, 'E'),
      (886, 'já'), (951, 'não'), (1040, 'tem'), (1163, 'paz'), (1355, 'Pois'), (1519, 'eu'),
      (1589, 'sonhei'), (1726, 'contigo'), (2006, 'E'), (2061, 'caí'), (2140, 'da'),
      (2210, 'cama')]),
    ([(364, '/'), (570, 'E/D'), (938, '/'), (1052, 'A7/C#'), (1468, '/'), (1594, 'D/C'),
      (2007, '/'), (2048, 'G(#9)'), (2266, '/'), (2304, '/'), (2343, '/')],
     [(217, 'Ai,'), (300, 'amor,'), (429, 'não'), (520, 'briga'), (720, 'Ai,'), (804, 'não'),
      (894, 'me'), (972, 'castiga'), (1248, 'Ai,'), (1330, 'diz'), (1411, 'que'), (1500, 'me'),
      (1580, 'ama'), (1762, 'E'), (1818, 'eu'), (1889, 'não'), (1979, 'sonho'), (2168, 'mais')]),
]
NAO_SONHO_ACORDES = [
    'G(add9)', 'D6/F#', 'Em7(9)', 'E/D', 'A7/C#', 'D/C', 'G(#9)',
    'B7/F#', 'G7(9)', 'E7/G#', 'Am7(9)', 'D7(9)', 'G7/4(9)', 'B7/D#',
]
NAO_SONHO_DIGITACOES = {
    'G(add9)': {'frets': [3, -1, 0, 2, 0, -1]},    # G  D  A  B
    'D6/F#':   {'frets': [2, -1, 0, 2, 0, -1]},    # F# D  A  B
    'Em7(9)':  {'frets': [0, 2, 4, 0, 3, -1]},     # E  B  F# G  D
    'E/D':     {'frets': [-1, 5, 6, 4, 5, -1]},    # D  G# B  E
    'A7/C#':   {'frets': [-1, 4, 5, 2, 5, -1]},    # C# G  A  E
    'D/C':     {'frets': [-1, 3, 4, 2, 3, -1]},    # C  F# A  D
    'G(#9)':   {'frets': [3, -1, 0, 3, 0, -1]},    # G  D  A# B
    'B7/F#':   {'frets': [2, -1, 1, 2, 0, -1]},    # F# D# A  B
    'G7(9)':   {'frets': [3, -1, 3, 2, 0, -1]},    # G  F  A  B
    'E7/G#':   {'frets': [4, -1, 2, 4, 3, -1]},    # G# E  B  D
    'Am7(9)':  {'frets': [-1, 0, 5, 5, 0, 0]},     # A  G  C  B  E
    'D7(9)':   {'frets': [-1, 5, 4, 5, 5, -1]},    # D  F# C  E
    'G7/4(9)': {'frets': [3, -1, 3, 2, 1, -1]},    # G  F  A  C
    'B7/D#':   {'frets': [-1, 6, 7, 4, 7, -1]},    # D# A  B  F#
}

# --- Samba e amor (livro 187–189, PDF 188–190) ---
# Cifra inteira na p.187, 11 sistemas (as 188–189 são pauta melódica).
SAMBA_AMOR_X0 = 211
SAMBA_AMOR_SISTEMAS = [
    ([(288, 'Cm7'), (476, '/'), (712, 'F7/A'), (903, '/'), (1086, 'Ab6'), (1174, '/'),
      (1209, 'G7(b13)'), (1374, '/'), (1445, 'Cm7'), (1644, '/'), (1760, 'F7/A'), (2004, '/'),
      (2166, 'C/Bb'), (2304, '/'), (2343, '/'), (2381, '/')],
     [(214, 'Eu'), (285, 'faço'), (387, 'samba'), (573, 'e'), (615, 'amor'), (832, 'até'),
      (939, 'mais'), (1041, 'tarde'), (1394, 'E'), (1442, 'tenho'), (1558, 'muito'),
      (1733, 'sono'), (1939, 'de'), (2039, 'manhã')]),
    ([(215, 'F7/A'), (491, '/'), (574, 'Abm6'), (723, '/'), (887, 'Eb7M/G'), (1134, '/'),
      (1291, 'Abm6'), (1456, '/'), (1631, 'Am7(b5)'), (1948, '/'), (2119, 'D7(b9)'), (2259, '/')],
     [(214, 'Escuto'), (358, 'a'), (407, 'correria'), (756, 'da'), (826, 'cidade,'), (1168, 'que'),
      (1259, 'arde'), (1494, 'E'), (1548, 'apressa'), (1844, 'o'), (1896, 'dia'), (2034, 'de'),
      (2106, 'amanhã')]),
    ([(215, 'Dm7(9)'), (368, '/'), (406, 'Db7(9)'), (548, '/'), (644, 'Cm7'), (812, '/'),
      (996, 'F7/A'), (1268, '/'), (1370, 'Ab6'), (1460, '/'), (1496, 'G7(b13)'), (1655, '/'),
      (1765, 'Cm7'), (1897, '/'), (2013, 'F7/A'), (2284, '/')],
     [(567, 'De'), (640, 'madrugada'), (902, 'a'), (942, 'gente'), (1154, 'ainda'), (1296, 'se'),
      (1356, 'ama'), (1670, 'E'), (1719, 'a'), (1761, 'fábrica'), (1931, 'começa'), (2178, 'a'),
      (2219, 'buzinar')]),
    ([(213, 'C/Bb'), (352, '/'), (391, '/'), (430, '/'), (534, 'F7/A'), (684, '/'), (824, 'Abm6'),
      (1126, '/'), (1253, 'Eb7M/G'), (1511, '/'), (1626, 'Abm6'), (1812, '/'), (2002, 'Am7(b5)'),
      (2319, '/')],
     [(462, 'O'), (534, 'trânsito'), (719, 'contorna'), (996, 'a'), (1046, 'nossa'),
      (1222, 'cama,'), (1548, 'reclama'), (1852, 'Do'), (1944, 'nosso'), (2238, 'eterno')]),
    ([(307, 'D7(b9)'), (451, '/'), (591, 'Dm7(9)'), (746, '/'), (787, 'G7(b13)'), (953, '/'),
      (1093, 'Cm7(9)/G'), (1411, '/'), (1581, 'C7(b9)'), (1860, '/'), (1997, 'Fm7'), (2118, '/'),
      (2160, 'Bb7(b9)'), (2324, '/')],
     [(212, 'espreguiçar'), (982, 'No'), (1061, 'colo'), (1347, 'da'), (1448, 'bem-vinda'),
      (1764, 'companheira'), (2347, 'No')]),
    ([(264, 'Eb7(9)'), (492, '/'), (620, 'Db7(9)'), (850, '/'), (953, 'C7(#9)'), (1091, '/'),
      (1126, '/'), (1162, '/'), (1274, 'Cm7'), (1490, '/'), (1722, 'G7/B'), (1966, '/'),
      (2088, 'C/Bb'), (2215, '/'), (2250, 'F7/A'), (2379, '/')],
     [(212, 'corpo'), (435, 'do'), (534, 'bendito'), (794, 'violão'), (1178, 'Eu'), (1248, 'faço'),
      (1403, 'samba'), (1587, 'e'), (1628, 'amor'), (1848, 'a'), (1892, 'noite'),
      (2056, 'inteira')]),
    ([(214, 'Ab7'), (434, '/'), (796, 'G7(b13)'), (1062, '/'), (1200, 'Cm7'), (1307, '/'),
      (1347, 'G7(b13)'), (1512, '/'), (1615, 'Cm7'), (1822, '/'), (2076, 'F7/A'), (2283, '/')],
     [(307, 'Não'), (407, 'tenho'), (540, 'a'), (599, 'quem'), (733, 'prestar'),
      (967, 'satisfação'), (1543, 'Eu'), (1620, 'faço'), (1731, 'samba'), (1924, 'e'),
      (1974, 'amor'), (2208, 'até'), (2319, 'mais')]),
    ([(268, 'Ab6'), (362, '/'), (400, 'G7(b13)'), (574, '/'), (665, 'Cm7'), (883, '/'),
      (1084, 'F7/A'), (1363, '/'), (1495, 'C/Bb'), (1634, '/'), (1676, '/'), (1717, '/'),
      (1788, 'F7/A'), (2052, '/'), (2136, 'Abm6'), (2379, '/')],
     [(212, 'tarde'), (595, 'E'), (660, 'tenho'), (794, 'muito'), (986, 'mais'), (1213, 'o'),
      (1274, 'que'), (1395, 'fazer'), (1744, 'Escuto'), (1919, 'a'), (1968, 'correria'),
      (2314, 'da')]),
    ([(282, 'Eb7M/G'), (524, '/'), (713, 'Abm6'), (884, '/'), (1004, 'Am7(b5)'), (1391, '/'),
      (1483, 'D7(b9)'), (1710, '/'), (1864, 'Dm7(9)'), (2020, '/'), (2062, 'G7(b13)'),
      (2230, '/')],
     [(211, 'cidade,'), (557, 'que'), (649, 'alarde'), (914, 'Será'), (1170, 'que'), (1260, 'é'),
      (1310, 'tão'), (1420, 'difícil'), (1652, 'amanhecer?'), (2257, 'Não'), (2351, 'sei')]),
    ([(212, 'Cm7(9)/G'), (579, '/'), (687, 'C7(b9)'), (996, '/'), (1124, 'Fm7'), (1250, '/'),
      (1291, 'Bb7(b9)'), (1454, '/'), (1576, 'Eb7(9)'), (1827, '/'), (2007, 'Db7(9)'),
      (2258, '/')],
     [(430, 'se'), (496, 'preguiçoso'), (864, 'ou'), (937, 'se'), (1032, 'covarde'),
      (1482, 'Debaixo'), (1761, 'do'), (1870, 'meu'), (1972, 'cobertor'), (2298, 'de'),
      (2368, 'lã')]),
    ([(212, 'C7(#9)'), (348, '/'), (383, '/'), (419, '/'), (536, 'Cm7'), (749, '/'),
      (981, 'G7/B'), (1172, '/'), (1336, 'C/Bb'), (1461, '/'), (1492, 'F7/A'), (1617, '/'),
      (1655, 'Ab7'), (1802, '/'), (2014, 'G7(b13)'), (2231, '/'), (2314, 'Cm7')],
     [(440, 'Eu'), (512, 'faço'), (664, 'samba'), (842, 'e'), (884, 'amor'), (1096, 'até'),
      (1200, 'mais'), (1303, 'tarde'), (1730, 'E'), (1780, 'tenho'), (1897, 'muito'),
      (2019, 'sono'), (2170, 'de'), (2266, 'manhã')]),
]
SAMBA_AMOR_ACORDES = [
    'Cm7', 'F7/A', 'Ab6', 'G7(b13)', 'C/Bb', 'Abm6', 'Eb7M/G',
    'Am7(b5)', 'D7(b9)', 'Dm7(9)', 'Db7(9)', 'Cm7(9)/G', 'C7(b9)',
    'Fm7', 'Bb7(b9)', 'Eb7(9)', 'C7(#9)', 'G7/B', 'Ab7',
]
SAMBA_AMOR_DIGITACOES = {
    'Cm7':      {'frets': [-1, 3, 5, 3, 4, 3]},    # C  G  Bb Eb G
    'F7/A':     {'frets': [5, -1, 3, 5, 4, -1]},   # A  F  C  Eb
    'Ab6':      {'frets': [4, -1, 3, 5, 4, -1]},   # Ab F  C  Eb
    'G7(b13)':  {'frets': [3, -1, 3, 4, 4, -1]},   # G  F  B  Eb
    'C/Bb':     {'frets': [6, -1, 5, 5, 5, -1]},   # Bb G  C  E
    'Abm6':     {'frets': [4, -1, 3, 4, 4, -1]},   # Ab F  B  Eb
    'Eb7M/G':   {'frets': [3, -1, 1, 3, 3, -1]},   # G  Eb Bb D
    'Am7(b5)':  {'frets': [5, -1, 5, 5, 4, -1]},   # A  G  C  Eb
    'D7(b9)':   {'frets': [-1, 5, 4, 5, 4, -1]},   # D  F# C  Eb
    'Dm7(9)':   {'frets': [-1, 5, 3, 5, 5, -1]},   # D  F  C  E
    'Db7(9)':   {'frets': [-1, 4, 3, 4, 4, -1]},   # Db F  B  Eb
    # o livro desenha sem a fundamental: Sol-Mib-Sib-Ré sobre o baixo Sol
    'Cm7(9)/G': {'frets': [3, -1, 1, 3, 3, -1]},   # G  Eb Bb D
    'C7(b9)':   {'frets': [-1, 3, 2, 3, 2, -1]},   # C  E  Bb Db
    'Fm7':      {'frets': [1, -1, 1, 1, 1, -1]},   # F  Eb Ab C
    'Bb7(b9)':  {'frets': [-1, 1, 0, 1, 0, -1]},   # Bb D  Ab B
    'Eb7(9)':   {'frets': [-1, 6, 5, 6, 6, -1]},   # Eb G  Db F
    'C7(#9)':   {'frets': [-1, 3, 2, 3, 4, -1]},   # C  E  Bb Eb
    'G7/B':     {'frets': [-1, 2, -1, 0, 3, 1]},   # B  G  D  F
    'Ab7':      {'frets': [4, -1, 4, 5, 4, -1]},   # Ab Gb C  Eb
}

# Músicas já transcritas. Cada entrada:
#   {'title', 'artist', 'tom', 'estilo', 'pagina_livro', 'pagina_pdf',
#    'texto', 'acordes': [...], 'digitacoes': {...}, 'fonte': 'Songbook'}
SONGS = [
    {
        'title': 'A Rosa',
        'artist': ARTISTA,
        'tom': 'C',
        'estilo': 'MPB',
        'fonte': 'Songbook',
        'pagina_livro': 68,
        'pagina_pdf': 69,
        'systems': A_ROSA_SISTEMAS,
        'x0': 0,
        # 18 px por coluna, não os 19 do padrão: o corpo deste livro é menor que
        # o dos outros Lumiar (11 px de altura de linha a 150 dpi contra ~18).
        # Medido: com 18 nenhum token precisa ser empurrado para a direita nos 28
        # sistemas; com 19 já são 4.
        'scale': 18,
        'acordes': A_ROSA_ACORDES,
        'digitacoes': A_ROSA_DIGITACOES,
    },
    {
        'title': 'Mambembe',
        'artist': ARTISTA,
        'tom': 'D',
        'estilo': 'MPB',
        'fonte': 'Songbook',
        'pagina_livro': 138,
        'pagina_pdf': 139,
        'systems': _desloca(MAMBEMBE_SISTEMAS, MAMBEMBE_X0),
        'x0': 0,
        'scale': 16,
        'acordes': MAMBEMBE_ACORDES,
        'digitacoes': MAMBEMBE_DIGITACOES,
    },
    {
        'title': 'Não sonho mais',
        'artist': ARTISTA,
        'tom': 'G',
        'estilo': 'MPB',
        'fonte': 'Songbook',
        'pagina_livro': 152,
        'pagina_pdf': 153,
        'systems': (_desloca(NAO_SONHO_SISTEMAS_P152, NAO_SONHO_X0_P152)
                    + _desloca(NAO_SONHO_SISTEMAS_P153, NAO_SONHO_X0_P153)),
        'x0': 0,
        'scale': 16,
        'acordes': NAO_SONHO_ACORDES,
        'digitacoes': NAO_SONHO_DIGITACOES,
    },
    {
        'title': 'Samba e amor',
        'artist': ARTISTA,
        'tom': 'Cm',
        'estilo': 'MPB',
        'fonte': 'Songbook',
        'pagina_livro': 187,
        'pagina_pdf': 188,
        'systems': _desloca(SAMBA_AMOR_SISTEMAS, SAMBA_AMOR_X0),
        'x0': 0,
        'scale': 16,
        'acordes': SAMBA_AMOR_ACORDES,
        'digitacoes': SAMBA_AMOR_DIGITACOES,
    },
]
