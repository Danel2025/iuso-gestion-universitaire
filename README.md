# Plateforme IUSO-SNE

Plateforme web de gestion académique et administrative de l'Institut Universitaire des Sciences de l'Organisation Sophie Ntoutoume Emane : concours d'entrée, inscriptions, scolarité, évaluations, soutenances et diplômes.

## Stack

| Brique | Choix |
|---|---|
| Application | [TanStack Start](https://tanstack.com/start) (React, rendu serveur, server functions) |
| Exécution | Cloudflare Workers (plan Workers Paid requis) |
| Base de données | PostgreSQL managé, accédé via Hyperdrive avec `pg` et Drizzle ORM |
| Authentification | [Better Auth](https://www.better-auth.com) (e-mail + mot de passe, sessions en base) |
| Fichiers | Cloudflare R2, juridiction `eu`, jamais public |
| Envois différés | Cloudflare Queues (e-mails, SMS), Cron Triggers |

## Organisation du code

```
src/
  server.ts                 Point d'entrée du Worker : HTTP, Queue, Cron
  routes/                   Pages et routes API (routage par fichiers)
    api/auth/$.ts           Endpoints Better Auth
    api/fichiers/$id.ts     Téléchargement d'un fichier après contrôle des droits
    espace/                 Espace connecté (tableau de bord, référentiels, utilisateurs, journal)
  lib/                      Code partagé client/serveur, sans dépendance serveur
    droits.ts               Matrice rôles → permissions (FR013)
    fichiers.ts             Règles de dépôt (types, taille, signature binaire)
  server/                   Code exécuté uniquement côté serveur
    db/                     Schéma Drizzle et connexion par requête
    auth/                   Configuration Better Auth et middlewares d'accès
    fonctions/              Server functions appelées par les pages
    fournisseurs/           Interfaces e-mail, SMS, paiement et implémentations
    notifications/          Notifications et consommateur de la Queue
    fichiers/               Stockage R2
    audit.ts                Journal d'audit
drizzle/                    Migrations SQL versionnées
scripts/creer-admin.ts      Création du premier administrateur
```

## Règles de sécurité appliquées

- **Chaque server function vérifie elle-même la session et la permission** via `exigerPermission(...)` (`src/server/auth/middleware.ts`). Les redirections dans `beforeLoad` et le masquage des menus ne servent qu'à l'ergonomie.
- Les opérations sensibles s'exécutent dans une transaction qui écrit aussi une entrée du **journal d'audit**. Ce journal est inaltérable : un trigger PostgreSQL refuse `UPDATE`, `DELETE` et `TRUNCATE`.
- Les fichiers déposés sont contrôlés sur leur contenu réel (signature binaire), pas sur leur extension, et servis avec `cache-control: private, no-store`.
- Connexion limitée à 5 tentatives par minute ; compteurs stockés en base (la mémoire d'un Worker n'est pas partagée).
- Aucun secret dans le dépôt : `.env` et `.dev.vars` sont ignorés par Git.

## Démarrage en local

Prérequis : Node.js 22, pnpm 12 (`corepack enable` suffit) et un PostgreSQL local (16 ou plus).

```sh
pnpm install                      # Corepack ou pnpm 12 (version fixée par packageManager)
cp .env.example .env            # chaîne de connexion de la base locale
cp .dev.vars.example .dev.vars  # puis renseigner BETTER_AUTH_SECRET (openssl rand -base64 32)

# Base locale (adapter à votre installation)
createuser iuso --pwprompt       # mot de passe : iuso, ou adapter .env
createdb iuso_dev --owner iuso

pnpm run db:migrate
ADMIN_MOT_DE_PASSE='un-mot-de-passe-solide' pnpm run admin:creer admin@iuso-sne.ga "Nom de l'administrateur"
pnpm run dev                      # http://localhost:3000
```

En local, R2 et les Queues sont simulés par Wrangler ; les e-mails et SMS sont écrits dans les logs au lieu d'être envoyés.

## Commandes

| Commande | Rôle |
|---|---|
| `pnpm run dev` | Serveur de développement |
| `pnpm test` | Tests unitaires (Vitest) |
| `pnpm run db:generate` | Générer une migration après modification du schéma |
| `pnpm run db:migrate` | Appliquer les migrations sur `DATABASE_URL` |
| `pnpm run admin:creer` | Créer un compte administrateur |
| `pnpm run cf-typegen` | Régénérer les types des bindings après modification de `wrangler.jsonc` |
| `pnpm run deploy` | Construire et déployer (voir ci-dessous) |

## Mise en place Cloudflare (recette et production)

À faire une fois par environnement (`recette`, `production`) :

1. Créer la base PostgreSQL managée en région UE et appliquer les migrations (`DATABASE_URL=… pnpm run db:migrate`).
2. Créer la configuration Hyperdrive, puis reporter son identifiant dans `wrangler.jsonc` :
   `pnpm exec wrangler hyperdrive create iuso-recette --connection-string="postgres://…"`
3. Créer le bucket R2 en juridiction UE : `pnpm exec wrangler r2 bucket create iuso-fichiers-recette --jurisdiction eu`
4. Créer la Queue : `pnpm exec wrangler queues create iuso-notifications-recette`
5. Enregistrer le secret : `pnpm exec wrangler secret put BETTER_AUTH_SECRET --env recette`
6. Déployer : `CLOUDFLARE_ENV=recette pnpm run deploy`

Les domaines `*.iuso-sne.example` de `wrangler.jsonc` sont provisoires.

## Sauvegardes

| Donnée | Mécanisme | Destination | Fréquence |
|---|---|---|---|
| Base PostgreSQL | `scripts/sauvegarde-db.sh`, lancé par le workflow `sauvegarde.yml` : `pg_dump`, contrôle de l'archive, chiffrement GPG (AES-256) | bucket R2 `iuso-sauvegardes-db-<env>` (juridiction `eu`) | chaque nuit à 02 h 30 UTC |
| Fichiers (justificatifs, PV, attestations) | Cron du Worker : copie des objets absents de la sauvegarde (`src/server/sauvegardes/fichiers.ts`, jusqu'à 500 par passage) | bucket R2 `iuso-sauvegardes-fichiers-<env>` (juridiction `eu`) | chaque jour à 06 h 00 UTC |

À faire une fois par environnement, en plus de la mise en place Cloudflare :

1. Créer les buckets de sauvegarde :
   `pnpm exec wrangler r2 bucket create iuso-sauvegardes-db-production --jurisdiction eu` et
   `pnpm exec wrangler r2 bucket create iuso-sauvegardes-fichiers-production --jurisdiction eu`
2. Fixer la durée de conservation des archives de base (35 jours proposés, à valider avec le registre des traitements) :
   `pnpm exec wrangler r2 bucket lifecycle add iuso-sauvegardes-db-production expiration-35j --expire-days 35 --jurisdiction eu`
   Le bucket des fichiers n'expire pas : les suppressions ne sont pas répercutées dans la sauvegarde.
3. Renseigner les secrets de l'environnement GitHub : `DATABASE_URL`, `SAUVEGARDE_PASSPHRASE`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
   La phrase `SAUVEGARDE_PASSPHRASE` doit aussi être conservée hors de GitHub et de Cloudflare (coffre de mots de passe de l'IUSO) : sans elle, les archives sont illisibles.
4. Le jeton Cloudflare de sauvegarde ne doit avoir que l'écriture sur R2.

**Restaurer** dans une base vide :

```sh
CIBLE_DATABASE_URL='postgres://…' SAUVEGARDE_PASSPHRASE='…'   bash scripts/restaurer-db.sh iuso-sauvegardes-db-production db/iuso-20261009T023000Z.dump.gpg
```

Une sauvegarde jamais restaurée n'est pas une sauvegarde : faire un essai de restauration dans une base de recette après la mise en place, puis à chaque trimestre.

Sauvegardes de l'hébergeur : activer aussi la sauvegarde automatique et la restauration à un instant donné (PITR) du PostgreSQL managé ; elles complètent ces copies et ne les remplacent pas.

## Suivi du projet

Le plan d'avancement (lots L0 à L11, jalons, décisions) est tenu dans le projet Claude « Logiciel De Gestion Administrative Universitaire ». Ce dépôt correspond au lot **L2 Socle technique**.
