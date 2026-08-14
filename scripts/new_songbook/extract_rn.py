#!/usr/bin/env python3
"""Extrator dos dois cadernos do Rafa Nascimento (fonte RN).

Dois documentos, dois caminhos, um módulo — porque o metadado e a conferência
são os mesmos e só a leitura muda:

  01 — Cifras de Samba .......... `.docx` (Word 2010). `blocos_docx()`
  02 — Sambas Consagrados ....... `.pdf` nativo.       `cifra_pdf()`

Nos dois a cifra é reconstruída na geração e NÃO fica escrita no módulo do livro
(`books/rafa_nascimento_0*.py` guarda só metadado) — é o que mantém letra de
terceiro fora do repositório. Ver INDICE.md de cada pasta.

Uso avulso, para inspecionar:
  extract_rn.py docx <n>          imprime o bloco n do caderno 01
  extract_rn.py pdf <p_ini> [p_fim]   imprime a cifra dessas páginas do 02
"""
import os
import re
import sys
import zipfile
from xml.etree import ElementTree as ET

import fitz

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'

BASE = ('/Users/somacavalieri/Library/CloudStorage/GoogleDrive-somacavalieri@gmail.com/'
        'My Drive/_claude/somaplay/chords/new-general/sambas - RN - Rafa Nascimento')
DOCX = f'{BASE}/01/163273272-Cifras-de-Samba.docx'
PDF2 = f'{BASE}/02/523204835-EBOOK-SAMBAS-CONSAGRADOS.pdf'


# ---------------------------------------------------------------- 01, o .docx

def _linhas_do_paragrafo(p):
    """Texto do parágrafo, já quebrado onde há <w:br>.

    Três nós carregam conteúdo e os três importam: <w:t> é o texto, <w:tab> é um
    TAB de verdade (o caderno usa tabulação para recuar blocos inteiros) e
    <w:br> é quebra de linha DENTRO do parágrafo — são 101 no documento, e
    ignorá-las emenda duas linhas visuais numa só, colando letra em acorde.
    """
    buf = ['']
    for n in p.iter():
        if n.tag == W + 't':
            buf[-1] += n.text or ''
        elif n.tag == W + 'tab':
            buf[-1] += '\t'
        elif n.tag == W + 'br':
            buf.append('')
    return buf


def compacta(linhas):
    """Uma linha em branco no máximo entre dois blocos, e nenhuma nas pontas.

    Os dois cadernos deixam vãos grandes: o .docx de "Me Leva" tem cinco
    parágrafos vazios seguidos, e o PDF de "Timoneiro" traz uma dúzia de linhas
    feitas só de espaço no rodapé da coluna — que não são vazias para o
    `strip()`, mas são para o leitor. Num tablet em pé numa estante isso é meia
    tela de nada no meio da música.

    Uma linha em branco continua separando bloco de bloco; o que some é a
    repetição.
    """
    out = []
    for l in linhas:
        if l.strip():
            out.append(l.rstrip())
        elif out and out[-1]:
            out.append('')
    while out and not out[-1]:
        out.pop()
    return out


def _corpo_max(p):
    """Maior tamanho de fonte do parágrafo, em meios-pontos (o `w:sz` do Word)."""
    m = 0
    for r in p.iter(W + 'r'):
        rpr = r.find(W + 'rPr')
        sz = rpr.find(W + 'sz') if rpr is not None else None
        if sz is not None:
            m = max(m, int(sz.get(W + 'val')))
    return m


# O título é o único texto em 19,5pt (sz=39) num documento cujo corpo é 10,5pt —
# não há sumário, paginação nem marcador textual de início de música.
# Menos nestes dois parágrafos, que herdaram o corpo do título sem serem título:
# segmentar sem excluí-los inventa duas músicas e parte duas ao meio.
FALSO_TITULO = {123, 2960}

# E menos na cauda do documento (p.94 do PDF em diante), onde o caderno vira
# colagem e o título cai para 11,5pt — em quatro blocos some de vez. Procurar só
# 19,5pt para em "O que é o que é" e perde 11 blocos em silêncio.
TITULO_CAUDA = [4454, 4494, 4532, 4576, 4606, 4646, 4679]
SEM_TITULO = [4731, 4764, 4765, 4792]


def _paragrafos(path=DOCX):
    root = ET.fromstring(zipfile.ZipFile(path).read('word/document.xml').decode('utf8'))
    return root.find(W + 'body').findall(W + 'p')


