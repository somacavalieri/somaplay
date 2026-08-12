# Songbook Cazuza vol. 1 (Almir Chediak / Lumiar) — 32 músicas, 66 págs no PDF.
# chords/-new-songbook/Cazuza Vol 1 - Almir Chediak/
#     399129149-kupdf-net-cazuza-songbook-pdf.pdf
#
# MAPA DE PÁGINAS — offset único e constante: pdf = livro − 40.
# Os fólios impressos das 66 páginas foram lidos um a um: o offset não muda em
# ponto nenhum, não há página ausente nem duplicada (também conferido por hash),
# e as 32 músicas foram confirmadas TÍTULO A TÍTULO na página prevista, com uma
# varredura da faixa de título das 64 páginas do miolo (pdf 3–66).
#
# ATENÇÃO — este PDF NÃO É O LIVRO INTEIRO. É só a seção MÚSICAS: começa na
# p.43 do livro (pdf 3) e termina na p.106 (pdf 66). As págs. 1–42 (prefácio,
# depoimentos, biografia, álbum de família) e a Discografia (p.108) não foram
# escaneadas. Só a capa (pdf 1) e o índice impresso (pdf 2) vieram junto.
#
# ATENÇÃO ao começar a extrair: scan BITONAL (1 bit) a ~140-152 dpi, com
# chuvisco. É o segundo pior do pipeline, na faixa do Rita Lee (141-145 dpi) e
# abaixo dos 300 dpi dos outros Chediak. Consequências medidas, não estimadas:
#   - `measure_cifra.py` no padrão NÃO separa as linhas: o detector de banda usa
#     "qualquer tinta na linha" e o chuvisco costura tudo numa banda só (a p.43
#     saiu como 1 banda de 1193 px). Com o limiar de densidade (`--densidade`,
#     adicionado ao script por causa deste livro) as 14 linhas da p.43 saem
#     separadas — 7 sistemas × (acordes + letra). SEMPRE usar --densidade aqui:
#         measure_cifra.py <pdf> 3 -y0 0.28 -y1 0.565 --densidade 0.02
#     0.02 é o valor medido; 0.005 e 0.01 ainda grudam linhas. E atenção: com
#     recorte mais largo o 0.01 devolve 14 bandas que NÃO são as 14 linhas — o
#     número bater não prova nada, conferir os PNG de banda. Tabela no INDICE.md.
#   - Sendo 1 bit não há nível de cinza para separar "ponto apagado" de célula
#     vazia na grade de diagramas. Os limiares anotados nos outros livros foram
#     medidos a 300 dpi e NÃO valem aqui. Recalibrar na primeira música e
#     conferir toda forma pelo teste das notas; se a grade não for legível nesta
#     resolução, a saída honesta é deixar `cifra.digitacoes` vazio neste livro
#     em vez de fixar forma errada.
# Inclinação é baixa e sem drama (mediana −0,25°, faixa −0,50° a +0,50°) e as
# bordas estão limpas (0,3% de tinta) — o problema aqui é resolução e chuvisco,
# não geometria.
#
# Índice legível para acompanhar a extração: <pasta do livro>/INDICE.md

BOOK = 'cazuza-vol1'
FOLDER = ('/Users/somacavalieri/Library/CloudStorage/GoogleDrive-somacavalieri@gmail.com/'
          'My Drive/_claude/somaplay/chords/-new-songbook/'
          'Cazuza Vol 1 - Almir Chediak')
PDF = f'{FOLDER}/399129149-kupdf-net-cazuza-songbook-pdf.pdf'

OFFSET = -40
PRIMEIRA_PAGINA_LIVRO = 43    # Maior abandonado, 1ª música (pdf 3)
ULTIMA_PAGINA_LIVRO = 106     # Ponto fraco, última (pdf 66)


def pdf_page(livro):
    """Página do PDF (1-based) para uma página do livro.

    Só o miolo de música existe neste scan. Erra alto em vez de devolver um
    número inventado: pedir a p.20 (biografia) ou a p.108 (discografia) é bug de
    chamada, não caso normal.
    """
    if not PRIMEIRA_PAGINA_LIVRO <= livro <= ULTIMA_PAGINA_LIVRO:
        raise ValueError(
            f'página {livro} não está neste scan — só o miolo de música '
            f'({PRIMEIRA_PAGINA_LIVRO}–{ULTIMA_PAGINA_LIVRO}) foi digitalizado')
    return livro + OFFSET


