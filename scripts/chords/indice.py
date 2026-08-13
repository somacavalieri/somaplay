"""Reads one INDICE.md and reports its metadata and per-status counts.

The file is the single source of truth for extraction progress; everything
above it in the hierarchy is derived. This module never writes.
"""

from dataclasses import dataclass, field
from pathlib import Path

# Glyph -> internal name. Keys are stored WITHOUT U+FE0F: the warning and
# pause signs carry a variation selector in the markdown files and the other
# four do not, so input is normalised before lookup.
STATUS = {
    "⬜": "nao_extraida",
    "🔲": "gerada",
    "✅": "conferida",
    "⚠": "pendencia",
    "🚫": "nao_extraivel",
    "⏸": "duplicada",
}

# Out of the denominator: a real loss, and a title we chose to take elsewhere.
FORA_DO_DENOMINADOR = ("nao_extraivel", "duplicada")
FEITAS = ("gerada", "conferida", "pendencia")

OBRIGATORIOS = ("documento", "acervo", "tipo", "dificuldade")

VS16 = "️"  # escaped on purpose: a bare U+FE0F is invisible in source


def parse_front_matter(text):
    """Split a leading '---' block into a flat dict, plus the rest of the file.

    Deliberately not YAML: the block is flat 'key: value', and a hand parser
    keeps this script runnable with nothing installed.
    """
    if not text.startswith("---"):
        return {}, text
    fim = text.find("\n---", 3)
    if fim == -1:
        return {}, text
    bloco = text[3:fim]
    resto = text[fim + 4:]
    meta = {}
    for linha in bloco.splitlines():
        linha = linha.strip()
        if not linha or linha.startswith("#") or ":" not in linha:
            continue
        chave, valor = linha.split(":", 1)          # first colon only
        valor = valor.strip()
        if len(valor) >= 2 and valor[0] == valor[-1] and valor[0] in "\"'":
            valor = valor[1:-1]
        meta[chave.strip()] = valor
    return meta, resto


def _celulas(linha):
    return [c.strip() for c in linha.strip().strip("|").split("|")]


def _status_da_celula(celula):
    # Rows are often bolded when they change (`**🔲 gerada…**`), so markdown
    # emphasis has to come off before the glyph is at the front.
    texto = celula.replace(VS16, "").strip().lstrip("*_`~ ")
    for glifo, nome in STATUS.items():
        if texto.startswith(glifo):
            return nome
    return "desconhecido" if texto else None


def count_status(text):
    """Count status glyphs, reading only tables that have a Status column.

    Two traps this guards against, both of which produced wrong numbers by
    hand: the legend lists the same glyphs as bullets (not table rows), and
    other tables in the file (page maps) have no Status column at all.
    """
    contagem = {}
    col = None
    for linha in text.splitlines():
        if not linha.lstrip().startswith("|"):
            col = None                                   # table ended
            continue
        celulas = _celulas(linha)
        if all(set(c) <= set("-: ") for c in celulas):   # separator row
            continue
        if col is None:
            # startswith, not ==: the Rodrigo Vianna index heads the column
            # "Status / obs", and an exact match silently skips the whole book.
            col = next(
                (i for i, c in enumerate(celulas)
                 if c.lower().lstrip("*_` ").startswith("status")),
                None,
            )
            if col is None:
                col = -1                                 # table without status
            continue
        if col == -1 or col >= len(celulas):
            continue
        nome = _status_da_celula(celulas[col])
        if nome:
            contagem[nome] = contagem.get(nome, 0) + 1
    return contagem


@dataclass
class Documento:
    caminho: Path
    meta: dict = field(default_factory=dict)
    contagem: dict = field(default_factory=dict)
    problemas: list = field(default_factory=list)

    @property
    def total(self):
        return sum(self.contagem.values())

    @property
    def extraiveis(self):
        return self.total - sum(
            self.contagem.get(k, 0) for k in FORA_DO_DENOMINADOR
        )

    @property
    def feitas(self):
        return sum(self.contagem.get(k, 0) for k in FEITAS)

    @property
    def conferidas(self):
        return self.contagem.get("conferida", 0)

    @property
    def fora_do_padrao(self):
        return bool(self.problemas)


def read_indice(path):
    texto = Path(path).read_text(encoding="utf-8")
    meta, corpo = parse_front_matter(texto)
    contagem = count_status(corpo if meta else texto)
    problemas = []
    if not meta:
        problemas.append("sem front matter")
    else:
        faltando = [c for c in OBRIGATORIOS if not meta.get(c)]
        if faltando:
            problemas.append("front matter sem " + ", ".join(faltando))
    if not contagem:
        problemas.append("nenhuma tabela com coluna Status")
    if contagem.get("desconhecido"):
        problemas.append(
            "%d linha(s) com status fora dos seis" % contagem["desconhecido"]
        )
    return Documento(Path(path), meta, contagem, problemas)