def _desrecua(linhas):
    """Tira o TAB de recuo do começo de cada linha do bloco.

    O caderno recua com tabulação — *Canto da Razão* tem 16 TABs no começo de
    TODAS as suas 41 linhas, e vários blocos põem uns tantos só na linha do
    `Introdução:`. Em texto de largura fixa o TAB não tem largura definida, então
    ele não carrega alinhamento nenhum: some inteiro, e o par acorde/sílaba, que
    ou tinha o mesmo prefixo nas duas linhas ou já estava torto, fica como estava.

    TAB no MEIO da linha é outra história — desloca acorde em relação à sílaba —
    e por isso os 8 blocos que têm um estão fora deste pacote. Ver INDICE.md.
    """
    return [l.lstrip('\t').rstrip() for l in linhas]


def blocos_docx(path=DOCX):
    """Todos os blocos do caderno 01, na ordem: [{n, titulo, linhas, par}].

    `n` é 1-based e casa com a coluna `#` do INDICE.md.
    """
    paras = _paragrafos(path)
    inicio = sorted(
        {i for i, p in enumerate(paras)
         if _corpo_max(p) >= 30 and ''.join(_linhas_do_paragrafo(p)).strip()
         and i not in FALSO_TITULO}
        | set(TITULO_CAUDA) | set(SEM_TITULO))

    out = []
    for n, (a, b) in enumerate(zip(inicio, inicio[1:] + [len(paras)]), 1):
        titulo = ' '.join(x.strip() for x in _linhas_do_paragrafo(paras[a])).strip()
        linhas = []
        for j in range(a + 1, b):
            linhas += [l.rstrip() for l in _linhas_do_paragrafo(paras[j])]
        out.append({'n': n, 'par': a, 'titulo': titulo,
                    'linhas': compacta(_desrecua(linhas))})
    return out


def cifra_docx(n, path=DOCX):
    """Cifra do bloco `n` do caderno 01, pronta para o campo `cifra.texto`."""
    for b in blocos_docx(path):
        if b['n'] == n:
            return '\n'.join(b['linhas'])
    raise KeyError(f'bloco {n} não existe')


# ------------------------------------------------------------------ 02, o PDF

# Offset do caderno 02, medido span a span nas 67 páginas numeradas: o número
# impresso fica no ALTO da página (x≈505, y≈35), não no rodapé.
OFFSET_02 = 4

# Páginas do PDF diagramadas em DUAS colunas. A coluna direita começa sempre
# nesta abscissa; a esquerda em 85,1.
DUAS_COLUNAS = {10, 12, 35, 63, 64, 65, 68, 69, 70}
X_CORREDOR = 315.0

# Avanço médio de caractere, em pontos, para posicionar acorde que NÃO tem letra
# embaixo (introdução, duas linhas de acorde seguidas). Só nesse caso: quando há
# letra, a coluna sai do caractere de verdade — ver `_monta`.
AVANCO = 6.8

# Vão vertical acima do qual duas linhas viraram parágrafos separados.
VAO_BRANCO = 28

# Vão horizontal, em pontos, que separa dois tokens dentro de uma linha. O corpo
# é 14pt e o caractere mais estreito (o espaço) mede ~3,9 — 2,5 fica abaixo de
# qualquer caractere e acima de zero, que é a distância dentro de uma palavra.
GAP_TOKEN = 2.5

def _chars(pg, x_min=None, x_max=None):
    """Caracteres da página com bbox individual, agrupados por linha.

    Devolve [(y, [(x0, x1, char), ...]), ...] em ordem de leitura. Descarta o
    número de página pela altura — ele é o único texto acima de y=50.
    """
    linhas = {}
    for b in pg.get_text('rawdict')['blocks']:
        for l in b.get('lines', []):
            for s in l['spans']:
                y = round(s['bbox'][1], 1)
                if y < 50:
                    continue
                if x_min is not None and s['bbox'][0] < x_min:
                    continue
                if x_max is not None and s['bbox'][0] >= x_max:
                    continue
                for c in s['chars']:
                    linhas.setdefault(y, []).append((c['bbox'][0], c['bbox'][2], c['c']))
    return [(y, sorted(linhas[y])) for y in sorted(linhas)]


