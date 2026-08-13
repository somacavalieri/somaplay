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
        self.assertIn("| 0 | 61 |", t)

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
