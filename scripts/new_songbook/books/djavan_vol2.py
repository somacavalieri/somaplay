# Songbook Djavan vol. 2 (Almir Chediak / Lumiar, 1997, 3ª edição) — 49 músicas,
# 176 págs no PDF.
# chords/-new-songbook/Djavan Vol 2 - Almir Chediak/Songbook - Djavan Vol. 2.pdf
#
# Mapa de páginas VERIFICADO (fólio das 176 páginas + título das 49 músicas +
# Copyright impresso no fim de cada uma):
#
#   livro 6..168   -> pdf = livro + 1     (todas as músicas caem aqui)
#   livro 169      -> AUSENTE do scan (página em branco, não escaneada)
#   livro 170..171 -> pdf = livro         (Discografia)
#   pdf 172..176   -> catálogo da Lumiar e contracapa, sem fólio
#
# Nenhuma página do livro faltando, duplicada ou em branco entre a 31 e a 168, e
# nenhuma página byte-idêntica no arquivo inteiro.
#
# ATENÇÃO ao começar a extrair: este scan é BITONAL (1 bit) a 200 dpi — o mais
# pobre do pipeline até agora. Os limiares de leitura da grade de diagramas
# anotados para os outros livros foram medidos a 300 dpi e NÃO valem aqui sem
# recalibração; sendo 1 bit, não há nível de cinza para separar "ponto apagado"
# de célula vazia. Recalibrar na primeira música e conferir toda forma pelo teste
# das notas. Detalhes e demais avisos no INDICE.md da pasta do livro.

BOOK = 'djavan-vol2'
FOLDER = ('/Users/somacavalieri/Library/CloudStorage/GoogleDrive-somacavalieri@gmail.com/'
          'My Drive/_claude/somaplay/chords/-new-songbook/Djavan Vol 2 - Almir Chediak')
PDF = f'{FOLDER}/Songbook - Djavan Vol. 2.pdf'

PAGINAS_AUSENTES = {169: 'página em branco entre a última música e a Discografia'}


def pdf_page(livro):
    """Página do PDF (1-based) para uma página do livro. None se não foi escaneada."""
    if livro in PAGINAS_AUSENTES:
        return None
    if 6 <= livro <= 168:
        return livro + 1
    if 170 <= livro <= 171:
        return livro
    raise ValueError(f'página {livro} fora do livro')


# Índice completo, em ORDEM DE PÁGINA (o índice impresso é alfabético e a
# paginação não segue essa ordem; esta é a ordem de extração).
# (título, 1ª página do livro, última, compositores)
# Compositores lidos do subtítulo da página da música — o índice deste livro não
# traz compositor nenhum.
INDICE = [
    ('Açaí', 31, 32, 'Djavan'),                              # scordatura: 1ª corda em Ré
    ('Álibi', 33, 35, 'Djavan'),
    ('Asa', 36, 39, 'Djavan'),
    ('Água', 40, 42, 'Djavan'),
    ('A rota do indivíduo (Ferrugem)', 43, 45, 'Djavan e Orlando Morais'),
    ('Aliás', 46, 48, 'Djavan'),
    ('Banho de rio', 49, 52, 'Djavan'),
    ('Curumim', 53, 55, 'Djavan'),
    ('Capim', 56, 57, 'Djavan'),
    ('Cara de índio', 58, 59, 'Djavan'),
    ('De flor em flor', 60, 62, 'Djavan'),
    ('Doidice', 63, 65, 'Djavan'),
    ('Dou-não-dou', 66, 68, 'Djavan'),
    ('Esfinge', 69, 71, 'Djavan'),
    ('E que Deus ajude', 72, 74, 'Djavan'),
    ('Estória de cantador', 75, 77, 'Djavan'),
    ('Faltando um pedaço', 78, 80, 'Djavan'),
    ('Fato consumado', 81, 83, 'Djavan'),
    ('Infinito', 84, 86, 'Djavan'),
    ('Lei', 87, 89, 'Djavan'),
    ('Lambada de serpente', 90, 91, 'Djavan e Cacaso'),
    ('Linha do equador', 92, 94, 'Djavan e Caetano Veloso'),
    ('Luz', 95, 97, 'Djavan'),
    ('Luanda', 98, 99, 'Djavan'),
    ('Malásia', 100, 102, 'Djavan'),
    ('Seca', 103, 105, 'Djavan'),
    ('Meu bem-querer', 106, 108, 'Djavan'),
    ('Maçã do rosto', 109, 111, 'Djavan'),
    ('Minha irmã', 112, 114, 'Djavan'),
    ('Maria das Mercedes', 115, 117, 'Djavan'),
    ('Muito obrigado', 118, 120, 'Djavan'),
    ('Miragem', 121, 123, 'Djavan'),
    ('Nobreza', 124, 125, 'Djavan'),       # página cortada no índice impresso
    ('Obi', 126, 128, 'Djavan'),           # página cortada no índice impresso
    ('Oceano', 129, 131, 'Djavan'),        # página cortada no índice impresso
    ('Pára-raio', 132, 134, 'Djavan'),
    ('Quase de manhã', 135, 136, 'Djavan'),
    ('Romance (Laranjinha)', 137, 138, 'Djavan'),
    ('Sururu de capote', 139, 141, 'Djavan'),
    ('Samurai', 142, 143, 'Djavan'),
    ('Seduzir', 144, 145, 'Djavan'),
    ('Segredo', 146, 147, 'Djavan'),
    ('Sina', 148, 151, 'Djavan'),
    ('Tenha calma', 152, 153, 'Djavan'),
    ('Topázio', 154, 155, 'Djavan'),
    ('Total abandono', 156, 158, 'Djavan'),
    ('Transe', 159, 161, 'Djavan'),
    ('Violeiros', 162, 165, 'Djavan'),
    ('Você bem sabe', 166, 168, 'Djavan e Nelson Motta'),
]

# Artista no app: 'Djavan' para todas as 49, inclusive as 4 em parceria — senão a
# lente de Artistas quebra o songbook em cinco artistas. O crédito completo fica
# em INDICE.
ARTISTA = 'Djavan'


# Músicas já transcritas. Cada entrada:
#   {'title', 'artist', 'tom', 'estilo', 'pagina_livro', 'pagina_pdf',
#    'texto' (ou 'systems' + 'scale'), 'acordes': [...], 'digitacoes': {...},
#    'fonte': 'Songbook'}
SONGS = []
