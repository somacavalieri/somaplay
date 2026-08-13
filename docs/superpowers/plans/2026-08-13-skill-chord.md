# Skill `/chord` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Uma skill `/chord` com três comandos (`indice`, `update`, `extract`) sobre uma hierarquia de três níveis em que só o `INDICE.md` de cada documento é editado à mão e os dois níveis acima são somados por script.

**Architecture:** Quatro módulos Python pequenos em `scripts/chords/`, cada um com uma responsabilidade: `indice.py` lê um `INDICE.md` e devolve metadado + contagem; `blocos.py` troca texto entre marcadores sem tocar em nada fora deles; `render.py` transforma uma lista de documentos em markdown; `progresso.py` é a CLI que varre `chords/`, junta os três e escreve. A skill em `.claude/skills/chord/` é o procedimento humano por cima disso, com uma recipe por tipo de material.

**Tech Stack:** Python 3.9 (é o que a máquina tem — sem `match`, sem `tomllib`), **stdlib apenas**, `unittest`. Nada de PyYAML mesmo estando instalado: o front matter é `chave: valor` plano e o parser cabe em 15 linhas.

**Spec:** `docs/superpowers/specs/2026-08-13-skill-chord-design.md`

## Global Constraints

- **Python 3.9.6, stdlib apenas.** Sem PyYAML, sem dependência nova. `fitz` só existe nos scripts de extração já existentes, não aqui.
- **O script nunca escreve `INDICE.md`.** Ele só lê. Quem escreve índice é a skill ou a mão.
- **O script só escreve entre `<!-- chord:auto -->` e `<!-- /chord:auto -->`.** Qualquer byte fora dos marcadores é preservado. Essa é a regra que protege as 1258 linhas do `PROGRESSO-EXTRACAO.md`.
- **Nunca inventar número.** Documento que o parser não entende entra numa seção *fora do padrão* com o caminho do arquivo — nunca é estimado nem omitido.
- **Os seis status:** `⬜` não extraída · `🔲` gerada · `✅` conferida · `⚠️` com pendência · `🚫` não extraível · `⏸️` duplicada. `🚫` e `⏸️` saem do denominador. *feitas* = ✅ + 🔲 + ⚠️.
- **Comentários e nomes de função do script em inglês** (regra do `CLAUDE.md` para código novo); os textos gerados em markdown são em português, porque é o idioma dos arquivos do acervo.
- **`chords/` é gitignored.** Nada que a skill escrever lá entra no git; o script e a skill, sim.
- Rodar os testes: `cd scripts/chords && python3 -m unittest discover -v`

---

### Task 1: Parser do `INDICE.md`

Lê um arquivo e devolve metadado + contagem por status. É onde moram as duas armadilhas que já custaram contagem errada em teste manual.

**Files:**
- Create: `scripts/chords/indice.py`
- Create: `scripts/chords/test_indice.py`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `STATUS: dict[str, str]` — glifo (sem `U+FE0F`) → nome interno.
  - `class Documento` com os campos `caminho: Path`, `meta: dict`, `contagem: dict`, `problemas: list`, e as propriedades `feitas: int`, `extraiveis: int`, `conferidas: int`, `total: int`, `fora_do_padrao: bool`.
  - `parse_front_matter(text: str) -> tuple[dict, str]` — devolve `(meta, resto)`.
  - `count_status(text: str) -> dict[str, int]` — nome interno → quantidade.
  - `read_indice(path: Path) -> Documento`.

- [ ] **Step 1: Write the failing test**

```python
# scripts/chords/test_indice.py
import unittest
from pathlib import Path
import tempfile

from indice import (
    STATUS, Documento, parse_front_matter, count_status, read_indice,
)

FRONT = """---
documento: Bossa Nova 1
acervo: -new-songbook
tipo: pdf-scan
arquivo: "[Songbook] Bossa Nova 1 [Almir Chediak].pdf"
dificuldade: 5
dificuldade_por_que: "300 dpi limpo, mas o offset muda uma vez"
atualizado: 2026-08-12
---

# Índice
"""


class TestFrontMatter(unittest.TestCase):
    def test_le_os_campos(self):
        meta, resto = parse_front_matter(FRONT)
        self.assertEqual(meta["documento"], "Bossa Nova 1")
        self.assertEqual(meta["dificuldade"], "5")
        self.assertTrue(resto.lstrip().startswith("# Índice"))

    def test_aspas_saem_e_colchete_fica(self):
        meta, _ = parse_front_matter(FRONT)
        self.assertEqual(
            meta["arquivo"], "[Songbook] Bossa Nova 1 [Almir Chediak].pdf"
        )

    def test_valor_com_dois_pontos_nao_se_parte(self):
        meta, _ = parse_front_matter(
            '---\nobs: "erro do livro: mantido como impresso"\n---\n'
        )
        self.assertEqual(meta["obs"], "erro do livro: mantido como impresso")

    def test_sem_front_matter_devolve_vazio(self):
        meta, resto = parse_front_matter("# Índice\n\ntexto\n")
        self.assertEqual(meta, {})
        self.assertEqual(resto, "# Índice\n\ntexto\n")


TABELA = """
## Legenda de status

- ✅ pronta — conferida no app
- 🔲 gerada, ainda não conferida
- ⬜ não extraída

## Mapa de páginas

| Páginas do livro | Página do PDF |
|---|---|
| 30–78 | livro − 4 |

## Índice

| Música | Pág. livro | Status | Compositores |
|---|---|---|---|
| A rã | 35 | ⬜ | João Donato |
| Adriana | 36 | 🔲 gerada, falta conferir | Roberto Menescal |
| Consolação | 64 | ✅ | Baden Powell |
| Se é tarde me perdoa | 119 | 🚫 página não escaneada | Carlos Lyra |
| Aula de matemática | 42 | ⚠️ acorde preso na linha Intro.: | Tom Jobim |
| O barquinho | 108 | ⏸️ extrair do 101 Melhores vol. 1 | Roberto Menescal |
"""


class TestContagem(unittest.TestCase):
    def test_conta_os_seis_status(self):
        c = count_status(TABELA)
        self.assertEqual(c["nao_extraida"], 1)
        self.assertEqual(c["gerada"], 1)
        self.assertEqual(c["conferida"], 1)
        self.assertEqual(c["nao_extraivel"], 1)
        self.assertEqual(c["pendencia"], 1)
        self.assertEqual(c["duplicada"], 1)

    def test_legenda_nao_conta(self):
        """A legenda usa os mesmos emojis. Contar por ocorrência daria 2 ⬜."""
        self.assertEqual(count_status(TABELA)["nao_extraida"], 1)

    def test_tabela_sem_coluna_status_nao_conta(self):
        """O mapa de páginas tem '− 4' e nenhum status; não pode virar linha."""
        self.assertEqual(sum(count_status(TABELA).values()), 6)

    def test_variation_selector_nao_derruba_o_status(self):
        """⚠️ e ⏸️ vêm com U+FE0F; ⬜ ✅ 🚫 não. Sem normalizar, somem os dois."""
        com_vs = "| M | ⚠️ |\n"
        sem_vs = "| M | ⚠ |\n"
        cabecalho = "| Música | Status |\n|---|---|\n"
        self.assertEqual(count_status(cabecalho + com_vs)["pendencia"], 1)
        self.assertEqual(count_status(cabecalho + sem_vs)["pendencia"], 1)

    def test_status_desconhecido_vira_problema_nao_silencio(self):
        cabecalho = "| Música | Status |\n|---|---|\n"
        c = count_status(cabecalho + "| M | 🎸 |\n")
        self.assertEqual(c.get("desconhecido"), 1)


class TestDocumento(unittest.TestCase):
    def _doc(self, texto):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "INDICE.md"
            p.write_text(texto, encoding="utf-8")
            return read_indice(p)

    def test_feitas_e_extraiveis(self):
        doc = self._doc(FRONT + TABELA)
        self.assertEqual(doc.total, 6)
        self.assertEqual(doc.feitas, 3)       # 🔲 + ✅ + ⚠️
        self.assertEqual(doc.conferidas, 1)   # só ✅
        self.assertEqual(doc.extraiveis, 4)   # 6 − 🚫 − ⏸️
        self.assertFalse(doc.fora_do_padrao)

    def test_sem_front_matter_e_fora_do_padrao(self):
        doc = self._doc(TABELA)
        self.assertTrue(doc.fora_do_padrao)
        self.assertIn("front matter", " ".join(doc.problemas))

    def test_sem_coluna_status_e_fora_do_padrao(self):
        doc = self._doc(FRONT + "| Música |\n|---|\n| A rã |\n")
        self.assertTrue(doc.fora_do_padrao)

    def test_campo_obrigatorio_faltando_e_fora_do_padrao(self):
        doc = self._doc("---\ndocumento: X\n---\n" + TABELA)
        self.assertTrue(doc.fora_do_padrao)
        self.assertIn("dificuldade", " ".join(doc.problemas))


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd scripts/chords && python3 -m unittest test_indice -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'indice'`

