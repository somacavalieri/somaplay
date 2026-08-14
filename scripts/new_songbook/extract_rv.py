#!/usr/bin/env python3
"""Extrai a cifra em texto das páginas do songbook do Rodrigo Vianna.

Este livro é o único do acervo que **não** é scan: é PDF nativo (PDFelement 6),
com camada de texto. Por isso ele não passa por `measure_cifra.py`/`layout.py`
(medição por pixel de imagem escaneada) — a posição de cada glifo já vem no
próprio PDF, e o que este módulo faz é reconstruir a cifra a partir dela.

Três coisas que não são óbvias e que este extrator resolve:

**1. A cor é o que separa acorde de letra.** Não a fonte, não o tamanho:

    #ff0033 / #ff0000  acorde e rótulo ("Tom:", "[Intro]")  <- o que interessa
    #000000  linha de letra                        <- o que interessa
    #333333  nome embaixo do diagrama de acorde    <- descartar
    #ffffff  número do dedo dentro da bolinha      <- descartar
    #c0c0c0  cabeçalho e rodapé                    <- descartar

O app desenha os próprios diagramas, então a grade do topo da página é lixo.
Tentar separar por tamanho não funciona: o rótulo do diagrama é 15pt e a raiz do
acorde é 14pt.

**2. Metade dos espaços da letra é falsa.** O PDFelement quebra a palavra em
saltos de kerning e o extrator lê "A Rit a lev ou" onde está escrito "A Rita
levou". O espaço falso é mais estreito que o de verdade, e a diferença é limpa:
a 14pt o espaço real mede 3.89pt e o falso 2.11pt. Como o corpo varia (12, 13 e
14pt no livro), o corte é proporcional ao tamanho da fonte — daí `ESPACO_MIN`.
Não dá para corrigir por dicionário: o defeito atinge t, v, x e g, e "internet e"
viraria "internete".

**3. A extensão do acorde vem empilhada, em dois spans miúdos na mesma coluna.**
O 6 sobre o 9 é C6/9; o 7 sobre o (b9) é A7(b9). Dentro da pilha manda o y; entre
a pilha e os outros pedaços do acorde manda o x — `D7(9)(#11)` tem a pilha antes
do (#11), `Em7(b5)` tem o m antes da pilha. A ordem dos spans no arquivo não
serve para nada.

Nada disso é uniforme no livro: o vermelho tem dois valores, o corpo tem dois
tamanhos, e algumas páginas trazem spans duplicados por sobreimpressão. Os
comentários no código dizem, caso a caso, o que quebra quando se assume o
contrário.

Uso:
  extract_rv.py <livro.pdf> 8          # cifra da página 8 do PDF (1-based)
  extract_rv.py <livro.pdf> 8 9        # música que ocupa duas páginas
  extract_rv.py <livro.pdf> --indice   # página, título e artista de cada música
"""
import re
import sys

import fitz

# Sem caminho fixo: o extrator serve aos dois volumes do Rodrigo Vianna (e a
# qualquer outro PDF do mesmo gerador). Quem sabe o caminho é o módulo do livro,
# em books/; na linha de comando, ele vem como primeiro argumento.

# O vermelho do acorde não é um valor só: 65 páginas usam #ff0033 e 14 usam
# #ff0000. Testar a cor em vez de compará-la é o que impediu 10 das 60 músicas de
# sair sem acorde nenhum. Nada mais no livro é avermelhado — os outros tons são
# todos neutros (r=g=b), então o teste não tem com o que colidir.
COR_LETRA = 0x000000


def e_vermelho(cor):
    return ((cor >> 16) & 255) >= 200 and ((cor >> 8) & 255) <= 80 and (cor & 255) <= 80


# O espaço de verdade é o avanço do glifo espaço da Helvetica: 0.278 do corpo,
# em qualquer tamanho (3.89pt a 14pt, 3.34pt a 12pt). Qualquer coisa mais
# estreita é salto de kerning. O corte fica logo abaixo de 0.278 — e não pode
# ser mais baixo: a 12pt o espaço falso mede 0.22 do corpo.
ESPACO_MIN = 0.26
# Linha seguinte da mesma estrofe cai 43pt abaixo; estrofe nova, 63pt. O corte no
# meio é o que impede uma linha em branco entre CADA verso.
SALTO_ESTROFE = 50
LINHA_MESMA = 18       # tolerância de y para dois acordes contarem como mesma linha