def _texto_e_xs(chars, x_base):
    """Monta a string da linha e o x inicial de cada caractere dela.

    Os espaços vêm como caractere de verdade no PDF, então concatenar já dá a
    linha. Faltam dois recuos que não têm caractere: o da margem até o primeiro
    caractere (a letra do refrão costuma vir indentada) e o vão entre dois spans
    distintos. Os dois viram espaço proporcional.
    """
    txt, xs = '', []
    for k, (x0, x1, c) in enumerate(chars):
        vao = x0 - (chars[k - 1][1] if k else x_base)
        if vao > GAP_TOKEN:
            base = chars[k - 1][1] if k else x_base
            for j in range(max(1, int(round(vao / AVANCO)))):
                txt += ' '
                xs.append(base + j * AVANCO)
        txt += c
        xs.append(x0)
    return txt.rstrip(), xs


def _tokens(chars):
    """Tokens da linha, como (x_inicial, texto)."""
    out, cur, ini = [], '', 0.0
    for k, (x0, x1, c) in enumerate(chars):
        if cur and (x0 - chars[k - 1][1] > GAP_TOKEN or c == ' '):
            if cur.strip():
                out.append((ini, cur))
            cur = ''
        if c == ' ':
            continue
        if not cur:
            ini = x0
        cur += c
    if cur.strip():
        out.append((ini, cur))
    return out


def _e_linha_de_acordes(chars):
    """Esta linha é de acordes? — mesmo critério do app (ver `_e_linha_de_cifra`).

    Não é só classificação: é ela que escolhe a RÉGUA. Uma linha de acordes se
    posiciona pelos caracteres da linha de baixo, e se um verso de uma palavra só
    ("Deixa", "Bastou") for tomado por acordes, a régua se perde e os acordes da
    linha acima caem na coluna errada.
    """
    return _e_linha_de_cifra([t for _, t in _tokens(chars)])


def _coluna(x, xs):
    """Coluna de caractere onde o ponto `x` cai, dado o mapa `xs` da linha abaixo.

    É esta função que faz o acorde cair sobre a sílaba certa. O `.txt` que
    acompanha o caderno erra justamente aqui: ele posiciona por largura média, e
    numa fonte PROPORCIONAL (a letra é CIDFont+F3, o 'm' mede 11,7pt e o espaço
    3,9) a média acumula erro ao longo da linha. Medido na p.1: o PDF desenha o
    `D7` sobre a coluna 9 e o `G` sobre o 'c' de "coração", coluna 18; o `.txt`
    os põe em 11 e 21 — dois e três caracteres à direita da sílaba.
    """
    for i, cx in enumerate(xs):
        if cx >= x - 1.0:
            return i
    return len(xs) + int(round((x - (xs[-1] if xs else x)) / AVANCO))


def _monta(linhas):
    """Reconstrói o texto da cifra a partir das linhas de caracteres posicionados.

    Em TODAS as páginas a linha de acordes sai quebrada em vários spans — um por
    acorde, mesmo `y`, `x` crescente. Reagrupar por `y` é obrigatório; sem isso
    cada acorde vira uma linha.
    """
    if not linhas:
        return []
    x_base = min(chars[0][0] for _, chars in linhas)
    out = []
    for k, (y, chars) in enumerate(linhas):
        if k and y - linhas[k - 1][0] > VAO_BRANCO:
            out.append('')
        if not _e_linha_de_acordes(chars):
            out.append(_texto_e_xs(chars, x_base)[0])
            continue
        # Linha de acordes: a régua é a linha de baixo, quando ela for letra.
        ref = linhas[k + 1][1] if k + 1 < len(linhas) else None
        xs = (_texto_e_xs(ref, x_base)[1]
              if ref is not None and not _e_linha_de_acordes(ref) else None)
        buf = ''
        for x, t in _tokens(chars):
            col = _coluna(x, xs) if xs else int(round((x - x_base) / AVANCO))
            col = max(col, len(buf) + 1 if buf else 0)
            buf += ' ' * (col - len(buf)) + t
        out.append(buf.rstrip())
    return out


def _chave(s):
    return re.sub(r'[^a-z0-9]', '', s.lower())


