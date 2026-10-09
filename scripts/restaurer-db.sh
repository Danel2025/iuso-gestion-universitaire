#!/usr/bin/env bash
# Restaure une sauvegarde chiffrée dans une base VIDE.
#
# Usage :
#   restaurer-db.sh <archive.dump.gpg>             archive déjà téléchargée
#   restaurer-db.sh <bucket> <db/iuso-….dump.gpg>   archive à télécharger depuis R2
#
# Variables obligatoires :
#   CIBLE_DATABASE_URL      base à remplir (créer d'abord une base vide)
#   SAUVEGARDE_PASSPHRASE   phrase secrète utilisée à la sauvegarde
# Pour le téléchargement : CLOUDFLARE_API_TOKEN et CLOUDFLARE_ACCOUNT_ID.
set -euo pipefail

: "${CIBLE_DATABASE_URL:?CIBLE_DATABASE_URL manquante}"
: "${SAUVEGARDE_PASSPHRASE:?SAUVEGARDE_PASSPHRASE manquante}"

travail=$(mktemp -d)
trap 'rm -rf "$travail"' EXIT

if [ $# -eq 1 ]; then
  archive=$1
elif [ $# -eq 2 ]; then
  archive="$travail/archive.dump.gpg"
  pnpm exec wrangler r2 object get "$1/$2" --file "$archive" --remote --jurisdiction eu
else
  sed -n '2,11p' "$0"; exit 1
fi

gpg --batch --yes --quiet --pinentry-mode loopback --passphrase-fd 3 \
  --decrypt --output "$travail/base.dump" "$archive" 3<<< "$SAUVEGARDE_PASSPHRASE"

# Pas de --clean : la restauration refuse d'écraser une base déjà peuplée.
pg_restore --no-owner --no-privileges --exit-on-error --dbname="$CIBLE_DATABASE_URL" "$travail/base.dump"
echo "Restauration terminée."