# Mesmo alfabeto de `app/js/chords.js` (isChordTok). Fica duplicado de propósito:
# o extrator roda em Python, fora do app, e o que ele não reconhecer aqui vira
# rótulo — que é o comportamento seguro.
ACORDE = re.compile(
    r'^[A-G][#b]?(m|maj|min|dim|aug|sus2|sus4|sus|add\d+|M|°|º|\+|-|\d)*o?'
    r'(\([^)]{1,7}\))*(/([A-G][#b]?|\d+[M+\-#b]?))*(\([^)]{1,7}\))*$')
MARCA = re.compile(r'^(N\.C\.|%|\|+|x\d+|\(\d+x\)|[-^!>~*.…()\[\]/]+)$', re.I)


def e_acorde(tok):
    return bool(ACORDE.match(tok) or MARCA.match(tok))


def spans_uteis(pg, y_min=None, grade=None):
    """Spans de acorde e de letra, já sem os espaços falsos.

    Fora fica o que não é cifra: o bloco título/compositor no alto (`y_min`, de
    `topo_cabecalho`) e a grade de diagramas (`grade`, de `grade_rect`), que o
    app redesenha sozinho. O compositor é preto de 14 e de 18pt — a cor não o
    separa da letra, e o tamanho também não: 14pt é o corpo da letra.
    """
    if y_min is None:
        y_min = topo_cabecalho(pg)
    if grade is None:
        grade = grade_rect(pg)
    # Parte das páginas traz o mesmo span DUAS vezes na mesma coordenada —
    # sobreimpressão do editor, invisível no papel. Sem descartar a cópia, as duas
    # extensões de um acorde caem na mesma raiz e sai "Gm11/Bbm11/Bb", que reprova
    # a linha inteira; e o verso aparece repetido na letra.
    vistos = set()
    out = []
    for bloco in pg.get_text("rawdict")["blocks"]:
        if bloco["type"] != 0:
            continue
        for linha in bloco["lines"]:
            for s in linha["spans"]:
                if not (e_vermelho(s["color"]) or s["color"] == COR_LETRA) or s["size"] > 20:
                    continue          # >20pt é o título da música
                if s["bbox"][1] < y_min:
                    continue
                if grade is not None and fitz.Rect(s["bbox"]).intersects(grade):
                    continue
                minimo = ESPACO_MIN * s["size"]
                chars = [c for c in s["chars"]
                         if c["c"] != " " or c["bbox"][2] - c["bbox"][0] >= minimo]
                texto = "".join(c["c"] for c in chars)
                if not texto.strip():
                    continue
                marca = (texto, round(s["bbox"][0], 1), round(s["bbox"][1], 1), round(s["size"], 1))
                if marca in vistos:
                    continue
                vistos.add(marca)
                out.append({
                    "texto": texto, "chars": chars,
                    "x0": s["bbox"][0], "x1": s["bbox"][2], "y0": s["bbox"][1],
                    "tam": round(s["size"], 1), "acorde": e_vermelho(s["color"]),
                })
    return out


def divisor(pg):
    """x da régua vertical entre as duas colunas; meio da página se não houver.

    Seis páginas do livro são de um template mais antigo do site e não desenham a
    régua, mas continuam em duas colunas — daí o meio da página servir de queda.
    """
    reguas = [d["rect"].x0 for d in pg.get_drawings()
              if d["rect"].width < 3 and d["rect"].height > 300
              and 0.3 * pg.rect.width < d["rect"].x0 < 0.7 * pg.rect.width]
    return min(reguas) if reguas else pg.rect.width / 2


def grade_rect(pg):
    """Retângulo ocupado pela grade de diagramas, ou None.

    Achado pelos números de dedo, que são o único texto BRANCO da página e só
    existem dentro das bolinhas. Descartar a grade por retângulo, e não por
    altura, é o que importa: ela mora no alto da coluna esquerda, e um corte
    horizontal levaria junto o começo da coluna DIREITA, que nessa altura já é
    cifra. A margem embaixo cobre o nome do acorde, impresso sob cada diagrama.

    Por que não pela cor do nome: ele é cinza (#333333) na maioria das páginas,
    mas preto na p.42 — mesma cor da letra. O retângulo pega os dois.
    """
    cantos = [s["bbox"] for b in pg.get_text("dict")["blocks"] if b["type"] == 0
              for l in b["lines"] for s in l["spans"]
              if s["color"] == 0xFFFFFF and s["text"].strip()]
    if not cantos:
        return None
    return fitz.Rect(min(c[0] for c in cantos) - 14, min(c[1] for c in cantos) - 20,
                     max(c[2] for c in cantos) + 14, max(c[3] for c in cantos) + 26)


