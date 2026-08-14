import unittest

from cli import normaliza_argv


class TestNormalizaArgv(unittest.TestCase):
    def test_acervo_com_hifen_vira_posicional(self):
        """`progresso.py -new-songbook` era 'unrecognized arguments'."""
        self.assertEqual(normaliza_argv(["-new-songbook"]),
                         ["--", "-new-songbook"])

    def test_acervo_com_underscore_tambem(self):
        self.assertEqual(normaliza_argv(["_a-identificar"]), ["_a-identificar"])

    def test_flag_longa_passa_intacta(self):
        self.assertEqual(normaliza_argv(["--check"]), ["--check"])

    def test_ajuda_passa_intacta(self):
        self.assertEqual(normaliza_argv(["-h"]), ["-h"])

    def test_flag_antes_do_acervo(self):
        self.assertEqual(normaliza_argv(["--check", "-pasta-vitor"]),
                         ["--check", "--", "-pasta-vitor"])

    def test_acervo_antes_da_flag(self):
        """Inserir `--` no lugar jogava a flag para depois do separador."""
        self.assertEqual(normaliza_argv(["-pasta-vitor", "--check"]),
                         ["--check", "--", "-pasta-vitor"])

    def test_acervo_antes_de_flag_com_valor(self):
        """O caso que quebrou de verdade: `musicas.py -pasta-vitor --data X`."""
        self.assertEqual(normaliza_argv(["-pasta-vitor", "--data", "2026-08-13"]),
                         ["--data", "2026-08-13", "--", "-pasta-vitor"])

    def test_separador_do_usuario_e_respeitado(self):
        self.assertEqual(normaliza_argv(["--", "-pasta-vitor"]),
                         ["--", "-pasta-vitor"])

    def test_valor_de_flag_longa_nao_confunde(self):
        self.assertEqual(normaliza_argv(["--raiz", "/tmp/x", "-Artistas"]),
                         ["--raiz", "/tmp/x", "--", "-Artistas"])

    def test_sem_argumento_nenhum(self):
        self.assertEqual(normaliza_argv([]), [])

    def test_nome_sem_hifen_passa_intacto(self):
        self.assertEqual(normaliza_argv(["new-general"]), ["new-general"])


if __name__ == "__main__":
    unittest.main()
