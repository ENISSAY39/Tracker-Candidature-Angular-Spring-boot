#!/usr/bin/env bash
# Restaure une sauvegarde : remplace tout le contenu de la base par celui du fichier.
#   scripts/restore.sh data/backups/tracker-AAAA-MM-JJ_HHMM.sql
# Demande une confirmation, sauvegarde d'abord l'état actuel, puis rejoue le fichier en une seule
# transaction : tout ou rien. Le service « backup » doit tourner (docker compose up -d postgres backup).
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage : scripts/restore.sh <fichier.sql>" >&2
  exit 2
fi
file=$1
if [ ! -s "$file" ]; then
  echo "Fichier introuvable ou vide : $file" >&2
  exit 2
fi
# Chemin absolu avant de se placer à la racine du dépôt, où Compose trouve compose.yaml et .env
file=$(cd "$(dirname "$file")" && pwd)/$(basename "$file")
cd "$(dirname "$0")/.."

echo "La restauration REMPLACE tout le contenu de la base par celui de :"
echo "  $file"
echo "Une sauvegarde de sécurité de l'état actuel sera faite juste avant."
answer=
read -r -p "Taper « restaurer » pour continuer : " answer || true
if [ "$answer" != "restaurer" ]; then
  echo "Restauration annulée, base inchangée." >&2
  exit 1
fi

echo "Sauvegarde de sécurité de l'état actuel…"
docker compose exec -T backup backup-now </dev/null

echo "Restauration…"
if ! docker compose exec -T backup psql --quiet --single-transaction --set ON_ERROR_STOP=1 <"$file" >/dev/null; then
  echo "Restauration refusée : la transaction est annulée, la base est inchangée." >&2
  exit 1
fi
echo "Restauration terminée."