- [ ] **Step 3: Write minimal implementation**

```python
# scripts/chords/indice.py
"""Reads one INDICE.md and reports its metadata and per-status counts.

The file is the single source of truth for extraction progress; everything
above it in the hierarchy is derived. This module never writes.
"""

import re
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
    texto = celula.replace(VS16, "").strip()
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
            col = next(
                (i for i, c in enumerate(celulas) if c.lower() == "status"),
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd scripts/chords && python3 -m unittest test_indice -v`
Expected: PASS, 13 testes

- [ ] **Step 5: Rodar contra o arquivo real, que é a prova que importa**

Run:
```bash
cd "scripts/chords" && python3 -c "
from indice import read_indice
d = read_indice('../../chords/-new-songbook/Bossa Nova 1 - Almir Chediak/INDICE.md')
print('contagem:', d.contagem)
print('total:', d.total, 'feitas:', d.feitas, 'extraiveis:', d.extraiveis)
print('problemas:', d.problemas)
"
```
Expected: `total: 62`, `feitas: 2`, e `problemas: ['sem front matter']` — o índice ainda não foi migrado. Se `total` não der 62, o parser está pegando a tabela do mapa de páginas ou a legenda: corrigir antes de seguir.

- [ ] **Step 6: Commit**

```bash
git add scripts/chords/indice.py scripts/chords/test_indice.py
git commit -m "feat(chord): parser do INDICE.md com contagem por status"
```

---

### Task 2: Substituição entre marcadores

O pedaço crítico. Se ele errar, apaga trabalho de meses.

**Files:**
- Create: `scripts/chords/blocos.py`
- Create: `scripts/chords/test_blocos.py`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `ABRE = "<!-- chord:auto -->"`, `FECHA = "<!-- /chord:auto -->"`
  - `substitui(text: str, novo: str) -> str` — levanta `ValueError` se os marcadores faltarem, estiverem fora de ordem ou repetidos.
  - `bloco_atual(text: str) -> str` — o conteúdo entre marcadores hoje, para o `--check` comparar sem escrever.

- [ ] **Step 1: Write the failing test**

```python
# scripts/chords/test_blocos.py
import unittest

from blocos import ABRE, FECHA, substitui, bloco_atual

ARQUIVO = """# Progresso

Prosa que custou meses e não pode ser tocada.

%s
tabela velha
%s

## Mapa de páginas

Mais prosa, depois do bloco.
""" % (ABRE, FECHA)


class TestSubstitui(unittest.TestCase):
    def test_troca_so_o_miolo(self):
        novo = substitui(ARQUIVO, "tabela nova")
        self.assertIn("tabela nova", novo)
        self.assertNotIn("tabela velha", novo)

    def test_prosa_de_fora_sobrevive_byte_a_byte(self):
        novo = substitui(ARQUIVO, "tabela nova")
        self.assertIn("Prosa que custou meses e não pode ser tocada.", novo)
        self.assertIn("Mais prosa, depois do bloco.", novo)
        self.assertTrue(novo.startswith("# Progresso\n"))
        self.assertTrue(novo.endswith("Mais prosa, depois do bloco.\n"))

    def test_marcadores_continuam_la(self):
        novo = substitui(ARQUIVO, "x")
        self.assertEqual(novo.count(ABRE), 1)
        self.assertEqual(novo.count(FECHA), 1)

    def test_idempotente(self):
        uma = substitui(ARQUIVO, "tabela nova")
        duas = substitui(uma, "tabela nova")
        self.assertEqual(uma, duas)

    def test_sem_marcador_levanta_em_vez_de_escrever(self):
        with self.assertRaises(ValueError):
            substitui("# Progresso\n\nsó prosa\n", "x")

    def test_marcador_de_fechar_sozinho_levanta(self):
        with self.assertRaises(ValueError):
            substitui("# P\n%s\n" % FECHA, "x")

    def test_marcadores_fora_de_ordem_levantam(self):
        with self.assertRaises(ValueError):
            substitui("%s\nmiolo\n%s\n" % (FECHA, ABRE), "x")

    def test_marcador_repetido_levanta(self):
        texto = "%s\na\n%s\n%s\nb\n%s\n" % (ABRE, FECHA, ABRE, FECHA)
        with self.assertRaises(ValueError):
            substitui(texto, "x")

    def test_bloco_atual_le_sem_escrever(self):
        self.assertEqual(bloco_atual(ARQUIVO).strip(), "tabela velha")


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd scripts/chords && python3 -m unittest test_blocos -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'blocos'`

