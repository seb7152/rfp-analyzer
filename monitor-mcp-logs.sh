#!/bin/bash

echo "🔍 Surveillance des requêtes MCP en temps réel..."
echo "🚀 Lancez MCP Inspector maintenant avec :"
echo "   npx @modelcontextprotocol/inspector http://localhost:3000/api/mcp"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Appuyez sur Ctrl+C pour arrêter la surveillance"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Afficher les logs du serveur en temps réel
tail -f /dev/null 2>/dev/null &
TAIL_PID=$!

# Simuler la surveillance des logs du serveur
while true; do
  # Lire les logs depuis la console ou un fichier de log
  if [ -f "logs/mcp.log" ]; then
    echo "📥 $(tail -n 1 logs/mcp.log)"
  fi
  sleep 0.5
done &
WATCH_PID=$!

# Attendre l'interruption
wait $WATCH_PID $TAIL_PID 2>/dev/null

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🛑 Surveillance arrêtée"
