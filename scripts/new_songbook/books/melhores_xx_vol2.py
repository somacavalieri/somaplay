# Songbook "As 101 Melhores Canções do Século XX", vol. 2
# (Almir Chediak / Lumiar, 2ª edição) — 51 músicas, 158 páginas no PDF.
#
# Os dois volumes são uma obra só: 50 músicas no vol. 1 + 51 no vol. 2 = 101,
# sem nenhum título repetido entre eles. Cada volume tem lista alfabética própria
# e paginação própria, então cada um é um BOOK separado aqui.
#
# MAPA DE PÁGINAS — offset único e constante: pdf = livro − 11.
# Ao contrário do Caetano vol. 2, este scan é limpo: os fólios impressos das
# 158 páginas foram lidos um por um, o offset não muda em nenhum ponto, não há
# página ausente, fora de ordem nem duplicada (conferido também por hash), e as
# 51 músicas cobrem as páginas 15–169 sem buraco nem sobreposição.
# O scan pula as págs. 4–14 do livro (apresentação e fotos): pdf 4 = livro 15.
#
# Índice legível para acompanhar a extração: <pasta do livro>/INDICE-VOL2.md

BOOK = 'melhores-xx-vol2'
FOLDER = ('/Users/somacavalieri/Library/CloudStorage/GoogleDrive-somacavalieri@gmail.com/'
          'My Drive/_claude/somaplay/chords/-new-songbook/'
          'Songbook - As 101 Melhores Canções do século xx - Vol I -Almir Chediak vol1-2')
PDF = f'{FOLDER}/Songbook - As 101 Melhores Canções do século xx - Vol II -Almir Chediak.pdf'

