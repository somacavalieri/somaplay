# Songbook Caetano Veloso vol. 2 (Almir Chediak / Lumiar) — 68 músicas, 126 págs no PDF.
# chords/-new-songbook/Caetano Veloso Vol 2 - Almir Chediak/445225519-Songbook-caetano-veloso.pdf
#
# O scan tem defeitos de paginação: a página do livro NÃO é a página do PDF, e o
# offset muda quatro vezes ao longo do livro. Use pdf_page() — não chute offset.
#
#   PDF   4..33 do livro  -> pdf = livro - 3
#   livro 34             -> AUSENTE do scan (ver ANOMALIAS)
#   livro 35..38         -> pdf = livro - 4
#   pdf 35               -> página em branco (só a marca da espiral)
#   pdf 36               -> re-scan da mesma página 38 do livro (duplicata)
#   livro 39..58         -> pdf = livro - 2
#   pdf 57               -> duplicata exata do pdf 56 (livro 58)
#   livro 59..61         -> pdf = livro - 1
#   pdf 61               -> re-scan da mesma página 61 do livro (duplicata)
#   livro 62..126        -> pdf = livro
#   livro 127            -> "Guia musical", não foi escaneado
#
# Verificado por fólio impresso e por título de página em todas as 126 páginas.

BOOK = 'caetano-vol2'
FOLDER = ('/Users/somacavalieri/Library/CloudStorage/GoogleDrive-somacavalieri@gmail.com/'
          'My Drive/_claude/somaplay/chords/-new-songbook/Caetano Veloso Vol 2 - Almir Chediak')
PDF = f'{FOLDER}/445225519-Songbook-caetano-veloso.pdf'

# Páginas do PDF que não são página de livro: pular ao varrer o arquivo.
PAGINAS_LIXO = {35: 'em branco', 36: 'duplicata do livro 38',
                57: 'duplicata do livro 58', 61: 'duplicata do livro 61'}
PAGINAS_AUSENTES = {34: 'Diamante verdadeiro, 1ª página (grade de acordes + melodia)',
                    127: 'Guia musical'}


def pdf_page(livro):
    """Página do PDF (1-based) para uma página do livro. None se não foi escaneada."""
    if livro in PAGINAS_AUSENTES:
        return None
    if 4 <= livro <= 33:
        return livro - 3
    if 35 <= livro <= 38:
        return livro - 4
    if 39 <= livro <= 58:
        return livro - 2
    if 59 <= livro <= 61:
        return livro - 1
    if 62 <= livro <= 126:
        return livro
    raise ValueError(f'página {livro} fora do livro')