- [ ] **Step 3: Write minimal implementation**

```python
# scripts/chords/blocos.py
"""Replaces the generated region of a markdown file, and nothing else.

Everything outside the markers is hand-written prose — page maps, measured
scan state, decisions. It is the most valuable content in the repository and
this module is the only thing standing between it and a bad regex.
"""

ABRE = "<!-- chord:auto -->"
FECHA = "<!-- /chord:auto -->"


def _limites(text):
    if text.count(ABRE) != 1 or text.count(FECHA) != 1:
        raise ValueError(
            "esperado exatamente um %s e um %s (achei %d e %d)"
            % (ABRE, FECHA, text.count(ABRE), text.count(FECHA))
        )
    i = text.index(ABRE)
    f = text.index(FECHA)
    if f < i:
        raise ValueError("%s aparece antes de %s" % (FECHA, ABRE))
    return i, f


def bloco_atual(text):
    i, f = _limites(text)
    return text[i + len(ABRE):f]


def substitui(text, novo):
    i, f = _limites(text)
    return text[:i + len(ABRE)] + "\n" + novo.strip("\n") + "\n" + text[f:]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd scripts/chords && python3 -m unittest test_blocos -v`
Expected: PASS, 9 testes

- [ ] **Step 5: Commit**

```bash
git add scripts/chords/blocos.py scripts/chords/test_blocos.py
git commit -m "feat(chord): substituicao entre marcadores preservando a prosa"
```

---

### Task 3: Renderização das tabelas

**Files:**
- Create: `scripts/chords/render.py`
- Create: `scripts/chords/test_render.py`

**Interfaces:**
- Consumes: `Documento` da Task 1.
- Produces:
  - `barra(conferidas: int, feitas: int, extraiveis: int, largura: int = 10) -> str`
  - `tabela_de_documentos(docs: list) -> str`
  - `bloco_acervo(nome: str, docs: list) -> str`
  - `bloco_dashboard(por_acervo: dict) -> str` — `dict[str, list[Documento]]`

- [ ] **Step 1: Write the failing test**

```python
# scripts/chords/test_render.py
import unittest
from pathlib import Path

from indice import Documento
from render import barra, tabela_de_documentos, bloco_acervo, bloco_dashboard


def doc(nome, acervo="-new-songbook", dif="5", **contagem):
    return Documento(
        caminho=Path("chords/%s/%s/INDICE.md" % (acervo, nome)),
        meta={
            "documento": nome, "acervo": acervo, "tipo": "pdf-scan",
            "dificuldade": dif, "atualizado": "2026-08-12",
        },
        contagem=contagem,
    )


class TestBarra(unittest.TestCase):
    def test_vazia(self):
        self.assertEqual(barra(0, 0, 10), "░░░░░░░░░░")

    def test_cheia_de_conferidas(self):
        self.assertEqual(barra(10, 10, 10), "██████████")

    def test_gerada_e_conferida_usam_caracteres_diferentes(self):
        """A distância entre 🔲 e ✅ é o trabalho que resta; tem que aparecer."""
        b = barra(0, 10, 10)
        self.assertEqual(b, "▓▓▓▓▓▓▓▓▓▓")
        self.assertNotEqual(b, barra(10, 10, 10))

    def test_metade(self):
        self.assertEqual(barra(0, 5, 10), "▓▓▓▓▓░░░░░")

    def test_denominador_zero_nao_divide_por_zero(self):
        self.assertEqual(barra(0, 0, 0), "░░░░░░░░░░")

    def test_sempre_tem_a_largura_pedida(self):
        for feitas in range(0, 63):
            self.assertEqual(len(barra(1, feitas, 62)), 10)


class TestTabela(unittest.TestCase):
    def test_uma_linha_por_documento_com_a_contagem(self):
        t = tabela_de_documentos([doc("Bossa Nova 1", gerada=2, nao_extraida=60)])
        self.assertIn("Bossa Nova 1", t)
        self.assertIn("2", t)
        self.assertIn("62", t)

    def test_fora_do_denominador_encolhe_extraiveis(self):
        t = tabela_de_documentos([
            doc("Bossa Nova 2", nao_extraida=61, nao_extraivel=1),
        ])
        self.assertIn("| 0 | 61 |", t.replace("  ", " "))

    def test_ordena_por_dificuldade(self):
        t = tabela_de_documentos([
            doc("Caetano vol. 2", dif="9", nao_extraida=68),
            doc("Rodrigo Vianna", dif="2", gerada=60),
        ])
        self.assertLess(t.index("Rodrigo Vianna"), t.index("Caetano vol. 2"))


class TestBlocos(unittest.TestCase):
    def test_acervo_soma_os_documentos(self):
        b = bloco_acervo("-new-songbook", [
            doc("A", gerada=2, nao_extraida=60),
            doc("B", conferida=1, nao_extraida=9),
        ])
        self.assertIn("3", b)      # feitas
        self.assertIn("72", b)     # extraiveis

    def test_fora_do_padrao_aparece_com_o_caminho(self):
        d = doc("Sem front matter", nao_extraida=5)
        d.problemas = ["sem front matter"]
        b = bloco_acervo("-new-songbook", [d])
        self.assertIn("fora do padrão", b.lower())
        self.assertIn("INDICE.md", b)

    def test_dashboard_lista_bloqueios_de_todos_os_acervos(self):
        b = bloco_dashboard({
            "-new-songbook": [doc("A", nao_extraivel=1, nao_extraida=5)],
            "-pasta-vitor": [doc("B", acervo="-pasta-vitor", pendencia=2)],
        })
        self.assertIn("-new-songbook", b)
        self.assertIn("-pasta-vitor", b)
        self.assertIn("🚫", b)
        self.assertIn("⚠️", b)

    def test_dashboard_sem_documento_nenhum_nao_quebra(self):
        b = bloco_dashboard({"-Artistas": []})
        self.assertIn("-Artistas", b)

    def test_saida_e_deterministica(self):
        por_acervo = {"-new-songbook": [doc("A", gerada=1, nao_extraida=3)]}
        self.assertEqual(bloco_dashboard(por_acervo), bloco_dashboard(por_acervo))


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd scripts/chords && python3 -m unittest test_render -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'render'`