OFFSET = -11
PRIMEIRA_PAGINA_LIVRO = 15
ULTIMA_PAGINA_LIVRO = 169


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
    ('Agora é cinza', 15, 16, 'Alcebíades Barcelos (Bide) e Armando Marçal', 1934),
    ('Águas de março', 17, 23, 'Antonio Carlos Jobim', 1972),   # A mais longa dos dois volumes: 7 páginas
    ('Ai, que saudade da Amélia', 24, 25, 'Ataulfo Alves e Mário Lago', 1942),
    ('Andança', 26, 29, 'Danilo Caymmi, Edmundo Souto e Paulinho Tapajós', 1968),
    ('A noite do meu bem', 30, 31, 'Dolores Duran', 1959),
    ('Apelo', 32, 34, 'Baden Powell e Vinicius de Moraes', 1966),
    ('Asa branca', 35, 37, 'Luiz Gonzaga e Humberto Teixeira', 1947),
    ('Atrás da porta', 38, 40, 'Francis Hime e Chico Buarque', 1972),   # Também no Bossa Nova 1 (livro p.46) — não importar duas vezes
    ('A volta do boêmio', 41, 43, 'Adelino Moreira', 1957),
    ('Barracão', 44, 45, 'Luiz Antônio e Oldemar Magalhães', 1952),
    ('Beijo partido', 46, 48, 'Toninho Horta', 1975),
    ('Brasil', 49, 52, 'Cazuza, George Israel e Nilo Romero', 1988),
    ('Canta Brasil', 53, 57, 'Alcyr Pires Vermelho e David Nasser', 1941),
    ('Carcará', 58, 60, 'João do Vale e José Cândido', 1965),
    ('Carinhoso', 61, 63, 'Pixinguinha e João de Barro', 1937),
    ('Casa no campo', 64, 66, 'Zé Rodrix e Tavito', 1972),
    ('Chega de saudade', 67, 70, 'Antonio Carlos Jobim e Vinicius de Moraes', 1958),
    ('Cidade Maravilhosa', 71, 72, 'André Filho', 1934),
    ('Começaria tudo outra vez', 73, 75, 'Gonzaguinha', 1977),
    ('Como uma onda', 76, 78, 'Lulu Santos e Nelson Motta', 1983),
    ('Coração bobo', 79, 82, 'Alceu Valença', 1980),
    ('De conversa em conversa', 83, 85, 'Lúcio Alves e Haroldo Barbosa', 1947),
    ('Detalhes', 86, 90, 'Roberto Carlos e Erasmo Carlos', 1971),
    ('Dia branco', 91, 92, 'Geraldo Azevedo e Renato Rocha', 1976),
    ('Disparada', 93, 98, 'Theo de Barros e Geraldo Vandré', 1966),
    ('Diz que fui por aí', 99, 101, 'Hortêncio Rocha e Zé Kéti', 1964),
    ('Flor-de-lis', 102, 104, 'Djavan', 1977),
    ('Folhas secas', 105, 107, 'Nelson Cavaquinho e Guilherme de Brito', 1973),
    ('Garota de Ipanema', 108, 109, 'Antonio Carlos Jobim e Vinicius de Moraes', 1963),
    ('Jura', 110, 112, 'Sinhô', 1929),
    ('Louco (Ela é seu mundo)', 113, 114, 'Henrique de Almeida e Wilson Batista', 1946),   # A página traz `Louco` no título e `Ela é seu mundo` como subtítulo
    ('Madalena', 115, 117, 'Ivan Lins e Ronaldo Monteiro de Souza', 1970),
    ('Manhã de carnaval', 118, 119, 'Luiz Bonfá e Antônio Maria', 1959),
    ('Maracatu atômico', 120, 123, 'Nelson Jacobina e Jorge Mautner', 1974),
    ('Marina', 124, 125, 'Dorival Caymmi', 1947),
    ('Minha namorada', 126, 128, 'Carlos Lyra e Vinicius de Moraes', 1963),   # Também no Bossa Nova 1 (livro p.102) — não importar duas vezes
    ('Mulata assanhada', 129, 130, 'Ataulfo Alves', 1956),
    ('No Rancho Fundo', 131, 133, 'Ary Barroso e Lamartine Babo', 1931),
    ('O bêbado e a equilibrista', 134, 137, 'João Bosco e Aldir Blanc', 1979),
    ('O teu cabelo não nega', 138, 139, 'Lamartine Babo e Irmãos Valença', 1932),
    ('Ouça', 140, 141, 'Maysa', 1957),
    ('Pérola Negra', 142, 145, 'Luiz Melodia', 1972),   # Índice grafa `Pérola negra`; a página da música grafa `Pérola Negra`
    ('Ronda', 146, 147, 'Paulo Vanzolini', 1953),
    ('Samba de verão', 148, 149, 'Marcos Valle e Paulo Sérgio Valle', 1965),
    ('Se você jurar', 150, 152, 'Ismael Silva, Newton Bastos e Francisco Alves', 1931),
    ('Todo o sentimento', 153, 155, 'Cristovão Bastos e Chico Buarque', 1987),
    ('Trem das onze', 156, 158, 'Adoniran Barbosa', 1964),
    ('Tudo que você podia ser', 159, 161, 'Lô Borges e Márcio Borges', 1971),
    ('Último desejo', 162, 164, 'Noel Rosa', 1936),
    ('Viagem', 165, 166, 'João de Aquino e Paulo César Pinheiro', 1969),
    ('Zelão', 167, 169, 'Sérgio Ricardo', 1960),
]

# ARTISTA — decidido: o PRIMEIRO compositor creditado.
# Esta é uma coletânea: as 51 músicas têm 48 compositores distintos, então o
# truque do Caetano vol. 2 (um artista só para o livro inteiro) não serve. Cada
# música entra sob o primeiro nome do crédito, como bossa_nova_1.py fez com
# 'Baden Powell'. A lente de Artistas fica com muitos nomes de 1 música só, e
# isso é aceitável de propósito: make_somaplay reaproveita artista por NOME, logo
# 'Chico Buarque' daqui funde com o songbook de Chico, e esses artistas vão
# enchendo conforme entram mais livros. O crédito completo fica em INDICE.
def artista_de(compositores):
    """Artista no app a partir do crédito do livro: o primeiro compositor."""
    return compositores.split(' e ')[0].split(',')[0].strip()


# Músicas já transcritas. Cada entrada:
#   {'title', 'artist', 'tom', 'estilo', 'pagina_livro', 'pagina_pdf',
#    'texto', 'acordes': [...], 'digitacoes': {...}, 'fonte': 'Songbook'}
SONGS = []