PARENTESES = re.compile(r'^\s*\(.*\)\s*$')


def texto_limpo(span):
    """Texto do span sem os espaços falsos de kerning. Ver `ESPACO_MIN`.

    Vale para o cabeçalho tanto quanto para a cifra: sem isto o artista sai
    "Dj avan" e "W ando", e cada grafia dessas cria um artista novo na biblioteca,
    que é reaproveitada por NOME.
    """
    minimo = ESPACO_MIN * span["size"]
    return "".join(c["c"] for c in span["chars"]
                   if c["c"] != " " or c["bbox"][2] - c["bbox"][0] >= minimo)


def _spans_crus(pg):
    """Spans da página com o texto já limpo, sem filtro de cor nem de posição."""
    out = []
    for b in pg.get_text("rawdict")["blocks"]:
        if b["type"] != 0:
            continue
        for l in b["lines"]:
            for s in l["spans"]:
                t = texto_limpo(s)
                if t.strip():
                    out.append({**s, "text": t})
    return out


def topo_cabecalho(pg):
    """y abaixo do qual começa o conteúdo: título + artista + compositor.

    Só as páginas que ABREM uma música têm esse bloco, e elas se reconhecem pelo
    título, o único texto acima de 20pt. Página de continuação não tem título e
    **não leva corte nenhum** — foi assumir que tinha (corte fixo em 11% da
    altura) que fez *As vitrines* perder dez acordes do topo da p.27 no vol. 3.

    Abaixo do título vêm as linhas de artista e compositor, e elas se reconhecem
    por estarem **entre parênteses**, não pelo tamanho nem pela cor: no vol. 3 o
    compositor é preto de 14pt, o mesmo corpo da letra. A varredura desce de
    linha em linha enquanto encontra parênteses, em vez de somar uma margem fixa
    — no vol. 1 o cabeçalho é tão mais compacto que a cifra começa **6pt** abaixo
    do artista, e a margem de 45pt calibrada no vol. 3 comia os primeiros acordes.
    """
    spans = _spans_crus(pg)
    titulos = [s["bbox"][3] for s in spans if s["size"] > 20]
    if not titulos:
        return 0
    base = max(titulos)
    for s in sorted(spans, key=lambda s: s["bbox"][1]):
        if PARENTESES.match(s["text"]) and base - 2 <= s["bbox"][1] <= base + 40:
            base = max(base, s["bbox"][3])
    return base + 2


def cabecalho(pg):
    """(título, artista) da página que abre uma música, ou (None, None).

    O artista é a **primeira** linha entre parênteses sob o título; a segunda,
    quando existe, é o compositor — em *Alma gêmea* o artista é Fábio Jr e o
    compositor, Peninha. Vale para os dois volumes, e no vol. 1 é a única fonte:
    o índice de lá traz só número, título em caixa alta e página.
    """
    spans = _spans_crus(pg)
    titulos = [s for s in spans if s["size"] > 20]
    if not titulos:
        return None, None
    titulo = min(titulos, key=lambda s: s["bbox"][1])
    creditos = sorted([s for s in spans if PARENTESES.match(s["text"])
                       and s["bbox"][1] > titulo["bbox"][1]],
                      key=lambda s: s["bbox"][1])
    artista = creditos[0]["text"].strip()[1:-1].strip() if creditos else None
    return titulo["text"].strip(), artista


def _linhas_por_y(itens, tol=LINHA_MESMA):
    """Agrupa spans em linhas do impresso pelo topo do bbox.

    A tolerância é larga (18pt) porque dentro de UMA linha de acordes o topo
    varia bastante: a raiz elevada de um acorde com extensão empilhada e a base
    dessa pilha chegam a 14pt de diferença. O passo entre duas linhas de acorde é
    ~43pt, então nada colide. Usar a linha de base (`origin`) seria o natural, mas
    ela é pior aqui: o PDFelement escreve algumas raízes no estado de sobrescrito
    e a origem delas sai 7pt acima da vizinha da mesma linha.
    """
    linhas = []
    for it in sorted(itens, key=lambda s: s["y0"]):
        if linhas and it["y0"] - linhas[-1][0]["y0"] <= tol:
            linhas[-1].append(it)
        else:
            linhas.append([it])
    return linhas


