# Songbook Rita Lee (Lumiar) — SELEÇÃO de DOIS volumes, 10 músicas em 22 págs.
# chords/-new-songbook/Rita Lee vols 1 e 2 (seleção) - Lumiar/
#     699064141-Rita-Lee-Songbook-selecao-Lumiar.pdf
#
# ATENÇÃO, este livro é diferente de todos os outros do pipeline: NÃO É UM LIVRO.
# É um recorte de fotocópias do vol. 1 e do vol. 2 do songbook, encadernados
# juntos. As duas paginações são independentes e COLIDEM — a p.62 é *Lança
# perfume* no vol. 2 e uma música não selecionada no vol. 1. Por isso aqui a
# música é identificada pelo par (volume, página), nunca só pela página, e não
# existe função `pdf_page(livro)` como nos outros módulos: existe
# `pdf_page(vol, livro)`.
#
# De onde saiu o volume de cada música: quem montou a seleção escreveu a lápis
# `RL1`/`RL2` no rodapé da última página de 9 das 10 músicas. A leitura se
# confirma sozinha — separadas pelos dois grupos, as músicas ficam em ordem
# alfabética perfeita dentro de cada volume, que é como os Lumiar são paginados.
# A 10ª (Bem-me-quer) não tem marca; o vol. 1 dela é DEDUÇÃO, ver INDICE.md.
#
# ATENÇÃO ao começar a extrair: este scan é BITONAL (1 bit) a ~141-145 dpi — o
# PIOR do pipeline até agora, abaixo dos 200 dpi do Djavan vol. 2. E a p.20
# (Bem-me-quer) é outro scan ainda pior: 115 dpi, em cor. Os limiares de leitura
# da grade de diagramas anotados nos outros livros foram medidos a 300 dpi e NÃO
# valem aqui; sendo 1 bit não há nível de cinza para separar "ponto apagado" de
# célula vazia. Recalibrar na primeira música e conferir toda forma pelo teste
# das notas — e se a grade não for legível nesta resolução, a saída honesta é
# deixar `cifra.digitacoes` vazio neste livro em vez de digitar forma errada.
# Detalhes e demais avisos no INDICE.md da pasta.

BOOK = 'rita-lee-selecao'
FOLDER = ('/Users/somacavalieri/Library/CloudStorage/GoogleDrive-somacavalieri@gmail.com/'
          'My Drive/_claude/somaplay/chords/-new-songbook/'
          'Rita Lee vols 1 e 2 (seleção) - Lumiar')
PDF = f'{FOLDER}/699064141-Rita-Lee-Songbook-selecao-Lumiar.pdf'

# Páginas do PDF que NÃO são do songbook: Guitar Player Brasil, março/2003,
# págs. 110-112 — transcrição do solo de Luiz Carlini em *Ovelha Negra*
# (pauta + tablatura, por Bira Mendes). Conteúdo de terceiros e nem é cifra:
# não entra no .somaplay.
PAGINAS_NAO_SONGBOOK = {17: 'GP 110', 18: 'GP 111', 19: 'GP 112'}

# (volume, página do livro) -> página do PDF. Mapa explícito, não fórmula: só as
# 22 páginas em mãos existem, e o offset não é regular porque a seleção pula
# músicas. Levantado lendo o fólio impresso das 22 páginas a 300 dpi.
PAGINAS = {
    (2, 36): 1,  (2, 37): 2,   # Baila comigo
    (2, 38): 3,  (2, 39): 4,   # Balada do louco
    (1, 52): 5,  (1, 53): 6,   # Doce vampiro
    (1, 56): 7,  (1, 57): 8,   # Flagra
    (1, 60): 9,  (1, 61): 10,  # Jardins da Babilônia
    (2, 62): 11, (2, 63): 12,  # Lança perfume
    (2, 66): 13, (2, 67): 14,  # Mania de você
    (1, 76): 15, (1, 77): 16,  # Ovelha negra
    (1, 27): 20,               # Bem-me-quer (1 página só; volume deduzido)
    (1, 80): 21, (1, 81): 22,  # Saúde
}


def pdf_page(vol, livro):
    """Página do PDF (1-based) para (volume, página do livro).

    Só as páginas selecionadas existem — o resto dos dois volumes não está neste
    arquivo. Erra alto em vez de devolver None: pedir uma página que não foi
    fotocopiada é bug de chamada, não caso normal.
    """
    try:
        return PAGINAS[(vol, livro)]
    except KeyError:
        raise ValueError(
            f'vol. {vol} p.{livro} não está nesta seleção '
            f'(só {sorted(p for v, p in PAGINAS if v == vol)} do vol. {vol})')


# Índice completo, em ORDEM DE PÁGINA DO PDF (= ordem em que a seleção foi
# encadernada: alfabética dentro de cada volume, com os dois intercalados e
# Bem-me-quer jogada no fim).
# (título, volume, 1ª página do livro, última, compositores)
# Compositores lidos do subtítulo da página de cada música — este PDF não tem
# sumário nem índice impresso para conferir contra.
INDICE = [
    ('Baila comigo',         2, 36, 37, 'Rita Lee'),
    ('Balada do louco',      2, 38, 39, 'Arnaldo Baptista e Rita Lee'),
    ('Doce vampiro',         1, 52, 53, 'Rita Lee'),
    ('Flagra',               1, 56, 57, 'Roberto de Carvalho e Rita Lee'),
    ('Jardins da Babilônia', 1, 60, 61, 'Rita Lee e Lee Marcucci'),
    ('Lança perfume',        2, 62, 63, 'Rita Lee e Roberto de Carvalho'),
    ('Mania de você',        2, 66, 67, 'Roberto de Carvalho e Rita Lee'),
    ('Ovelha negra',         1, 76, 77, 'Rita Lee'),
    ('Bem-me-quer',          1, 27, 27, 'Roberto de Carvalho e Rita Lee'),  # vol. deduzido
    ('Saúde',                1, 80, 81, 'Roberto de Carvalho e Rita Lee'),
]

# Artista no app: 'Rita Lee' para todas as 10, inclusive as 7 em parceria
# (Arnaldo Baptista, Roberto de Carvalho, Lee Marcucci) — senão a lente de
# Artistas quebra o songbook em vários artistas. O crédito completo fica em
# INDICE e no INDICE.md da pasta.
ARTISTA = 'Rita Lee'


# Músicas já transcritas. Cada entrada:
#   {'title', 'artist', 'tom', 'estilo', 'pagina_livro', 'pagina_pdf',
#    'texto' (ou 'systems' + 'scale'), 'acordes': [...], 'digitacoes': {...},
#    'fonte': 'Songbook'}
# Ao preencher, anotar TAMBÉM o volume junto de 'pagina_livro' — aqui a página
# sozinha não identifica a música.
SONGS = []