- [ ] **Step 3: Write minimal implementation**

```python
# scripts/chords/render.py
"""Turns a list of Documento into the markdown that goes between the markers.

Pure: takes data, returns a string, touches no file. Output must be stable
for the same input, so --check can compare by equality.
"""

AVISO = "<!-- Gerado por scripts/chords/progresso.py — não editar à mão. -->"

CHEIO, MEIO, VAZIO = "█", "▓", "░"


def barra(conferidas, feitas, extraiveis, largura=10):
    """Progress bar where checked-in-app and merely-generated read differently."""
    if extraiveis <= 0:
        return VAZIO * largura
    n_feitas = min(int(round(largura * feitas / extraiveis)), largura)
    n_conf = min(int(round(largura * conferidas / extraiveis)), n_feitas)
    return CHEIO * n_conf + MEIO * (n_feitas - n_conf) + VAZIO * (largura - n_feitas)


def _pct(feitas, extraiveis):
    return 0 if extraiveis <= 0 else int(round(100 * feitas / extraiveis))


def _ordem(doc):
    try:
        dif = int(doc.meta.get("dificuldade", "99"))
    except ValueError:
        dif = 99
    return (dif, doc.meta.get("documento", str(doc.caminho)))


def tabela_de_documentos(docs, com_acervo=False):
    cab = ["Documento"] + (["Acervo"] if com_acervo else []) + [
        "Dif.", "Feitas", "Extraíveis", "Progresso", "Atualizado",
    ]
    linhas = ["| " + " | ".join(cab) + " |",
              "|" + "---|" * len(cab)]
    for d in sorted(docs, key=_ordem):
        celulas = [d.meta.get("documento", d.caminho.parent.name)]
        if com_acervo:
            celulas.append(d.meta.get("acervo", ""))
        celulas += [
            d.meta.get("dificuldade", "?"),
            str(d.feitas),
            str(d.extraiveis),
            "%s %d%%" % (barra(d.conferidas, d.feitas, d.extraiveis),
                         _pct(d.feitas, d.extraiveis)),
            d.meta.get("atualizado", "—"),
        ]
        linhas.append("| " + " | ".join(celulas) + " |")
    return "\n".join(linhas)


def _fora_do_padrao(docs):
    ruins = [d for d in docs if d.fora_do_padrao]
    if not ruins:
        return ""
    linhas = ["", "**Fora do padrão** — não entram na conta acima:", ""]
    for d in sorted(ruins, key=lambda d: str(d.caminho)):
        linhas.append("- `%s` — %s" % (d.caminho, "; ".join(d.problemas)))
    return "\n".join(linhas) + "\n"


def bloco_acervo(nome, docs):
    bons = [d for d in docs if not d.fora_do_padrao]
    feitas = sum(d.feitas for d in bons)
    conf = sum(d.conferidas for d in bons)
    extr = sum(d.extraiveis for d in bons)
    partes = [
        AVISO, "",
        "**%s — %d de %d feitas** (%d conferidas no app) %s"
        % (nome, feitas, extr, conf, barra(conf, feitas, extr)),
        "",
    ]
    partes.append(tabela_de_documentos(bons) if bons
                  else "_Nenhum documento com índice ainda._")
    partes.append(_fora_do_padrao(docs))
    return "\n".join(p for p in partes if p is not None).rstrip() + "\n"


def _bloqueios(por_acervo):
    linhas = []
    for acervo in sorted(por_acervo):
        for d in sorted(por_acervo[acervo], key=lambda d: str(d.caminho)):
            perdidas = d.contagem.get("nao_extraivel", 0)
            pendentes = d.contagem.get("pendencia", 0)
            duplicadas = d.contagem.get("duplicada", 0)
            if not (perdidas or pendentes or duplicadas):
                continue
            marcas = []
            if perdidas:
                marcas.append("🚫 %d não extraível(is)" % perdidas)
            if pendentes:
                marcas.append("⚠️ %d com pendência" % pendentes)
            if duplicadas:
                marcas.append("⏸️ %d duplicada(s)" % duplicadas)
            linhas.append("- **%s** (`%s`) — %s"
                          % (d.meta.get("documento", d.caminho.parent.name),
                             acervo, ", ".join(marcas)))
    if not linhas:
        return "_Nenhum bloqueio registrado._"
    return "\n".join(linhas)


def bloco_dashboard(por_acervo):
    todos = [d for docs in por_acervo.values() for d in docs
             if not d.fora_do_padrao]
    feitas = sum(d.feitas for d in todos)
    conf = sum(d.conferidas for d in todos)
    extr = sum(d.extraiveis for d in todos)

    linhas = [
        AVISO, "",
        "**Acervo inteiro: %d de %d feitas** (%d%%) — %d conferidas no app"
        % (feitas, extr, _pct(feitas, extr), conf),
        "",
        "| Acervo | Feitas | Extraíveis | Progresso | Documentos |",
        "|---|---|---|---|---|",
    ]
    for acervo in sorted(por_acervo):
        docs = [d for d in por_acervo[acervo] if not d.fora_do_padrao]
        f = sum(d.feitas for d in docs)
        c = sum(d.conferidas for d in docs)
        e = sum(d.extraiveis for d in docs)
        linhas.append("| `%s` | %d | %d | %s %d%% | %d |"
                      % (acervo, f, e, barra(c, f, e), _pct(f, e), len(docs)))

    linhas += ["", "## Documentos", "",
               tabela_de_documentos(todos, com_acervo=True) if todos
               else "_Nenhum documento com índice ainda._",
               "", "## Bloqueios e perdas", "", _bloqueios(por_acervo)]

    fora = _fora_do_padrao([d for docs in por_acervo.values() for d in docs])
    if fora:
        linhas += ["", "## Índices fora do padrão", fora]
    return "\n".join(linhas).rstrip() + "\n"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd scripts/chords && python3 -m unittest test_render -v`
