#!/bin/bash
# Soma_play — servidor local de desenvolvimento.
# Dê DOIS CLIQUES neste arquivo (macOS) para abrir o app em http://localhost:8137/
# Deixe a janela do Terminal aberta enquanto usa. Feche a janela (ou Ctrl+C) para parar.

cd "$(dirname "$0")/app" || { echo "Pasta app/ não encontrada"; exit 1; }

# Libera a porta 8137 caso algo tenha ficado preso nela.
lsof -ti:8137 | xargs kill 2>/dev/null

echo ""
echo "  Soma_play  →  http://localhost:8137/"
echo "  (deixe esta janela aberta; Ctrl+C para parar)"
echo ""
python3 -m http.server 8137