def _corta_cabecalho(linhas, cabecalho):
    """Tira o título/artista do alto da página que ABRE a música.

    Corte por CONTEÚDO, não por contagem: o cabeçalho tem duas ou três linhas
    conforme a música (o caderno inverte a ordem título/artista a partir da nº 17
    e, na nº 6, escreve as duas na mesma linha), e há vão em branco no meio.
    Contar linhas deixava o artista dentro da cifra.

    Página de CONTINUAÇÃO não leva corte nenhum: ela começa com cifra no alto, e
    assumir cabeçalho ali come os primeiros acordes.
    """
    alvo = {_chave(x) for x in cabecalho if x}
    alvo.add(''.join(sorted(alvo)))                       # título+artista juntos
    i = 0
    while i < len(linhas) and i < 6:
        k = _chave(linhas[i])
        if not k:
            i += 1
            continue
        if k in alvo or any(k in a or a in k for a in alvo if a):
            i += 1
            continue
        break
    return linhas[i:]


def cifra_pdf(doc, p_ini, p_fim=None, cabecalho=()):
    """Cifra das páginas [p_ini, p_fim] do caderno 02 (páginas 1-based do PDF)."""
    p_fim = p_fim or p_ini
    partes = []
    for p in range(p_ini, p_fim + 1):
        pg = doc[p - 1]
        if p in DUAS_COLUNAS:
            # Cortar em x ANTES de reagrupar por y: as duas colunas compartilham
            # a mesma faixa de y, e reagrupar sem cortar cola acorde da esquerda
            # com letra da direita — bem formada aos olhos do parser e errada.
            linhas = _monta(_chars(pg, x_max=X_CORREDOR))
            dir_ = _monta(_chars(pg, x_min=X_CORREDOR))
        else:
            linhas, dir_ = _monta(_chars(pg)), []
        if p == p_ini and cabecalho:
            linhas = _corta_cabecalho(linhas, cabecalho)
        linhas = compacta(linhas) + ([''] if dir_ else []) + compacta(dir_)
        partes.append('\n'.join(compacta(linhas)))
    return '\n\n'.join(x for x in partes if x)


# -------------------------------------------------------------------- comuns

# Qualidade que faz do acorde um centro tonal plausível. Sétima de dominante não
# entra: ela quase sempre aponta para OUTRO acorde, e tomá-la por tônica dá tom
# errado numa cifra que começa pela dominante.
TONICA = re.compile(r'^[A-G][#b]?(m|m7|7M|6|M|maj7|9|add9|4|sus4|sus2|2)?$')
RAIZ = re.compile(r'^[A-G][#b]?')


# Rótulo no começo da linha, no estilo do app (`LABEL_DOISPONTOS` em chords.js):
# uma palavra seguida de dois-pontos. Os dois cadernos abrem a maioria das
# músicas com "Introdução:" ou "Intro.:" seguido dos acordes da introdução — sem
# tirar o rótulo a linha inteira é reprovada e o PRIMEIRO acorde da música
# desaparece da grade, levando junto o tom, que sai justamente dele.
LABEL = re.compile(r'^\s*\w[\w\-]*\s*:')

# Porte fiel do `isChordTok` de app/js/chords.js. Tem de ser o MESMO critério: o
# que este módulo põe em `cifra.acordes` é a grade "Acordes desta música", e um
# reconhecimento mais frouxo aqui enche a grade de palavra. Um teste solto por
# "começa com A-G" promovia a acorde os versos de uma palavra — "Deixa", "Ao",
# "Bastou", "Estribilho" — que o app, corretamente, lê como letra.
CHORD_TOK = re.compile(
    r'^[A-G][#b]?(m|maj|min|dim|aug|sus2|sus4|sus|add\d+|M|°|º|\+|-|\d)*o?'
    r'(\([^)]{1,7}\))*(/([A-G][#b]?|\d+[M+\-#b]?))*(\([^)]{1,7}\))*$')
# Token que tanto pode ser diminuto quanto palavra ("Do", "Ao", "Amo") — mesma
# guarda do app: só vale acompanhado de um acorde inequívoco.
DIM_AMBIGUO = re.compile(r'^[A-G][a-z]*o$')
MARCA = re.compile(r'^(N\.C\.|%|\|+|x\d+|\(\d+x\)|[-^!>~*.…()\[\]/]+)$', re.I)