Expected: PASS, 14 testes

- [ ] **Step 5: Commit**

```bash
git add scripts/chords/render.py scripts/chords/test_render.py
git commit -m "feat(chord): renderizacao das tabelas de progresso"
```

---

### Task 4: A CLI `progresso.py`

**Files:**
- Create: `scripts/chords/progresso.py`
- Create: `scripts/chords/test_progresso.py`

**Interfaces:**
- Consumes: `read_indice` (T1), `substitui`/`bloco_atual`/`ABRE`/`FECHA` (T2), `bloco_acervo`/`bloco_dashboard` (T3).
- Produces:
  - `varre(raiz: Path) -> dict[str, list[Documento]]`
  - `atualiza(raiz: Path, check: bool = False, acervo: str = None) -> list[str]` — devolve a lista de caminhos que mudaram (ou mudariam, com `check=True`).
  - CLI: `python3 progresso.py [acervo] [--check] [--raiz CAMINHO]`, saída ≠ 0 quando `--check` acha divergência.

- [ ] **Step 1: Write the failing test**

```python
# scripts/chords/test_progresso.py
import unittest
import tempfile
from pathlib import Path

from blocos import ABRE, FECHA
from progresso import varre, atualiza

FRONT = """---
documento: %s
acervo: %s
tipo: pdf-scan
dificuldade: %s
atualizado: 2026-08-12
---

| Música | Status |
|---|---|
%s
"""


def acervo_falso(raiz, acervo, documento, status, dif="5"):
    pasta = raiz / "chords" / acervo / documento
    pasta.mkdir(parents=True, exist_ok=True)
    linhas = "\n".join("| M%d | %s |" % (i, s) for i, s in enumerate(status))
    (pasta / "INDICE.md").write_text(
        FRONT % (documento, acervo, dif, linhas), encoding="utf-8")


def progresso_vazio(raiz, caminho, cabecalho):
    p = raiz / caminho
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text("# %s\n\nPROSA IMPORTANTE\n\n%s\n%s\n\nRODAPÉ\n"
                 % (cabecalho, ABRE, FECHA), encoding="utf-8")
    return p


class TestVarre(unittest.TestCase):
    def test_acha_indice_em_cada_acervo(self):
        with tempfile.TemporaryDirectory() as d:
            raiz = Path(d)
            acervo_falso(raiz, "-new-songbook", "Bossa Nova 1", ["⬜", "🔲"])
            acervo_falso(raiz, "-pasta-vitor", "Chico Buarque", ["✅"])
            por_acervo = varre(raiz / "chords")
            self.assertEqual(sorted(por_acervo), ["-new-songbook", "-pasta-vitor"])
            self.assertEqual(len(por_acervo["-new-songbook"]), 1)

    def test_acha_indice_com_sufixo(self):
        """A pasta das 101 Melhores tem INDICE-VOL1.md e INDICE-VOL2.md."""
        with tempfile.TemporaryDirectory() as d:
            raiz = Path(d)
            pasta = raiz / "chords" / "-new-songbook" / "101 Melhores"
            pasta.mkdir(parents=True)
            for vol in ("VOL1", "VOL2"):
                (pasta / ("INDICE-%s.md" % vol)).write_text(
                    FRONT % (vol, "-new-songbook", "6", "| M | ⬜ |"),
                    encoding="utf-8")
            self.assertEqual(len(varre(raiz / "chords")["-new-songbook"]), 2)

    def test_acervo_sem_indice_nenhum_aparece_vazio(self):
        with tempfile.TemporaryDirectory() as d:
            raiz = Path(d)
            (raiz / "chords" / "_a-identificar").mkdir(parents=True)
            self.assertEqual(varre(raiz / "chords")["_a-identificar"], [])


class TestAtualiza(unittest.TestCase):
    def _monta(self, d):
        raiz = Path(d)
        acervo_falso(raiz, "-new-songbook", "Bossa Nova 1",
                     ["⬜"] * 60 + ["🔲", "🔲"])
        progresso_vazio(raiz, "chords/-new-songbook/PROGRESSO.md", "Songbooks")
        return raiz, progresso_vazio(raiz, "chords/PROGRESSO.md", "Acervo")

    def test_escreve_a_contagem_certa(self):
        with tempfile.TemporaryDirectory() as d:
            raiz, dash = self._monta(d)
            atualiza(raiz / "chords")
            texto = dash.read_text(encoding="utf-8")
            self.assertIn("2 de 62", texto)

    def test_prosa_de_fora_sobrevive(self):
        with tempfile.TemporaryDirectory() as d:
            raiz, dash = self._monta(d)
            atualiza(raiz / "chords")
            texto = dash.read_text(encoding="utf-8")
            self.assertIn("PROSA IMPORTANTE", texto)
            self.assertIn("RODAPÉ", texto)

    def test_nunca_escreve_no_indice(self):
        with tempfile.TemporaryDirectory() as d:
            raiz, _ = self._monta(d)
            ind = raiz / "chords/-new-songbook/Bossa Nova 1/INDICE.md"
            antes = ind.read_bytes()
            atualiza(raiz / "chords")
            self.assertEqual(ind.read_bytes(), antes)

    def test_segunda_rodada_nao_muda_nada(self):
        with tempfile.TemporaryDirectory() as d:
            raiz, dash = self._monta(d)
            atualiza(raiz / "chords")
            depois_da_primeira = dash.read_bytes()
            mudou = atualiza(raiz / "chords")
            self.assertEqual(mudou, [])
            self.assertEqual(dash.read_bytes(), depois_da_primeira)

    def test_check_acha_divergencia_sem_escrever(self):
        with tempfile.TemporaryDirectory() as d:
            raiz, dash = self._monta(d)
            antes = dash.read_bytes()
            fora = atualiza(raiz / "chords", check=True)
            self.assertTrue(fora)
            self.assertEqual(dash.read_bytes(), antes)

    def test_check_limpo_depois_de_atualizar(self):
        with tempfile.TemporaryDirectory() as d:
            raiz, _ = self._monta(d)
            atualiza(raiz / "chords")
            self.assertEqual(atualiza(raiz / "chords", check=True), [])

    def test_progresso_sem_marcador_vira_erro_e_nao_apaga(self):
        with tempfile.TemporaryDirectory() as d:
            raiz, dash = self._monta(d)
            dash.write_text("# Acervo\n\nsó prosa, sem marcador\n",
                            encoding="utf-8")
            antes = dash.read_bytes()
            with self.assertRaises(ValueError):
                atualiza(raiz / "chords")
            self.assertEqual(dash.read_bytes(), antes)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd scripts/chords && python3 -m unittest test_progresso -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'progresso'`

