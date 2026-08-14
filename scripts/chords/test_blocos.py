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