# Índice completo, em ORDEM DE PÁGINA (= ordem de extração).
# (título, 1ª página do livro, última, compositores)
#
# A ordem alfabética do índice impresso NÃO é a ordem física: 'Maior abandonado'
# abre o miolo na p.43 (antes de 'Azul e amarelo', na p.44) e 'Ponto fraco'
# fecha na p.106. Usar esta lista, que está em ordem de página.
#
# Títulos e compositores lidos do bloco de título da PÁGINA DA MÚSICA, não do
# índice impresso — os dois divergem numa entrada:
#   índice 'Subproduto DE rock'  →  página 'Subproduto DO rock'
# (o resumo da própria Lumiar também escreve 'do rock' — ver INDICE.md.)
#
# Quase todas ocupam 2 páginas. As exceções: 'Maior abandonado' e 'Ponto fraco'
# cabem em 1, e 'Doralinda' ocupa 4 (66–69) — é ela que preenche o vão que o
# índice impresso deixa em aberto, por ser a única entrada sem número de página.
INDICE = [
    ('Maior abandonado', 43, 43, 'Frejat e Cazuza'),
    ('Azul e amarelo', 44, 45, 'Cazuza, Lobão e Cartola'),
    ('Baby suporte', 46, 47, 'Cazuza, Barros, Pequinho e Ezequiel'),
    ('Balada do Esplanada', 48, 49, 'Cazuza — poema de Carlos Drummond de Andrade'),
    ('Bete Balanço', 50, 51, 'Cazuza e Frejat'),
    ('Billy Negão', 52, 53, 'Cazuza, Goffi e Barros'),
    ('Blues da piedade', 54, 55, 'Cazuza e Frejat'),
    ('Carente profissional', 56, 57, 'Cazuza e Frejat'),
    ('Cobaias de Deus', 58, 59, 'Cazuza e Ângela Rô Rô'),
    ('Codinome Beija-flor', 60, 61, 'Arias, Cazuza e Ezequiel'),
    ('Conto de fadas', 62, 63, 'Cazuza e Barros'),
    ('De quem é o poder', 64, 65, 'Cazuza, George Israel e Nilo Romero'),
    ('Doralinda', 66, 69, 'João Donato e Cazuza'),
    ('Eu queria ter uma bomba', 70, 71, 'Cazuza'),
    ('Eu quero alguém', 72, 73, 'Cazuza e Renato Rocket'),
    ('Hei rei', 74, 75, 'Cazuza e Frejat'),
    ('Mal nenhum', 76, 77, 'Cazuza e Lobão'),
    ('Manhatã', 78, 79, 'Cazuza e Leoni'),
    ('Nabucodonosor', 80, 81, 'Cazuza e George Israel'),
    ('O tempo não pára', 82, 83, 'Cazuza e Arnaldo Brandão'),
    ('Posando de star', 84, 85, 'Cazuza'),
    ('Preciso dizer que te amo', 86, 87, 'Cazuza, Dé e Bebel'),
    ('Pro dia nascer feliz', 88, 89, 'Frejat e Cazuza'),
    ('Quando eu estiver cantando', 90, 91, 'Cazuza e João Rebouças'),
    ('Quarta-feira', 92, 93, 'Cazuza e Zé Luís'),
    ('Ritual', 94, 95, 'Cazuza e Frejat'),
    ('Só as mães são felizes', 96, 97, 'Cazuza e Frejat'),
    ('Subproduto do rock', 98, 99, 'Cazuza e Frejat'),
    ('Um trem para as estrelas', 100, 101, 'Cazuza e Gilberto Gil'),
    ('Vai à luta', 102, 103, 'Cazuza e Rogério Meanda'),
    ('Vem comigo', 104, 105, 'Cazuza, Dé e Goffi'),
    ('Ponto fraco', 106, 106, 'Cazuza e Frejat'),
]

# Artista no app: 'Cazuza' nas 32, inclusive nas 30 em parceria e nas 3 em que o
# nome dele não vem primeiro no crédito impresso (Maior abandonado, Pro dia
# nascer feliz, Codinome Beija-flor) — mesma decisão do Caetano vol. 2, do Chico
# vol. 1, do Caymmi vol. 2 e da Rita Lee: senão a lente de Artistas quebra o
# songbook em vinte e poucos artistas. O crédito completo fica em INDICE acima e
# no INDICE.md da pasta.
ARTISTA = 'Cazuza'

# Grafia do livro é a de 1990, anterior ao Acordo Ortográfico: 'O tempo não
# pára' leva acento agudo em 'pára' (conferido a 300 dpi na p.82). Mantida como
# está impressa — é o título como o autor da cifra o escreveu, e é assim que a
# música é conhecida.

# Músicas já transcritas. Cada entrada:
#   {'title', 'artist', 'tom', 'estilo', 'pagina_livro', 'pagina_pdf',
#    'texto' OU 'systems'+'x0'+'scale', 'acordes': [...], 'digitacoes': {...},
#    'fonte': 'Songbook'}
SONGS = []