- [ ] **Step 3: Write minimal implementation**

```python
#!/usr/bin/env python3
# scripts/chords/progresso.py
"""Recomputes the extraction dashboard from the INDICE.md files.

    python3 progresso.py                # rewrites every generated block
    python3 progresso.py -new-songbook  # one acervo only
    python3 progresso.py --check        # reports drift, writes nothing, exits 1

Reads INDICE.md; writes only between the markers of PROGRESSO.md files.
"""

import argparse
import sys
from pathlib import Path

from blocos import bloco_atual, substitui
from indice import read_indice
from render import bloco_acervo, bloco_dashboard

AQUI = Path(__file__).resolve().parent
RAIZ_PADRAO = AQUI.parent.parent / "chords"


def varre(raiz):
    """acervo -> [Documento]. An acervo is any directory directly under raiz."""
    por_acervo = {}
    for pasta in sorted(p for p in Path(raiz).iterdir() if p.is_dir()):
        docs = [read_indice(p) for p in sorted(pasta.rglob("INDICE*.md"))]
        por_acervo[pasta.name] = docs
    return por_acervo


def _grava(caminho, novo, check):
    """Returns the path as a string when the file is (or would be) changed."""
    texto = caminho.read_text(encoding="utf-8")
    if bloco_atual(texto).strip() == novo.strip():
        return None
    if not check:
        caminho.write_text(substitui(texto, novo), encoding="utf-8")
    return str(caminho)


def atualiza(raiz=RAIZ_PADRAO, check=False, acervo=None):
    raiz = Path(raiz)
    por_acervo = varre(raiz)
    if acervo:
        por_acervo = {k: v for k, v in por_acervo.items() if k == acervo}
        if not por_acervo:
            raise ValueError("acervo não encontrado em %s: %s" % (raiz, acervo))

    mudou = []
    for nome, docs in por_acervo.items():
        alvo = raiz / nome / "PROGRESSO.md"
        if not alvo.exists():
            continue
        r = _grava(alvo, bloco_acervo(nome, docs), check)
        if r:
            mudou.append(r)

    dash = raiz / "PROGRESSO.md"
    if dash.exists() and not acervo:
        r = _grava(dash, bloco_dashboard(varre(raiz)), check)
        if r:
            mudou.append(r)
    return mudou


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("acervo", nargs="?", help="limita a um acervo")
    ap.add_argument("--check", action="store_true",
                    help="não escreve; sai 1 se algo está fora de sync")
    ap.add_argument("--raiz", default=str(RAIZ_PADRAO))
    args = ap.parse_args(argv)

    mudou = atualiza(Path(args.raiz), check=args.check, acervo=args.acervo)
    if args.check:
        if mudou:
            print("fora de sync (rode sem --check):")
            for m in mudou:
                print("  " + m)
            return 1
        print("tudo em sync")
        return 0
    for m in mudou:
        print("atualizado: " + m)
    if not mudou:
        print("nada mudou")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd scripts/chords && python3 -m unittest discover -v`
Expected: PASS, 46 testes no total (13 + 9 + 14 + 10)

- [ ] **Step 5: Commit**

```bash
git add scripts/chords/progresso.py scripts/chords/test_progresso.py
git commit -m "feat(chord): CLI que recalcula o progresso a partir dos indices"
```

---

### Task 5: Criar os arquivos de progresso reais

Aqui o script encosta no acervo pela primeira vez. Nada é migrado ainda — o esperado é que os 15 documentos apareçam como *fora do padrão*, e isso é o comportamento correto.

**Files:**
- Rename: `chords/-new-songbook/PROGRESSO-EXTRACAO.md` → `chords/-new-songbook/PROGRESSO.md`
- Create: `chords/PROGRESSO.md`
- Create: `chords/-pasta-vitor/PROGRESSO.md`, `chords/-Artistas/PROGRESSO.md`, `chords/new-general/PROGRESSO.md`, `chords/_a-identificar/PROGRESSO.md`

**Interfaces:**
- Consumes: a CLI da Task 4.
- Produces: os 6 arquivos com marcadores, prontos para o script preencher.

> **Nota sobre a spec:** a spec lista o rename do `PROGRESSO-EXTRACAO.md` na fase 2. Ele sobe para a fase 1 porque sem ele o acervo `-new-songbook` não tem onde o script escrever. A prosa continua onde está; quem a move é a fase 2.

- [ ] **Step 1: Renomear e abrir o bloco no acervo dos songbooks**

```bash
cd "chords/-new-songbook" && mv PROGRESSO-EXTRACAO.md PROGRESSO.md
```

Depois, inserir logo abaixo do parágrafo de abertura (antes de `## Legenda de status`), e **remover a tabela "Livros com pelo menos 1 música extraída"**, que passa a ser gerada:

```markdown
<!-- chord:auto -->
<!-- /chord:auto -->
```

- [ ] **Step 2: Criar os quatro `PROGRESSO.md` dos acervos sem registro**

Cada um com o mesmo esqueleto, trocando nome e descrição. Exemplo de `chords/-pasta-vitor/PROGRESSO.md`:

```markdown
# Acervo do Vitor — fonte `VJ`

~197 pastas de artista em `.doc`. Cada pasta de artista vira um documento com
`INDICE.md` próprio. Levantar índice com `/chord indice`.

Dashboard de todos os acervos: `../PROGRESSO.md`.

<!-- chord:auto -->
<!-- /chord:auto -->
```

Descrições dos outros três:
- `chords/-Artistas/PROGRESSO.md` — "31 artistas com cifras soltas e songbooks próprios."
- `chords/new-general/PROGRESSO.md` — "5 coletâneas por tema/curador (pink-floyd, rock-BT-, rock-pop-OF-osnildo, sambas - RN, Guitar-Songs-Masters)."
- `chords/_a-identificar/PROGRESSO.md` — "Imagens de cifra cujo artista ainda não foi identificado. Sai daqui quando o artista for descoberto."

