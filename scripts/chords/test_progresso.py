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
            self.assertEqual(sorted(por_acervo),
                             ["-new-songbook", "-pasta-vitor"])
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
            self.assertIn("2 de 62", dash.read_text(encoding="utf-8"))

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
