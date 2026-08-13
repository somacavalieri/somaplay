import unittest
from pathlib import Path
import tempfile

from indice import parse_front_matter, count_status, read_indice

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
        cabecalho = "| Música | Status |\n|---|---|\n"
        com_vs = "| M | ⚠️ |\n"
        sem_vs = "| M | ⚠ |\n"
        self.assertEqual(count_status(cabecalho + com_vs)["pendencia"], 1)
        self.assertEqual(count_status(cabecalho + sem_vs)["pendencia"], 1)

    def test_negrito_nao_esconde_o_status(self):
        """As linhas do Bossa Nova 1 vêm como `**🔲 gerada, falta conferir**`."""
        cabecalho = "| Música | Status |\n|---|---|\n"
        c = count_status(cabecalho + "| **M** | **🔲 gerada, falta conferir** |\n")
        self.assertEqual(c.get("gerada"), 1)
        self.assertIsNone(c.get("desconhecido"))

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