- [ ] **Step 3: Criar o dashboard `chords/PROGRESSO.md`**

```markdown
# Progresso do acervo

Visão geral das cinco frentes de extração. **Este arquivo é gerado** — para
mudar um número, mude o `INDICE.md` do documento e rode:

```bash
python3 scripts/chords/progresso.py
```

`INDICE.md` de cada documento é a única fonte de verdade. O `PROGRESSO.md` de
cada acervo e este dashboard só somam.

## Legenda de status

- ⬜ não extraída
- 🔲 gerada, ainda não conferida no app
- ✅ conferida no app contra o impresso
- ⚠️ extraída com pendência conhecida (conta como feita, com dívida anotada)
- 🚫 não extraível — perda real, fora do denominador
- ⏸️ duplicada, decidido extrair de outro documento — fora do denominador

<!-- chord:auto -->
<!-- /chord:auto -->
```

- [ ] **Step 4: Rodar o script pela primeira vez**

Run: `python3 scripts/chords/progresso.py`
Expected: `atualizado:` para os 6 arquivos. O dashboard mostra `0 de 0 feitas` e uma seção **Índices fora do padrão** com os 15 caminhos — nenhum tem front matter ainda.

- [ ] **Step 5: Conferir que a prosa sobreviveu**

Run: `wc -l "chords/-new-songbook/PROGRESSO.md"`
Expected: perto de 1258 linhas (menos as ~18 da tabela removida no Step 1, mais as 2 dos marcadores e o que o script escreveu). Se vier drasticamente menor, o `substitui` comeu prosa: parar e voltar ao teste da Task 2.

- [ ] **Step 6: Commit**

Só o que está fora de `chords/` entra no git — os `PROGRESSO.md` são gitignored. Não há o que commitar neste task; registrar o estado no próximo.

---

### Task 6: Migrar o piloto (Bossa Nova 1)

**Files:**
- Modify: `chords/-new-songbook/Bossa Nova 1 - Almir Chediak/INDICE.md`
- Modify: `chords/-new-songbook/PROGRESSO.md` (retirar a prosa que desceu)

**Interfaces:**
- Consumes: o contrato do `INDICE.md` (spec) e a CLI (T4).
- Produces: o primeiro documento no padrão, que serve de modelo para os 14 da fase 2.

- [ ] **Step 1: Acrescentar o front matter ao `INDICE.md`**

No topo do arquivo, antes do `# Índice — Bossa Nova 1 (Almir Chediak)`:

```yaml
---
documento: Bossa Nova 1
acervo: -new-songbook
fonte: Songbook
tipo: pdf-scan
arquivo: "[Songbook] Bossa Nova 1 [Almir Chediak].pdf"
gerador: books/bossa_nova_1.py
saida: bossa-nova-1.somaplay
dificuldade: 5
dificuldade_por_que: "300 dpi, índice impresso no próprio PDF e scan íntegro; o offset muda uma vez, por página duplicada"
atualizado: 2026-08-13
---
```

- [ ] **Step 2: Descer a prosa do livro**

Mover do `chords/-new-songbook/PROGRESSO.md` (seção `## Bossa Nova 1 — Almir Chediak`, hoje por volta das linhas 126–193) para dentro do `INDICE.md` do livro, abaixo do mapa de páginas que já está lá:

- o método de verificação do mapa de páginas — **já está no INDICE.md**, conferir e não duplicar;
- o parágrafo do PDF duplicado solto na pasta-mãe (`728464245-…`);
- a seção `### Pendências / decisões deste livro` inteira;
- a seção `#### Samba de uma nota só (p.120) — 2 diagramas do livro NÃO batem com o nome`, com a tabela dos dois acordes.

No `PROGRESSO.md` do acervo, a seção do Bossa Nova 1 fica reduzida a uma linha apontando para o índice — ou some, já que a tabela gerada já lista o livro.

- [ ] **Step 3: Atualizar a legenda do `INDICE.md` para os seis status**

Substituir a legenda de três itens (linhas 31–35) por:

```markdown
## Legenda de status

- ⬜ não extraída
- 🔲 gerada, no `.somaplay`, ainda não conferida no app
- ✅ conferida no app contra o impresso
- ⚠️ extraída com pendência conhecida (ver a coluna Obs)
- 🚫 não extraível — perda real
- ⏸️ duplicada, decidido extrair de outro documento
```

- [ ] **Step 4: Marcar ⏸️ em *Atrás da porta***

O `PROGRESSO-EXTRACAO.md` registra que *O barquinho*, *Atrás da porta* e *Minha namorada* existem também nas 101 Melhores, e que extrair as duas cópias criaria música duplicada. Só *Atrás da porta* está neste livro na linha 46 do índice; as outras duas ficam para quando os respectivos livros forem migrados.

**Não marcar sem confirmar com o usuário de qual livro extrair** — a decisão está registrada como aberta. Se não houver decisão, deixar ⬜ e anotar na coluna Obs. Este passo é o único do plano que depende de resposta humana.

- [ ] **Step 5: Rodar e conferir o número contra o que o arquivo declara hoje**

Run: `python3 scripts/chords/progresso.py && grep -A3 "Bossa Nova 1" chords/PROGRESSO.md`
Expected: **2 feitas de 62 extraíveis** (ou 61, se o Step 4 marcou ⏸️), dificuldade 5, e o livro **sai** da lista de fora do padrão. Os outros 14 continuam lá.

- [ ] **Step 6: `--check` limpo**

Run: `python3 scripts/chords/progresso.py --check`
Expected: `tudo em sync`, saída 0.

---

### Task 7: A skill `/chord`

**Files:**
- Create: `.claude/skills/chord/SKILL.md`
- Create: `.claude/skills/chord/recipes/pdf-scan.md`
- Create: `.claude/skills/chord/recipes/pdf-texto.md`
- Create: `.claude/skills/chord/recipes/docx.md`
- Create: `.claude/skills/chord/recipes/imagens.md`

**Interfaces:**
- Consumes: `scripts/chords/progresso.py` (T4), o contrato do `INDICE.md` (spec), o piloto (T6) como exemplo.
- Produces: os comandos `/chord`, `/chord indice`, `/chord update`, `/chord extract`.

- [ ] **Step 1: Escrever o `SKILL.md`**

Frontmatter no formato das skills do repo:

