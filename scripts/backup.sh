#!/usr/bin/env bash
# Sauvegarde de la base, exécutée dans le conteneur « backup » sous le nom « backup-now » (compose.yaml).
#   backup-now           sauvegarde immédiate, puis rétention
#   backup-now --loop    commande du conteneur : sauvegarde si la plus récente a plus de 24 h, vérifié toutes les heures
#   backup-now --check   healthcheck : échec si la plus récente a plus de 48 h ou si la dernière tentative a échoué
# La connexion vient des variables PG* du conteneur ; les fichiers vont dans /backups (BACKUP_DIR sur l'hôte).
set -euo pipefail
# Tri des noms de fichiers octet par octet : « _2317.sql » avant « _231757.sql », quelle que soit la locale
export LC_ALL=C

readonly DIR=/backups
readonly KEEP=${BACKUP_KEEP:-90}
# tracker-AAAA-MM-JJ_HHMM.sql, ou …_HHMMSS.sql quand la minute est déjà prise : l'ordre des noms reste chronologique
readonly PATTERN='tracker-[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]_[0-9][0-9][0-9][0-9]*.sql'
readonly FAILURE_MARKER=$DIR/.last-backup-failed
partial=

log() {
  echo "$(date '+%F %T') $*"
}

# Vrai s'il existe une sauvegarde de moins de $1 minutes
has_backup_newer_than() {
  [ -n "$(find "$DIR" -maxdepth 1 -type f -name "$PATTERN" -mmin "-$1" -print -quit)" ]
}

# Supprime les sauvegardes les plus anciennes au-delà de KEEP
prune() {
  local files excess
  shopt -s nullglob
  files=("$DIR"/$PATTERN)
  shopt -u nullglob
  excess=$((${#files[@]} - KEEP))
  if ((excess > 0)); then
    rm -f -- "${files[@]:0:excess}"
    log "Rétention : $excess sauvegarde(s) supprimée(s), $KEEP conservée(s)."
  fi
}

backup() {
  local target
  # Toute erreur ci-dessous arrête le script : le fichier partiel est retiré et l'échec est noté pour le healthcheck
  trap 'on_backup_exit $?' EXIT
  if ! [[ $KEEP =~ ^[1-9][0-9]*$ ]]; then
    log "BACKUP_KEEP doit être un entier strictement positif (reçu : « $KEEP »)." >&2
    exit 1
  fi
  target=$DIR/tracker-$(date +%Y-%m-%d_%H%M).sql
  # Minute déjà prise : nom à la seconde, pour ne rien écraser et rester la plus récente dans l'ordre des noms
  if compgen -G "${target%.sql}*.sql" >/dev/null; then
    target=$DIR/tracker-$(date +%Y-%m-%d_%H%M%S).sql
    while [ -e "$target" ]; do
      sleep 1
      target=$DIR/tracker-$(date +%Y-%m-%d_%H%M%S).sql
    done
  fi
  # Fichier caché, renommé une fois complet : jamais de dump à moitié écrit sous un nom de sauvegarde
  partial=$DIR/.$(basename "$target").$$.partial
  pg_dump --clean --if-exists --file="$partial"
  mv -- "$partial" "$target"
  rm -f -- "$FAILURE_MARKER"
  log "Sauvegarde créée : $(basename "$target")"
  prune
}

on_backup_exit() {
  if [ "$1" -ne 0 ]; then
    [ -z "$partial" ] || rm -f -- "$partial"
    touch "$FAILURE_MARKER"
    log "Échec de la sauvegarde : aucun fichier créé, aucune sauvegarde supprimée." >&2
  fi
}

loop() {
  # Arrêt immédiat sur « docker compose stop », sans attendre la fin du sommeil
  trap 'exit 0' TERM INT
  while true; do
    if ! has_backup_newer_than $((24 * 60)); then
      "$0" || true
    fi
    sleep 3600 &
    wait $!
  done
}

check() {
  if [ -e "$FAILURE_MARKER" ]; then
    echo "La dernière tentative de sauvegarde a échoué."
    return 1
  fi
  if ! has_backup_newer_than $((48 * 60)); then
    echo "Aucune sauvegarde de moins de 48 h."
    return 1
  fi
}

case "${1:-}" in
  "") backup ;;
  --loop) loop ;;
  --check) check ;;
  *)
    echo "Usage : backup-now [--loop | --check]" >&2
    exit 2
    ;;
esac