def _colunas(miudos, tol=4):
    """Agrupa os spans miúdos que dividem a mesma coluna — é isso que forma a
    extensão empilhada.

    O critério é o CENTRO, não a borda esquerda: os dois elementos da pilha são
    centrados um sobre o outro, e o mais largo começa antes. Em `A7(b9)` o `7`
    vai de 537.0 a 540.9 e o `(b9)` de 532.0 a 544.8 — 5pt de diferença na borda,
    0.5pt no centro. Agrupar por borda partia a pilha em dois, e o nome saía
    `A(b9)7`, que o app rejeita.
    """
    centro = lambda p: (p["x0"] + p["x1"]) / 2      # noqa: E731
    grupos = []
    for p in sorted(miudos, key=centro):
        if grupos and abs(centro(p) - centro(grupos[-1][0])) <= tol:
            grupos[-1].append(p)
        else:
            grupos.append([p])
    return grupos


def _ordem(txt, empilhado):
    """Posição do pedaço no nome do acorde: qualidade, extensão, tensão, baixo.

    É a ordem canônica da cifra — `Em7(b5)`, `Bb7(4)(9)`, `C7M(6)/G` — e é ela,
    não a coordenada, que decide. Ordenar por x parecia funcionar e não funciona:
    a pilha e a tensão ficam na MESMA coluna, separadas por décimos de ponto, e o
    sinal dessa diferença muda de acorde para acorde. Em `D7(9)(#11)` a pilha
    vinha 0.1pt antes e saía certo; em `Bb7(4)(9)` vinha 0.3pt depois e saía
    `Bb(9)7(4)`, que o `isChordTok` do app rejeita — e um token reprovado derruba
    a linha de acordes inteira, levando junto os acordes vizinhos.
    """
    if txt.startswith("["):
        return 4                      # marcador do livro ([2], [3]): sai como token à parte
    if empilhado:
        return 1
    if txt.startswith("("):
        return 2                      # tensão: (9), (#11), (b13)
    if txt.startswith("/"):
        return 3                      # baixo: /G, /F#
    return 0                          # qualidade: m, m7, 7M, °, add9/G


def _nome(raiz, anexos, r_max):
    """Nome do acorde: raiz + os pedaços na ordem canônica (ver `_ordem`).

    Dentro de uma mesma posição, o desempate é por x — dois pedaços da mesma
    espécie no mesmo acorde são raros, mas aí a coordenada é o que sobra.
    """
    unidades = [(_ordem(p["texto"].strip(), False), p["x0"], p["texto"].strip())
                for p in anexos if p["tam"] >= 0.65 * r_max]
    for grupo in _colunas([p for p in anexos if p["tam"] < 0.65 * r_max]):
        g = sorted(grupo, key=lambda p: p["y0"])
        if len(g) == 2:
            topo, base = g[0]["texto"].strip(), g[1]["texto"].strip()
            if base.startswith("("):
                txt = topo + base                      # A7(b9)
            elif topo == "6" and base == "9":
                txt = "6/9"                            # C6/9
            else:
                txt = f"{topo}({base})"                # D7(9)
        else:
            txt = "".join(p["texto"].strip() for p in g)
        unidades.append((_ordem(txt, True), min(p["x0"] for p in g), txt))
    return raiz["texto"].strip() + "".join(t for _, _, t in sorted(unidades))


