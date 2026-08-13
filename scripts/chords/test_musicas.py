import unittest
import tempfile
from pathlib import Path

from musicas import coleta, escreve, glifo_de

FRONT = """---
documento: %s
acervo: -pasta-vitor
tipo: docx
dificuldade: 3
---

## Legenda de status

- ⬜ não extraída
- 🔲 gerada

| Música | Tom | Estilo | Status |
|---|---|---|---|
%s
"""


def artista(raiz, nome, linhas):
    pasta = raiz / "-pasta-vitor" / nome
    pasta.mkdir(parents=True, exist_ok=True)
    (pasta / "INDICE.md").write_text(FRONT % (nome, "\n".join(linhas)),
                                     encoding="utf-8")


class TestGlifo(unittest.TestCase):
    def test_pendencia_volta_com_variation_selector(self):
        """Sem o U+FE0F o ⚠️ renderiza como símbolo de texto, não emoji."""
        self.assertEqual(glifo_de("pendencia"), "⚠️")
        self.assertEqual(glifo_de("duplicada"), "⏸️")

    def test_os_outros_voltam_sem_seletor(self):
        self.assertEqual(glifo_de("gerada"), "🔲")
        self.assertEqual(glifo_de("nao_extraida"), "⬜")


class TestColeta(unittest.TestCase):
    def test_junta_documentos_e_ordena_por_titulo(self):
        with tempfile.TemporaryDirectory() as d:
            raiz = Path(d)
            artista(raiz, "Zeca", ["| Uma coisa | C | Samba | 🔲 |"])
            artista(raiz, "Ana", ["| Barco | D | MPB | ⬜ |"])
            linhas, docs = coleta(raiz / "-pasta-vitor")
            self.assertEqual(docs, 2)
            self.assertEqual([l[0] for l in linhas], ["Barco", "Uma coisa"])
            self.assertEqual(linhas[0][1], "Ana")

    def test_ordem_ignora_acento_e_caixa(self):
        with tempfile.TemporaryDirectory() as d:
            raiz = Path(d)
            artista(raiz, "A", ["| Último | C | MPB | 🔲 |",
                                "| Ácido | C | MPB | 🔲 |",
                                "| beijo | C | MPB | 🔲 |"])
            linhas, _ = coleta(raiz / "-pasta-vitor")
            self.assertEqual([l[0] for l in linhas], ["Ácido", "beijo", "Último"])

    def test_legenda_nao_vira_linha(self):
        """A legenda tem os mesmos emojis, mas não é tabela."""
        with tempfile.TemporaryDirectory() as d:
            raiz = Path(d)
            artista(raiz, "A", ["| Só uma | C | MPB | 🔲 |"])
            linhas, _ = coleta(raiz / "-pasta-vitor")
            self.assertEqual(len(linhas), 1)

    def test_campo_vazio_vira_travessao(self):
        with tempfile.TemporaryDirectory() as d:
            raiz = Path(d)
            artista(raiz, "A", ["| Sem tom |  | MPB | 🔲 |"])
            linhas, _ = coleta(raiz / "-pasta-vitor")
            self.assertEqual(linhas[0][2], "—")


class TestEscreve(unittest.TestCase):
    def test_nao_se_chama_INDICE(self):
        """INDICE*.md aqui seria lido por progresso.py e contado duas vezes."""
        with tempfile.TemporaryDirectory() as d:
            raiz = Path(d)
            artista(raiz, "A", ["| Uma | C | MPB | 🔲 |"])
            alvo, n, _ = escreve(raiz, "-pasta-vitor", "2026-08-13")
            self.assertEqual(alvo.name, "MUSICAS.md")
            self.assertFalse(alvo.name.startswith("INDICE"))
            self.assertEqual(n, 1)

    def test_regerar_da_o_mesmo_arquivo(self):
        with tempfile.TemporaryDirectory() as d:
            raiz = Path(d)
            artista(raiz, "A", ["| Uma | C | MPB | 🔲 |"])
            alvo, _, _ = escreve(raiz, "-pasta-vitor", "2026-08-13")
            primeiro = alvo.read_bytes()
            escreve(raiz, "-pasta-vitor", "2026-08-13")
            self.assertEqual(alvo.read_bytes(), primeiro)

    def test_acervo_inexistente_levanta(self):
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaises(ValueError):
                escreve(Path(d), "-nao-existe", "2026-08-13")


if __name__ == "__main__":
    unittest.main()