def _nome_limpo(tok):
    """O acorde que o token carrega, como o `chordName` do app o devolve.

    A fonte cola no acorde o que não é acorde: asterisco de nota de rodapé, ponto
    final, e o delimitador de um trecho que ficou grudado — `F#m7)`, `(Dm`. O
    token CRU continua no texto da cifra (o alinhamento depende de cada
    caractere); o que se registra na grade é o nome limpo.
    """
    if CHORD_TOK.match(tok):
        return tok
    sem_nota = re.sub(r'[*.]+$', '', tok)
    if CHORD_TOK.match(sem_nota):
        return sem_nota
    sem_delim = re.sub(r'^[(\[]+', '', sem_nota)
    sem_delim = re.sub(r'[)\]]+$', '', sem_delim)
    return sem_delim if CHORD_TOK.match(sem_delim) else ''


def _e_linha_de_cifra(toks):
    """Todos os tokens são acorde ou marca, e ao menos um é acorde de verdade."""
    nomes = [_nome_limpo(t) for t in toks]
    if not any(nomes):
        return False
    if not all(n or MARCA.match(t) for n, t in zip(nomes, toks)):
        return False
    if any(DIM_AMBIGUO.match(t) for t in toks):
        return any(n and not DIM_AMBIGUO.match(t) for n, t in zip(nomes, toks))
    return True


def acordes_em_ordem(texto):
    """Acordes na ordem em que aparecem, sem repetir — é a ordem que o app exibe."""
    out = []
    for linha in texto.split('\n'):
        toks = LABEL.sub('', linha).split()
        if not toks or not _e_linha_de_cifra(toks):
            continue
        for t in toks:
            n = _nome_limpo(t)
            if n and n not in out:
                out.append(n)
    return out


def tom_impresso(texto):
    """O `Tom:` que a própria cifra imprime, quando imprime.

    O caderno 01 traz em 5 dos 101 blocos, todos na cauda; o 02 não traz em
    nenhum dos 51. Onde existe, é o que vale — inferir por cima do impresso seria
    trocar um dado por um palpite.
    """
    for linha in texto.split('\n')[:6]:
        m = re.match(r'\s*tom\s*:\s*([A-G][#b]?[^\s]*)', linha, re.I)
        if m:
            return m.group(1)
    return ''


def sequencia_de_acordes(texto):
    """Todos os acordes da cifra, na ordem e COM repetição.

    Diferente de `acordes_em_ordem`, que é a grade que o app exibe e por isso não
    repete. Para inferir tom a repetição é o que importa: o último acorde da
    cifra é o último TOCADO, não o último inédito — em "Me Leva" o último inédito
    aparece no meio da música.
    """
    out = []
    for linha in texto.split('\n'):
        toks = LABEL.sub('', linha).split()
        if not toks or not _e_linha_de_cifra(toks):
            continue
        out += [n for n in (_nome_limpo(t) for t in toks) if n]
    return out


def tom_inferido(texto):
    """Tom pela concordância entre o primeiro e o último acorde da cifra.

    Só devolve tom quando os dois extremos apontam para a MESMA raiz; qualquer
    outro caso fica VAZIO. A recipe permite um fallback a mais — o primeiro
    acorde, quando de qualidade tônica — mas nestes dois cadernos ele erra: quase
    toda música abre por uma introdução que não parte da tônica, e o fallback
    dava 'F' para "Me Leva", que está em C. O app mostra este campo, e chute
    silencioso vira erro invisível: vazio é melhor que errado.
    """
    ac = sequencia_de_acordes(texto)
    if not ac:
        return ''
    pri, ult = ac[0], ac[-1]
    if pri == ult:
        return pri
    rp, ru = RAIZ.match(pri), RAIZ.match(ult)
    if rp and ru and rp.group() == ru.group():
        # Mesma raiz, qualidades diferentes ("Dm" e "Dm7"): fica a tônica.
        return pri if TONICA.match(pri) else (ult if TONICA.match(ult) else '')
    return ''


if __name__ == '__main__':
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    if sys.argv[1] == 'docx':
        b = [x for x in blocos_docx() if x['n'] == int(sys.argv[2])][0]
        print(f"=== {b['n']}. {b['titulo']}  (par. {b['par']})")
        print('\n'.join(b['linhas']))
    else:
        d = fitz.open(PDF2)
        ini = int(sys.argv[2])
        fim = int(sys.argv[3]) if len(sys.argv) > 3 else ini
        print(cifra_pdf(d, ini, fim))
        print(f'\n--- tom inferido: {tom_inferido(cifra_pdf(d, ini, fim))!r}')