def monta_acordes(spans, r_max):
    """Junta raiz + sufixo na linha + extensão empilhada num nome de acorde só.

    Os três tamanhos de fonte são proporcionais à raiz e valem no livro inteiro:
    raiz 1.0, sufixo ~0.78, extensão empilhada ~0.5. Proporção, e não valor
    absoluto, porque uma página do livro (a de *Obi*) está inteira reduzida — lá
    a raiz é 12pt, não 14pt, e um corte fixo em 13pt fazia a música sair sem
    acorde nenhum.

    Cada span miúdo pertence à raiz mais próxima à ESQUERDA dele, dentro da mesma
    linha do impresso.
    """
    saida = []
    for linha in _linhas_por_y([s for s in spans if s["acorde"]]):
        raizes = sorted([s for s in linha if s["tam"] >= 0.9 * r_max], key=lambda s: s["x0"])
        if not raizes:
            continue
        anexos = {id(r): [] for r in raizes}
        for p in sorted([s for s in linha if s["tam"] < 0.9 * r_max], key=lambda s: s["x0"]):
            dono = next((r for r in reversed(raizes) if r["x0"] <= p["x0"] + 1), raizes[0])
            anexos[id(dono)].append(p)
        for r in raizes:
            # Um span vermelho pode trazer dois acordes ("F G") ou um marcador
            # colado ao acorde ("Am7[2]"); os dois viram tokens separados.
            nome = _nome(r, anexos[id(r)], r_max)
            for tok in re.sub(r'(?<=\S)(\[)', r' \1', nome).split():
                saida.append({"nome": tok, "x0": r["x0"], "y0": r["y0"]})
    return saida


def coluna(letra, x):
    """Índice do caractere da linha de letra que fica sob a coordenada x."""
    for i, c in enumerate(letra["chars"]):
        if c["bbox"][2] > x:
            return i
    return len(letra["chars"])


def _emite(grupo, letra, largura_col):
    """Uma banda de tokens vermelhos vira uma linha de texto POR ALTURA.

    Duas alturas na mesma banda são duas linhas no impresso — tipicamente o
    cabeçalho de seção ("Intro: G Am7") logo acima da primeira linha cifrada.
    Juntá-las embaralharia a ordem, porque dentro da linha a ordem é por x.

    Rótulo e acorde convivem na MESMA linha de propósito: `stripLabels` em
    `app/js/chords.js` já reconhece "Intro:" e "[Intro]" e segue lendo o resto
    como acorde. Separar em duas linhas é que quebraria.
    """
    linhas = []
    for _, alturas in sorted(_por_altura(grupo).items()):
        buf = ""
        for a in sorted(alturas, key=lambda g: g["x0"]):
            col = coluna(letra, a["x0"]) if letra else int(a["x0"] / largura_col)
            buf = buf.ljust(max(col, len(buf) + 1 if buf else 0)) + a["nome"]
        if buf.strip():
            linhas.append(buf.rstrip())
    return linhas


def _por_altura(grupo):
    """Agrupa tokens em linhas por y, com tolerância — o sufixo empilhado desloca
    a raiz em alguns décimos e duas raízes da mesma linha nem sempre têm o y
    idêntico."""
    linhas = {}
    for g in sorted(grupo, key=lambda g: g["y0"]):
        chave = next((k for k in linhas if abs(k - g["y0"]) <= LINHA_MESMA), g["y0"])
        linhas.setdefault(chave, []).append(g)
    return linhas


def cifra_da_coluna(spans, xmin, xmax, largura_col, r_max):
    sel = [s for s in spans if xmin <= s["x0"] < xmax]
    letras = sorted([s for s in sel if not s["acorde"]], key=lambda s: s["y0"])
    acordes = monta_acordes(sel, r_max)
    linhas, usados, y_ant = [], set(), None
    for ln in letras:
        banda = [a for a in acordes if id(a) not in usados
                 and (y_ant is None or a["y0"] > y_ant) and a["y0"] < ln["y0"] - 2]
        usados.update(id(a) for a in banda)
        if y_ant is not None and ln["y0"] - y_ant > SALTO_ESTROFE:
            linhas.append("")
        linhas += _emite(banda, ln, largura_col)
        linhas.append(ln["texto"].rstrip())
        y_ant = ln["y0"]
    sobra = [a for a in acordes if id(a) not in usados]
    if sobra:
        linhas += _emite(sobra, None, largura_col)
    return linhas


def cifra(doc, p_ini, p_fim=None):
    """Cifra em texto das páginas [p_ini, p_fim] do PDF, 1-based."""
    linhas = []
    for n in range(p_ini, (p_fim or p_ini) + 1):
        pg = doc[n - 1]
        div = divisor(pg)
        sp = spans_uteis(pg)
        largura_col = pg.rect.width / 100
        # tamanho da raiz NESTA página — o corpo do livro não é o mesmo em todas
        r_max = max([s["tam"] for s in sp if s["acorde"]], default=14)
        for xmin, xmax in ((0, div), (div, pg.rect.width)):
            bloco = cifra_da_coluna(sp, xmin, xmax, largura_col, r_max)
            if bloco:
                if linhas:
                    linhas.append("")
                linhas += bloco
    return "\n".join(linhas).strip("\n")


