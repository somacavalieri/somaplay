import unittest
from pathlib import Path

from indice import Documento
from render import (barra, concluido, em_progresso, tabela_de_documentos,
                    bloco_acervo, bloco_dashboard)


def doc(nome, acervo="-new-songbook", dif="5", por_que="scan limpo",
        **contagem):
    return Documento(
        caminho=Path("chords/%s/%s/INDICE.md" % (acervo, nome)),
        meta={
            "documento": nome, "acervo": acervo, "tipo": "pdf-scan",
            "dificuldade": dif, "dificuldade_por_que": por_que,
            "atualizado": "2026-08-12",
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

    def test_progresso_pequeno_ainda_aparece(self):
        """2 de 62 arredonda a zero bloco; começado tem que diferir de intocado."""
        self.assertEqual(barra(0, 2, 62), "▓░░░░░░░░░")
        self.assertNotEqual(barra(0, 2, 62), barra(0, 0, 62))

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


class TestEmProgresso(unittest.TestCase):
    def test_comecado_e_inacabado(self):
        self.assertTrue(em_progresso(doc("A", gerada=2, nao_extraida=60)))

    def test_intocado_nao_esta_em_progresso(self):
        self.assertFalse(em_progresso(doc("A", nao_extraida=60)))

    def test_concluido_nao_esta_em_progresso(self):
        self.assertFalse(em_progresso(doc("A", gerada=10)))

    def test_denominador_zerado_continua_visivel(self):
        """Tudo 🚫: 0 feitas, mas some se cair na contagem de não começados."""
        d = doc("A", nao_extraivel=3)
        self.assertFalse(concluido(d))
        self.assertTrue(em_progresso(d))
        self.assertIn("A", bloco_dashboard({"-new-songbook": [d]}))


class TestConcluido(unittest.TestCase):
    def test_tudo_feito_e_concluido(self):
        self.assertTrue(concluido(doc("A", gerada=10)))

    def test_com_uma_pendente_nao_e_concluido(self):
        self.assertFalse(concluido(doc("A", gerada=9, nao_extraida=1)))

    def test_denominador_zerado_nao_conta_como_concluido(self):
        """Tudo 🚫 é anomalia; virar linha de contagem esconderia a perda."""
        self.assertFalse(concluido(doc("A", nao_extraivel=3)))


class TestDashboardEnxuto(unittest.TestCase):
    def _dash(self):
        return bloco_dashboard({
            "-new-songbook": [doc("Bossa Nova 1", gerada=2, nao_extraida=60)],
            "-pasta-vitor": [
                doc("Fagner", acervo="-pasta-vitor", dif="3", gerada=147),
                doc("Gal Costa", acervo="-pasta-vitor", dif="3", gerada=112),
            ],
        })

    def test_documento_concluido_nao_vira_linha_de_tabela(self):
        b = self._dash()
        self.assertIn("Bossa Nova 1", b)
        self.assertNotIn("Fagner", b)
        self.assertNotIn("Gal Costa", b)

    def test_documento_zerado_nao_vira_linha_de_tabela(self):
        """Livro que ninguém começou não é frente de trabalho; é fila."""
        b = bloco_dashboard({"-new-songbook": [
            doc("Bossa Nova 1", gerada=2, nao_extraida=60),
            doc("Cazuza vol. 1", nao_extraida=32),
        ]})
        self.assertIn("Bossa Nova 1", b)
        self.assertNotIn("Cazuza vol. 1", b)
        self.assertIn("Ainda não começados", b)
        self.assertIn("| `-new-songbook` | 1 | 32 |", b)

    def test_acervo_separa_em_progresso_de_zerado(self):
        b = bloco_dashboard({"-new-songbook": [
            doc("A", gerada=2, nao_extraida=60),
            doc("B", nao_extraida=32),
            doc("C", gerada=10),
        ]})
        linha = [l for l in b.splitlines()
                 if l.startswith("| `-new-songbook`")][0]
        self.assertTrue(linha.rstrip().endswith("| 3 | 1 | 1 |"), linha)

    def test_concluidos_aparecem_somados_por_acervo(self):
        b = self._dash()
        self.assertIn("Documentos concluídos", b)
        self.assertIn("| `-pasta-vitor` | 2 | 259 |", b)
        self.assertIn("chords/-pasta-vitor/PROGRESSO.md", b)

    def test_o_porque_da_dificuldade_vem_junto(self):
        b = bloco_dashboard({"-new-songbook": [
            doc("Bossa Nova 3", dif="8", por_que="bitonal 100 dpi",
                gerada=1, nao_extraida=56),
        ]})
        self.assertIn("bitonal 100 dpi", b)

    def test_porque_muito_longo_e_cortado(self):
        b = bloco_dashboard({"-new-songbook": [
            doc("X", por_que="palavra " * 40, gerada=1, nao_extraida=5),
        ]})
        linha = [l for l in b.splitlines() if l.startswith("| X |")][0]
        self.assertIn("…", linha)
        self.assertLess(len(linha), 250)

    def test_acervo_continua_listando_documento_concluido(self):
        """A lista completa não some — ela mora no PROGRESSO.md do acervo."""
        b = bloco_acervo("-pasta-vitor",
                         [doc("Fagner", acervo="-pasta-vitor", gerada=147)])
        self.assertIn("Fagner", b)


if __name__ == "__main__":
    unittest.main()