```markdown
---
name: chord
description: Indexa, extrai e acompanha o progresso do acervo de cifras em chords/. Use quando o usuário rodar /chord (com ou sem subcomando), pedir para levantar o índice de um songbook ou pasta, extrair uma música de um livro, ou atualizar o dashboard de progresso da extração.
---
```

O corpo cobre, em português:

1. **A hierarquia de três níveis** e a regra de ouro: só o `INDICE.md` é editado à mão; os outros dois níveis são gerados por `python3 scripts/chords/progresso.py`. Nunca editar número dentro de `<!-- chord:auto -->`.
2. **O contrato do `INDICE.md`** — o front matter com os campos obrigatórios (`documento`, `acervo`, `tipo`, `dificuldade`) e os opcionais, e a exigência de uma tabela com coluna `Status` cujo primeiro caractere é o emoji.
3. **Os seis status**, com a tabela de efeito no denominador, e a regra **a skill nunca marca ✅** — ✅ é humano abrindo o app contra o impresso.
4. **A escala de dificuldade 1-10** com as âncoras da spec e os fatores que a movem, o maior deles sendo a existência de camada de texto no PDF.
5. **Os quatro comandos**, cada um com seus passos.
6. **As três regras que não se negociam**, copiadas do `CLAUDE.md`: não traduzir nem renotar a cifra do usuário (alinhamento por coluna de caractere); nenhuma letra ou cifra de terceiro no repositório versionado; não apagar PDF duplicado — registrar.
7. **Roteamento das recipes:** carregar `recipes/<tipo>.md` só quando o documento for daquele tipo.

- [ ] **Step 2: Escrever `recipes/pdf-scan.md`**

O caso caro, e o único com conhecimento acumulado real. Destilar do `PROGRESSO.md` do `-new-songbook`:

- **levantar o índice impresso** — e, quando faltar, procurar nos volumes vizinhos da mesma coleção (foi o catálogo da Lumiar no vol. 4 que destravou os vols. 2 e 3);
- **verificar o mapa de páginas, nunca extrapolar de uma calibração** — ler o fólio impresso página a página e depois casar o título de cada música com a página prevista. O Bossa Nova 1 extrapolou e errou; o Caetano vol. 2 tem offset mudando 4 vezes;
- **classificar cada anomalia**: re-scan duplicado, página não escaneada (perda real → 🚫), páginas trocadas;
- **medir o estado do scan** antes de investir: dpi, bitonal, inclinação por página, sujeira de borda;
- **ferramentas** `inspect_pdf.py`, `measure_cifra.py` (rodar duas vezes, `--gap 0.8` no acorde e `2.2` na letra), `tokens_skel.py`, `measure_diagrams.py`, `check_cifra.py`, com as manhas já registradas — achar a caixa pelas linhas horizontais, dois limiares (170 braço / 128 ponto), a faixa de fólio que varia por coleção;
- **escala por música, não por livro**: a maior que não empurra acorde nem sílaba.

- [ ] **Step 3: Escrever `recipes/pdf-texto.md`**

O caso barato, destilado do `INDICE.md` do Rodrigo Vianna: mapa de páginas sai dos links do índice interativo; a cifra vem do PDF; **a cifra não fica escrita no módulo** — o extrator a reconstrói na geração, que é o que mantém letra de terceiro fora do código. E as sete armadilhas medidas daquele livro (dois vermelhos de acorde, salto de kerning que não é espaço, ordem canônica dos pedaços do acorde, página de continuação sem cabeçalho, grade descartada por retângulo e não por cor, spans duplicados por sobreimpressão, página inteira em corpo reduzido).

- [ ] **Step 4: Escrever `recipes/docx.md` e `recipes/imagens.md`**

`docx.md`: `textutil` para converter, tom no corpo do texto contra tom no metadado, uma pasta de artista = um documento, fonte `VJ`.

`imagens.md`: uma linha por arquivo; identificar título e artista; **registrar a largura em px** — as capturas de ~595 px borram no tablet e o alvo é ~2×; imagem sem artista identificado fica em `_a-identificar` até ter.

Os dois são curtos e crescem quando o primeiro documento de cada tipo for realmente indexado — está declarado na spec que os tipos crescem sob demanda.

- [ ] **Step 5: Verificar que a skill carrega**

Run: reiniciar a sessão e conferir que `chord` aparece na lista de skills disponíveis, e que `/chord` sozinho imprime o dashboard.

- [ ] **Step 6: Commit**

```bash
git add .claude/skills/chord docs/superpowers/plans/2026-08-13-skill-chord.md
git commit -m "feat(chord): skill /chord com recipes por tipo de documento"
```

---

## Fase 2 — migrar os 14 documentos restantes

Sessão separada, depois de a fase 1 estar em uso. Repetir por documento os Steps 1-3 da Task 6 e rodar `progresso.py --check` ao final de cada um.

Ordem sugerida, do mais barato ao mais caro (quem já tem prosa completa no `PROGRESSO.md` sai rápido):

1. Rodrigo Vianna vol. 3 — `INDICE.md` já é praticamente o formato final, dif. 2
2. Bossa Nova 2, 3 e 4 — prosa completa e comum às três, dif. 7-8
3. Caetano Veloso vol. 2 — prosa completa, dif. 9
4. Chico Buarque vol. 1 — prosa completa, dif. 3
5. 101 Melhores vols. 1 e 2 — dois índices numa pasta só, dif. 6
6. Gilberto Gil vol. 2 — a exceção do pipeline antigo, dif. 8
7. Dorival Caymmi vol. 2, Djavan vol. 2, Cazuza vol. 1, Rita Lee — só índice levantado

Ao final, o `PROGRESSO.md` do `-new-songbook` fica só com: o método comum (as duas conferências e por que nenhuma substitui a outra), os aprendizados que valem para todos os livros, e o bloco gerado. A conferência de aceite da fase 2:

- `python3 scripts/chords/progresso.py --check` → `tudo em sync`
- **nenhum documento na seção "fora do padrão"**
- as contagens batem com o que o arquivo declara hoje: 37/64 Gil, 60/60 Rodrigo Vianna, 5/50 melhores vol. 1, 4/56 Chico vol. 1, 2/62 Bossa Nova 1, 1/68 Caetano vol. 2, 2/49 Caymmi vol. 2, 0 nos demais. **Divergência aqui é erro de leitura na migração, não do script** — investigar antes de aceitar o número novo.