# Espelham LABEL_DOISPONTOS e LABEL de `app/js/chords.js`. Sem isto, uma linha
# como "Intro: E A E" ou "Repete B7 E" não conta como linha de acordes aqui, e os
# acordes dela somem de `cifra.acordes` — enquanto o app, que tira o rótulo antes
# de julgar, os mostra na grade "Acordes desta música". O cruzamento com a grade
# impressa do livro foi o que expôs a diferença.
LABEL_DOISPONTOS = re.compile(r'^\s*[^\W\d_][^\W\d_]*\s*:', re.UNICODE)
LABEL = re.compile(r'(?<![^\s])(?:\[[^\]]*\]|\((?:[^()]|\([^()]*\))*\))(?=\s|$)')


def sem_rotulo(linha):
    """Linha sem os rótulos — trecho entre parênteses feito só de acorde fica."""
    linha = LABEL_DOISPONTOS.sub(lambda m: ' ' * len(m.group()), linha)

    def troca(m):
        dentro = m.group()[1:-1]
        toks = dentro.split()
        return f' {dentro} ' if toks and all(e_acorde(t) for t in toks) else ' ' * len(m.group())

    return LABEL.sub(troca, linha)


def acordes_em_ordem(texto):
    """Acordes distintos na ordem em que aparecem — é essa a ordem que o painel
    'Acordes desta música' do app exibe."""
    vistos, saida = set(), []
    for ln in texto.splitlines():
        toks = sem_rotulo(ln).split()
        if not toks or not all(e_acorde(t) for t in toks):
            continue
        for t in toks:
            if ACORDE.match(t) and t not in vistos:
                vistos.add(t)
                saida.append(t)
    return saida


def tom(doc, p_ini):
    """Tom impresso na página, quando o livro traz o rótulo 'Tom:'."""
    pg = doc[p_ini - 1]
    sp = spans_uteis(pg)
    rotulos = [s for s in sp if s["acorde"] and s["texto"].strip() == "Tom:"]
    if not rotulos:
        return ""
    r = rotulos[0]
    r_max = max([s["tam"] for s in sp if s["acorde"]], default=14)
    ao_lado = [a for a in monta_acordes(sp, r_max)
               if abs(a["y0"] - r["y0"]) < 6 and r["x1"] < a["x0"] < r["x1"] + 80
               and ACORDE.match(a["nome"])]
    return min(ao_lado, key=lambda a: a["x0"])["nome"] if ao_lado else ""


def paginas_de_indice(doc):
    """Páginas (0-based) do menu interativo: as que têm vários links internos.

    Achar por contagem de link em vez de fixar o número da página é o que faz a
    mesma função servir aos dois volumes — o vol. 3 espalha o índice por 3
    páginas e o vol. 1 por 2, em posições diferentes. Página de música tem
    exatamente 1 link (a volta ao menu), e é isso que a separa.
    """
    return [i for i in range(doc.page_count)
            if len([l for l in doc[i].get_links() if l.get("kind") == 1]) > 3]


def indice(doc):
    """(página do PDF 1-based, título, artista) de cada música.

    O título e o artista saem do **cabeçalho da página da música**, não do menu.
    O menu dá só o destino do link — e é o que os dois volumes têm em comum. O do
    vol. 3 traz o artista depois dos pontinhos; o do vol. 1 traz número, título
    em CAIXA ALTA e página, e artista nenhum. Ler da página resolve os dois de uma
    vez, e ainda devolve o título na caixa correta.
    """
    destinos = sorted({l["page"] + 1 for n in paginas_de_indice(doc)
                       for l in doc[n].get_links() if l.get("kind") == 1})
    saida = []
    for pag in destinos:
        titulo, artista = cabecalho(doc[pag - 1])
        saida.append((pag, titulo, artista))
    return saida


if __name__ == '__main__':
    if len(sys.argv) < 3:
        sys.exit(__doc__.split('Uso:')[1].strip())
    doc = fitz.open(sys.argv[1])
    resto = sys.argv[2:]
    if '--indice' in resto:
        for pag, titulo, artista in indice(doc):
            print(f'{pag:>4}  {titulo}  —  {artista or "?"}')
    else:
        args = [int(a) for a in resto]
        print(cifra(doc, args[0], args[1] if len(args) > 1 else None))
