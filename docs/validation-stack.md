# Validation de la stack : TanStack Start + Cloudflare + PostgreSQL

> Vérifiée le 2026-10-08 dans les documentations officielles (Cloudflare, TanStack, registre npm) et les textes publiés par l'autorité gabonaise de protection des données. Complète les décisions D1, D2 et D7 de [PLAN.md](PLAN.md).

## Verdict

**La stack est validée**, à une condition bloquante qui n'est pas technique : l'hébergement des données hors du Gabon doit être **autorisé par l'APDPVP** (voir §5). La procédure prend jusqu'à deux mois, donc elle doit démarrer pendant le cadrage (L0).

| Brique | Choix validé | Statut |
|---|---|---|
| Framework | TanStack Start (React), dernière version npm `@tanstack/react-start` 1.168.x (2026-09-30) | ✅ supporté officiellement par Cloudflare |
| Exécution | Cloudflare Workers, **plan Workers Paid obligatoire** | ✅ |
| Base de données | PostgreSQL managé (Supabase ou Neon) via **Hyperdrive**, driver `pg` | ✅ recommandé, D1 écarté |
| Fichiers | R2 avec juridiction `eu` | ✅ |
| E-mails | Cloudflare Email Service (Email Sending, bêta publique) ou fournisseur externe | ⚠️ bêta : garder un plan B |
| SMS | Fournisseur externe (aucun service SMS chez Cloudflare), appelé depuis une Queue | ⬜ à choisir (D5) |
| Traitements différés | Queues (envois en masse), Cron Triggers (relances) | ✅ |
| PDF (relevés, attestations, PV) | Browser Run `/pdf` depuis le Worker, ou `pdf-lib` pour les documents simples | ✅ |
| Données personnelles | Loi n° 025/2023 (modifiant la loi n° 001/2011), autorité APDPVP | ⛔ autorisation de transfert à obtenir |

## 1. TanStack Start sur Cloudflare Workers