# Índice completo, na ordem alfabética do próprio livro (págs. 3 do PDF).
# (título, primeira página do livro, última página do livro, compositores)
# Compositores: lidos do subtítulo da página. 'Caetano Veloso' quando só ele
# assina. Os que não deu para ler no scan estão marcados com '?'.
INDICE = [
    ('A filha da Chiquita Bacana', 19, 19, 'Caetano Veloso'),
    ('A outra banda da terra', 20, 21, 'Caetano Veloso'),
    ('A rã', 22, 22, 'Caetano Veloso e João Donato'),
    ('Atrás do trio elétrico', 23, 23, 'Caetano Veloso'),
    ('Baby', 24, 25, 'Caetano Veloso'),
    ('Cajuína', 26, 26, 'Caetano Veloso'),
    ('Canto do povo de um lugar', 27, 27, 'Caetano Veloso'),
    ('Cinema Olímpia', 28, 28, 'Caetano Veloso'),
    ('Comeu', 29, 29, 'Caetano Veloso'),
    ('Chuva, suor e cerveja', 30, 31, 'Caetano Veloso'),
    ('Coração vagabundo', 32, 32, 'Caetano Veloso'),
    ('Deixa sangrar', 33, 33, 'Caetano Veloso'),
    ('Diamante verdadeiro', 34, 35, 'Caetano Veloso ?'),   # pág. 34 ausente
    ('Drama', 36, 37, 'Caetano Veloso'),
    ('Eu sou neguinha?', 38, 39, 'Caetano Veloso'),
    ('Festa imodesta', 40, 41, 'Caetano Veloso'),
    ('Força estranha', 42, 43, 'Caetano Veloso'),
    ('Gênesis', 44, 45, 'Caetano Veloso'),
    ('Jeito de corpo', 46, 47, 'Caetano Veloso'),
    ('Jóia', 48, 48, 'Caetano Veloso'),
    ('José', 49, 49, 'Caetano Veloso'),
    ('Júlia/Moreno', 50, 51, 'Caetano Veloso'),
    ('Luz do sol', 52, 53, 'Caetano Veloso'),
    ('Lua, lua, lua, lua', 54, 54, 'Caetano Veloso'),
    ('Menino Deus', 55, 55, 'Caetano Veloso'),
    ('Milagres do povo', 56, 57, 'Caetano Veloso'),
    ('Minha mulher', 58, 58, 'Caetano Veloso'),
    ('Minha voz, minha vida', 59, 59, 'Caetano Veloso'),
    ('Muito romântico', 60, 60, 'Caetano Veloso'),
    ('Nenhuma dor', 61, 61, 'Caetano Veloso e Gilberto Gil'),
    ('No dia em que eu vim-me embora', 62, 63, 'Caetano Veloso e Gilberto Gil'),
    ('Noite de hotel', 64, 65, 'Caetano Veloso'),
    ('Nosso estranho amor', 66, 66, 'Caetano Veloso'),
    ('O bater do tambor', 67, 67, 'Caetano Veloso ?'),
    ('O leãozinho', 68, 68, 'Caetano Veloso'),
    ('Onde eu nasci passa um rio', 69, 69, 'Caetano Veloso'),
    ('O quereres', 70, 71, 'Caetano Veloso'),
    ('Oração ao tempo', 72, 72, 'Caetano Veloso'),
    ('Os argonautas', 73, 73, 'Caetano Veloso ?'),
    ('Os meninos dançam', 74, 75, 'Caetano Veloso'),
    ('Outras palavras', 76, 77, 'Caetano Veloso'),
    ('Pássaro proibido', 78, 79, 'Caetano Veloso e Maria Bethânia'),
    ('Paula e Bebeto', 80, 81, 'Caetano Veloso e Milton Nascimento'),
    ('Pecado original', 82, 83, 'Caetano Veloso'),
    ('Peter Gast', 84, 85, 'Caetano Veloso'),
    ('Podres poderes', 86, 87, 'Caetano Veloso'),
    ('Qualquer coisa', 88, 89, 'Caetano Veloso ?'),
    ('Queixa', 90, 91, 'Caetano Veloso ?'),
    ('Quem me dera', 92, 93, 'Caetano Veloso'),
    ('Remelexo', 94, 95, 'Caetano Veloso'),
    ('Sampa', 96, 97, 'Caetano Veloso'),
    ('Sete mil vezes', 98, 99, 'Caetano Veloso ?'),
    ('Shy moon', 100, 100, 'Caetano Veloso'),
    ('Sorvete', 101, 101, 'Caetano Veloso'),
    ('Superbacana', 102, 103, 'Caetano Veloso ?'),
    ('Surpresa', 104, 104, 'Caetano Veloso e João Donato'),
    ('Tem que ser você', 105, 105, 'Caetano Veloso'),
    ('Tapete mágico', 106, 107, 'Caetano Veloso ?'),
    ('Tenda', 108, 109, 'Caetano Veloso'),
    ('Terra', 110, 111, 'Caetano Veloso ?'),
    ('Trem das cores', 112, 113, 'Caetano Veloso'),
    ('Trilhos Urbanos', 114, 115, 'Caetano Veloso'),
    ('Tigresa', 116, 116, 'Caetano Veloso'),
    ('Um frevo novo', 117, 117, 'Caetano Veloso'),
    ('Um dia', 118, 119, 'Caetano Veloso'),
    ('Vaca profana', 120, 121, 'Caetano Veloso'),
    ('Vera gata', 122, 123, 'Caetano Veloso'),
    ('Você não entende nada', 124, 126, 'Caetano Veloso'),
]

# Artista no app: 'Caetano Veloso' para todas as 68, mesmo nas que o livro
# credita em dupla — senão a lente de Artistas fragmenta o songbook em cinco
# artistas diferentes. O crédito completo fica em INDICE.
ARTISTA = 'Caetano Veloso'

