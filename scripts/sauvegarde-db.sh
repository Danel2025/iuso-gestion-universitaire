#!/usr/bin/env bash
# Sauvegarde chiffrée de la base PostgreSQL vers un bucket R2 (juridiction eu).
#
# Variables obligatoires :
#   DATABASE_URL            connexion directe à la base (pas Hyperdrive)
#   SAUVEGARDE_PASSPHRASE   phrase secrète de chiffrement (à conserver hors de Cloudflare et de GitHub)
#   SAUVEGARDE_BUCKET       bucket R2 de destination, ex. iuso-sauvegardes-db-production
#   CLOUDFLARE_API_TOKEN et CLOUDFLARE_ACCOUNT_ID (lus par wrangler)
# Variable facultative : SAUVEGARDE_SANS_ENVOI=1 pour s'arrêter après le chiffrement local.
#
# Le client pg_dump doit avoir une version supérieure ou égale à celle du serveur.
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL manquante}"
: "${SAUVEGARDE_PASSPHRASE:?SAUVEGARDE_PASSPHRASE manquante}"
: "${SAUVEGARDE_BUCKET:?SAUVEGARDE_BUCKET manquante}"

travail=$(mktemp -d)
trap 'rm -rf "$travail"' EXIT

nom="iuso-$(date -u +%Y%m%dT%H%M%SZ).dump.gpg"

pg_dump --format=custom --no-owner --no-privileges --file="$travail/base.dump" "$DATABASE_URL"
# Une archive illisible ne doit jamais être envoyée comme si elle était bonne.
pg_restore --list "$travail/base.dump" > /dev/null

# gpg (chiffrement symétrique AES-256 avec contrôle d'intégrité) ; la phrase passe par un descripteur, pas par la ligne de commande.
gpg --batch --yes --quiet --pinentry-mode loopback --passphrase-fd 3 \
  --symmetric --cipher-algo AES256 --output "$travail/$nom" "$travail/base.dump" 3<<< "$SAUVEGARDE_PASSPHRASE"

echo "Archive chiffrée : $nom ($(wc -c < "$travail/$nom") octets)"

if [ "${SAUVEGARDE_SANS_ENVOI:-0}" = "1" ]; then
  cp "$travail/$nom" "./$nom"
  echo "Envoi ignoré, copie locale : ./$nom"
  exit 0
fi

# wrangler limite l'envoi à 300 Mio par objet ; au-delà, passer à l'API S3 de R2 (envoi multipart).
pnpm exec wrangler r2 object put "$SAUVEGARDE_BUCKET/db/$nom" \
  --file "$travail/$nom" --content-type application/octet-stream --remote --jurisdiction eu
echo "Envoyée vers $SAUVEGARDE_BUCKET/db/$nom"