- Cloudflare publie un guide officiel TanStack Start ; `npm create cloudflare@latest -- <app> --framework=tanstack-start` génère un projet prêt. On utilise le plugin Vite `@cloudflare/vite-plugin` avec le drapeau `nodejs_compat` ([guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/)).
- Le pré-rendu statique est disponible depuis `@tanstack/react-start` 1.138. Il convient aux pages publiques fixes (présentation des concours) ([changelog](https://developers.cloudflare.com/changelog/post/2025-12-19-tanstack-start-prerendering/)).
- Des Workers auxiliaires peuvent tourner à côté de l'application (Vite 7 ou plus), par exemple pour consommer les Queues ([changelog](https://developers.cloudflare.com/changelog/post/2026-01-20-auxiliary-workers/)).

**Bonne pratique de sécurité (doc TanStack) :** la vérification de session dans `beforeLoad` ne sert qu'à l'ergonomie des routes. **Chaque `createServerFn` qui lit ou modifie des données privées doit porter un middleware d'authentification et d'autorisation**, car une server function est un point d'entrée HTTP appelable directement ([doc middleware](https://tanstack.com/start/latest/docs/framework/react/guide/middleware)).

## 2. Limites des Workers

D'après la [page des limites](https://developers.cloudflare.com/workers/platform/limits/) :
- Plan gratuit : **10 ms de CPU par requête**, insuffisant pour le rendu serveur et le calcul des moyennes. Le **plan Workers Paid** donne 30 s de CPU par défaut, extensible à 5 min (`limits.cpu_ms`).
- L'attente réseau (base de données, R2) ne compte pas dans le temps CPU.
- Taille des requêtes : 100 Mo sur les plans Free et Pro, largement suffisant pour les justificatifs. La taille maximale par fichier reste à fixer par l'IUSO (§5.1 du CDC).
- Les calculs lourds (délibérations d'une promotion entière, génération de PDF en lot) doivent passer par Queues ou Workflows plutôt que par une requête utilisateur.

## 3. Base de données : PostgreSQL via Hyperdrive plutôt que D1

- Hyperdrive met en commun les connexions PostgreSQL au plus près des Workers. Le driver recommandé est `node-postgres` (`pg` 8.13 ou plus) ; Postgres.js est aussi supporté, mais jamais avec `prepare: false` ([doc](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/)).
- **Le pooling se fait en mode transaction** : un `SET` ne dure que le temps d'une transaction ([doc](https://developers.cloudflare.com/hyperdrive/concepts/connection-pooling/)). Conséquence : si l'on utilise la RLS avec des claims de session (`set_config(...)`), il faut les poser **dans chaque transaction**. On fera donc de toute opération sensible une transaction explicite.
- Hyperdrive met en cache les requêtes de lecture. Pour les notes, paiements et inscriptions, il faut **désactiver le cache**, ou utiliser une configuration Hyperdrive sans cache pour les données sensibles, afin d'éviter d'afficher des valeurs périmées.
- Pourquoi pas D1 : D1 est du SQLite, avec une taille maximale par base et des quotas journaliers ([debug D1](https://developers.cloudflare.com/d1/observability/debug-d1/)). PostgreSQL apporte un vrai typage, des contraintes, la RLS et des transactions longues, mieux adaptés aux notes, moyennes et paiements.
- Une base privée, non exposée sur internet, reste possible via Workers VPC si l'IUSO l'exige ([changelog](https://developers.cloudflare.com/changelog/post/2026-04-29-hyperdrive-vpc-private-databases/)).

**Choix de l'authentification (à trancher en conception) :** Supabase Auth, ou une bibliothèque d'authentification exécutée dans TanStack Start. Dans les deux cas, **l'autorisation est appliquée côté serveur**, dans le middleware des server functions, et doublée de la RLS PostgreSQL.

## 4. Fichiers, e-mails, PDF

- **R2** : créer les buckets avec la **juridiction `eu`**, qui garantit le stockage et le traitement dans l'UE. Cette juridiction ne peut plus être changée après la création ([doc](https://developers.cloudflare.com/r2/reference/data-location/)). Les justificatifs, PV et attestations ne sont jamais publics : on les sert via le Worker après contrôle des droits, ou par URL signée de courte durée.
- **E-mails** : Cloudflare Email Service permet l'envoi depuis un Worker (`env.EMAIL.send()`), sur le plan payant, mais il est **encore en bêta publique** ([doc](https://developers.cloudflare.com/email-service/)). On l'encapsule derrière une interface pour pouvoir basculer vers un autre fournisseur.
- **PDF** : Browser Run `/pdf` génère un PDF depuis du HTML, directement depuis le Worker via la méthode `quickAction()` ([doc](https://developers.cloudflare.com/browser-run/quick-actions/pdf-endpoint/)). C'est adapté aux attestations avec QR code et aux relevés mis en page en HTML/CSS. Les PDF sont produits une fois, stockés dans R2 avec leur empreinte (hash) en base, puis servis.

## 5. Conformité : loi gabonaise sur les données personnelles

- Texte applicable : **loi n° 025/2023 du 12 juillet 2023**, qui modifie la loi n° 001/2011. La CNPDCP est devenue l'**APDPVP** (Autorité pour la Protection des Données Personnelles et de la Vie Privée) ([JO](https://journal-officiel.ga/20085-025-2023-/), [Gabonmediatime](https://gabonmediatime.com/gabon-cnpdcp-transformee-autorite-pour-protection-des-donnees-caractere-personnel-vie-privee/)).
- D'après une décision publiée par l'APDPVP ([autorisation Startimes, 2023](https://www.apdpvp.ga/wp-content/uploads/2024/12/AUTORISATION-DE-TRANSFERT-STARTIMES-MEDIA-GABON-26-SEPTEMBRE-2023.pdf)) :
  - **art. 81** : un transfert vers un pays tiers nécessite une **autorisation préalable de l'APDPVP**. Elle statue sous deux mois, prolongeables une fois, et **son silence vaut rejet** ;
  - **art. 171** : un transfert n'est possible que vers un État offrant un niveau de protection suffisant ;
  - **art. 173** : exceptions possibles (consentement exprès, nécessité contractuelle, clauses contractuelles reconnues par l'APDPVP) ;
  - art. 118 : durée de conservation limitée ; art. 119-120 : registre des traitements.
- **Conséquences pour le projet :**
  1. Déposer dès le cadrage une **demande d'autorisation de transfert** (données dans l'UE : R2 `eu`, base PostgreSQL dans une région européenne).
  2. Tenir un **registre des traitements** et fixer des **durées de conservation** par type de donnée (candidatures non retenues, pièces justificatives, notes, PV, diplômes).
  3. Recueillir le consentement et informer les candidats et étudiants dans les formulaires.
  4. À faire valider par un juriste ou par l'APDPVP : le statut de l'IUSO (public ou privé) peut changer la procédure. Je n'ai pas lu le texte intégral de la loi, seulement les articles cités par la décision de l'APDPVP.

## 6. Points d'architecture qui découlent de la validation

1. Un seul Worker pour l'application TanStack Start, plus un Worker consommateur de Queues pour les e-mails, SMS et PDF en lot.
2. Les droits sont vérifiés dans le middleware des server functions et doublés par la RLS PostgreSQL. Aucun contrôle ne repose uniquement sur le client.
3. Les opérations sensibles (saisie de notes, validation de paiement, signature de PV, émission d'attestation) se font dans des transactions explicites, avec un journal d'audit en base.
4. Les attestations reçoivent un identifiant non devinable, un QR code pointant vers une page publique de vérification, et l'empreinte du PDF est stockée.
5. Environnements séparés dev / recette / prod : un Worker, une base et un bucket R2 par environnement.

## Sources

- Cloudflare : [TanStack Start](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/), [limites Workers](https://developers.cloudflare.com/workers/platform/limits/), [Hyperdrive + Postgres](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/), [pooling Hyperdrive](https://developers.cloudflare.com/hyperdrive/concepts/connection-pooling/), [R2 data location](https://developers.cloudflare.com/r2/reference/data-location/), [Email Service](https://developers.cloudflare.com/email-service/), [Browser Run PDF](https://developers.cloudflare.com/browser-run/quick-actions/pdf-endpoint/)
- TanStack : [authentification et middleware](https://tanstack.com/start/latest/docs/framework/react/guide/middleware)
- npm (2026-10-08) : `@tanstack/react-start` 1.168.60, `@tanstack/react-router` 1.170.41, `@cloudflare/vite-plugin` 1.63.0, `wrangler` 4.148.0, `pg` 8.23.1
- Gabon : [Loi n° 025/2023 (JO)](https://journal-officiel.ga/20085-025-2023-/), [décision APDPVP Startimes](https://www.apdpvp.ga/wp-content/uploads/2024/12/AUTORISATION-DE-TRANSFERT-STARTIMES-MEDIA-GABON-26-SEPTEMBRE-2023.pdf), [CNPDCP devenue APDPVP](https://gabonmediatime.com/gabon-cnpdcp-transformee-autorite-pour-protection-des-donnees-caractere-personnel-vie-privee/)