LUZ_DO_SOL_TEXTO = '''\
Eb6/9    /  Bbm7      Eb7(9)       Ab7M   /  Abm6 / Gm7      /    C7(9) /   B7M       /        /       /       Eb7M(9) /// Eb6/9
Luz  do sol      que  a      folha traga  e traduz      Em verde novo   em folha em graça em vida em força em luz         Céu
  / Bbm7   Eb7(9)     Ab7M /       Abm6 / Gm7      /   C7(9)    B7M      /       /    /   Eb7M(9) / Eb7/4(9) Eb7(9) Ab7M
azul      que     vem até    onde os pés       Tocam a terra e a terra inspira e exala seus azuis                Reza  reza
   / Abm6         /    Eb7M(9)      /   Eb7/4(9) Eb7(9) Ab7M        /   Abm6            /     Eb7M(9) /// Dm7(11)           /
o rio córrego pro rio o rio     pro mar               Reza  a correnteza roça   beira doura areia        Marcha  o homem   sobre
  Db7(13) /          /  Cm7         /     Cm6 / Fm7(9)     /       Bb7(13)          /  Eb7M(9)         /     /  / Am7(b5)
o chão      leva no coração  uma ferida acesa   Dono    do sim e do não    diante da visão      da infinita beleza Finda  por
   /        Ab7(#11)            Gm7       /          C7(9) / F7(13) ///  Fm7 / Bb7(9) / Eb7M(9)   /      Bbm7 Eb7(9)
ferir com a mão       essa delicadeza a coisa mais querida A glória   da vi——da      Luz      do sol que a            folha
Ab7M   /   Abm6 / Gm7       /   C7(9) /    B7M       /       /        /       Eb7M(9)
traga   e traduz       Em verde novo    em folha em graça em vida em força em luz.
'''

# Os 21 diagramas da grade da p.52, lidos por pixel. Casa absoluta;
# -1 nao toca, 0 solta. Nenhum bate com a forma padrao do catalogo do app —
# sao os voicings esparsos do Chediak, com cordas puladas.
# Casa-base resolvida pelo TESTE DAS NOTAS e conferida contra o algarismo
# romano impresso nos 5 diagramas que tem um: IV, III, IV, IV, III — bateu nos 5.
LUZ_DO_SOL_DIGITACOES = {
    'Eb6/9': [-1, -1, 1, 0, 1, 1],
    'Bbm7': [-1, 1, -1, 1, 2, 1],
    'Eb7(9)': [-1, -1, 1, 0, 2, 1],
    'Ab7M': [4, -1, 5, 5, 4, -1],
    'Abm6': [4, -1, 3, 4, 4, -1],
    'Gm7': [3, -1, 3, 3, 3, -1],
    'C7(9)': [-1, 3, 2, 3, 3, -1],
    'B7M': [-1, 2, 4, 3, 4, 2],
    'Eb7M(9)': [-1, -1, 1, -1, 3, 1],
    'Eb7/4(9)': [-1, -1, 1, 1, 2, 1],
    'Dm7(11)': [-1, 5, -1, 5, 6, 3],
    'Db7(13)': [-1, 4, -1, 4, 6, 6],
    'Cm7': [-1, 3, -1, 3, 4, 3],
    'Cm6': [-1, 3, -1, 2, 4, 3],
    'Fm7(9)': [-1, -1, 3, 1, 4, 3],
    'Bb7(13)': [-1, 1, -1, 1, 3, 3],
    'Am7(b5)': [5, -1, 5, 5, 4, -1],
    'Ab7(#11)': [4, -1, 4, 5, 3, -1],
    'F7(13)': [1, -1, 1, 2, 3, -1],
    'Fm7': [1, -1, 1, 1, 1, -1],
    'Bb7(9)': [-1, 1, 0, 1, 1, -1],
}


# Músicas já transcritas. Cada entrada:
#   {'title', 'artist', 'tom', 'estilo', 'pagina_livro', 'pagina_pdf',
#    'texto', 'acordes': [...], 'digitacoes': {...}, 'fonte': 'Songbook'}
SONGS = [
    {
        'title': 'Luz do sol',
        'artist': ARTISTA,
        'tom': 'Eb',
        'estilo': 'MPB',
        'fonte': 'Songbook',
        'pagina_livro': 52,          # abre na 52; o bloco de cifra está todo na 53
        'pagina_pdf': 50,
        'texto': LUZ_DO_SOL_TEXTO,
        'acordes': list(LUZ_DO_SOL_DIGITACOES),
        'digitacoes': LUZ_DO_SOL_DIGITACOES,
    },
]
