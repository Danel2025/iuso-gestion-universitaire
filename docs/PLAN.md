# Plan d'avancement — Plateforme de gestion académique et administrative IUSO-SNE

> Établi le 2026-10-08 à partir du cahier des charges (transcription : [cahier-des-charges-transcription.md](cahier-des-charges-transcription.md)).
> Document vivant : mettre à jour la colonne **Statut** et le **Journal** à chaque avancée.
> Légende statut : ⬜ à faire · 🟨 en cours · ✅ terminé · ⛔ bloqué

## 1. Synthèse du chantier

| Élément | Valeur |
|---|---|
| Client | IUSO-SNE (Institut Universitaire des Sciences de l'Organisation Sophie Ntoutoume Emane), Gabon |
| Objectif | Digitaliser les processus académiques et administratifs (concours → diplôme) |
| Utilisateurs | Candidats, étudiants, enseignants, personnel administratif, public (vérification des diplômes) |
| Exigences | 13 exigences FR001–FR013 (12 « Haute », FR007 « Moyenne ») |
| Livrables | Plateforme web modulaire, 4 modules métier, portail étudiants/enseignants, tableau de bord admin |
| Budget indicatif CDC | 21 000 000 FCFA (dont 10 M développement) |
| Durée proposée | ~40 semaines (≈ 9–10 mois), découpée en 6 phases du CDC et 12 lots |
| Méthode proposée | Agile par incréments : chaque lot métier livre un module utilisable, recetté par l'IUSO |

## 2. Décisions à prendre (avant la fin de la phase de cadrage)

| # | Question | Proposition par défaut | Statut |
|---|---|---|---|
| D1 | Stack technique | Application web TypeScript : **TanStack Start** (TanStack Router + Query, SSR pour les pages publiques) + PostgreSQL ; Supabase (Auth, Storage, RLS) ou back-end Node dédié selon l'hébergement retenu. Desktop Rust écarté (CDC exige le web, §4/§5.6) ; client Tauri possible plus tard pour l'administration | ✅ validé le 2026-10-08 (voir [validation-stack.md](validation-stack.md)) ; `@tanstack/react-start` 1.168.x |
| D2 | Hébergement (cloud ou serveur interne, §5.6 / §8) | **Cloudflare** (choix de Déreck) : app TanStack Start sur Workers ; fichiers (justificatifs, PV, attestations) sur R2 ; notifications e-mail/SMS via Queues ; tâches planifiées via Cron Triggers. Base : PostgreSQL managé (Supabase ou Neon, région UE) via Hyperdrive, D1 écarté. Plan Workers Paid obligatoire ; R2 en juridiction `eu` ; PDF via Browser Run | ✅ validé techniquement le 2026-10-08 ([validation-stack.md](validation-stack.md)), sous réserve de D7 |
| D3 | LMS (§3.3, objectif SGA) | **Pas de LMS développé.** V1 : ressources, annonces et forums par cours dans le portail (§3.7). Moodle (MoodleCloud ou petit serveur) branché par SSO dans un lot ultérieur si l'IUSO veut des cours interactifs ([choix-prestataires.md](choix-prestataires.md)) | ✅ décidé le 2026-10-08 |
| D4 | Paiement en ligne (cartes + mobile money, §5.2) | Agrégateur gabonais Airtel Money + Moov Money : **SingPay** en premier, PVit ou E-Billing en alternative, derrière une interface interne ; mode « paiement validé manuellement » en secours. Compte marchand à ouvrir au nom de l'IUSO | ✅ décidé ; ⬜ compte marchand IUSO à ouvrir en L0 |
| D5 | Envoi de SMS (convocations, §3.1) | API SMS internationale couvrant Airtel et Moov Gabon (SMS.to, D7 Networks ou Messaggio), derrière une interface, envoi via Queue ; SMS réservés aux messages critiques, e-mail par défaut. Test de livraison réel et nom d'expéditeur « IUSO » en début de L2 | ✅ décidé le 2026-10-08 |
| D6 | Signature numérique des PV (§3.5) | Signature électronique interne (cryptographie asymétrique, empreinte SHA-256, horodatage UTC, journal d'audit), recevable selon la loi n° 025/2021 sur les transactions électroniques (art. 6, 65, 70) ; prestataire agréé possible plus tard | ✅ décidé ; confirmation juridique avec D7 |
| D7 | Cadre légal données personnelles | Loi n° 025/2023 (modifiant la loi 001/2011), autorité **APDPVP** (ex-CNPDCP). Hébergement hors Gabon = **autorisation préalable de transfert** (art. 81, 171, 173), délai jusqu'à 2 mois, silence = rejet. Déposer la demande pendant L0 ; registre des traitements et durées de conservation | 🟨 Déreck (2026-10-08) : couvert par les autorisations du client (IUSO) ; prévoir le consentement explicite dans les formulaires. Point de vigilance : l'art. 81 vise une autorisation de l'APDPVP, à confirmer par l'IUSO |
| D8 | Règlement des études (calcul des moyennes) | Obtenir le règlement officiel : système LMD ? UE/ECUE, crédits, compensation, seuils de validation, règles de rattrapage | ⬜ |
| D9 | « Carrière des enseignants » | Mentionnée dans le sujet du projet mais **absente du CDC** : confirmer si un module RH enseignants (dossiers, grades, charges horaires) est attendu | ⬜ |
| D10 | Données existantes à migrer (§6.2) | Inventaire des fichiers actuels (Excel, registres, logiciel comptable) pendant le cadrage | ⬜ |

## 3. Phases et lots

Les semaines sont relatives (S1 = démarrage effectif). Les lots métier se chevauchent volontairement : la conception du lot suivant démarre pendant la recette du précédent.

### Phase 1 — Analyse des besoins (CDC §6.1)

| Lot | Contenu | Semaines | Livrable | Statut |
|---|---|---|---|---|
| L0 Cadrage | Ateliers avec étudiants, enseignants, administration ; cartographie des processus actuels (concours, inscriptions, notes, soutenances, diplômes) et points de friction ; inventaire de l'infrastructure et des systèmes existants (bases étudiantes, comptabilité) ; réponses aux décisions D1–D10 ; **dépôt de la demande d'autorisation de transfert auprès de l'APDPVP** | S1–S3 | Note de cadrage + processus « as-is » + décisions validées | ⬜ |

### Phase 2 — Conception de la solution (CDC §6.2)

| Lot | Contenu | Semaines | Livrable | Statut |
|---|---|---|---|---|
| L1 Conception | Architecture modulaire ; modèle de données (personnes, années académiques, filières, niveaux, UE/ECUE, groupes, salles) ; matrice des rôles et droits (FR013) ; cadre de sécurité (FR011) ; stratégie de migration ; maquettes UI/UX responsive (FR012) validées par les utilisateurs | S3–S7 | Dossier de conception, maquettes, backlog priorisé | ⬜ |

### Phase 3 — Développement des modules (CDC §6.3)

| Lot | Contenu | Exigences | Semaines | Statut |
|---|---|---|---|---|
| L2 Socle technique | Dépôt, CI/CD, environnements (dev / recette / prod) ; authentification robuste ; rôles et droits ; référentiels ; stockage de fichiers ; service de notifications (e-mail, SMS, portail) ; journal d'audit ; sauvegardes | FR011, FR012, FR013 | S6–S10 | 🟨 PR #1 fusionnée dans main (2026-10-08) ; restent déploiement Cloudflare, CI/CD, sauvegardes, prestataires réels |
| L3 Concours d'entrée | Campagnes de concours ; formulaire candidat (infos, parcours, choix de filières) ; justificatifs PDF/JPEG/PNG avec taille max ; paiement des frais ; convocations ; jurys et saisie des notes d'épreuves ; résultats sécurisés ; listes d'admis par filière ; confirmation d'inscription des admis | FR001, FR002 | S9–S15 | ⬜ |
| L4 Inscriptions et paiements | Inscription administrative (données, pièces) et académique (cours, groupes) ; réinscription annuelle ; paiement des frais (cartes, mobile money) ; bourses et exonérations ; workflow de vérification des documents ; relances pour pièces manquantes ou non conformes | FR003 | S14–S19 | ⬜ |
| L5 Scolarité | Emplois du temps (horaires, salles, enseignants) ; publication personnalisée ; alertes en cas de modification ; saisie des absences et retards ; alertes d'absences répétées ; rapports d'assiduité ; lien vers le LMS | FR004 | S18–S23 | ⬜ |
| L6 Évaluations | Saisie des notes par les enseignants (CC, examens) ; pondérations et coefficients ; règles de validation ; absences aux évaluations ; calcul des moyennes par matière et générales ; rattrapages (inscription, notes) ; relevés de notes ; délibérations | FR005, FR006 | S21–S28 | ⬜ |
| L7 Soutenances | Modèles de PV personnalisables ; jury, date, lieu, titre, décision ; signature numérique horodatée ; archivage chiffré ; droits de consultation et de modification | FR007, FR008 | S27–S30 | ⬜ |
| L8 Diplômes | Attestations PDF avec identifiant unique et QR code ; archivage ; page publique de vérification (nom, diplôme, date d'obtention) | FR009, FR010 | S29–S32 | ⬜ |
| L9 Portail et communication | Tableaux de bord étudiants et enseignants ; annonces ; bibliothèque de documents ; forums par cours ou filière ; messagerie ; notifications ; intégration d'outils collaboratifs | §3.7 | S22–S33 (en continu) | ⬜ |
| L10 Tableau de bord administration | Indicateurs admissions, inscriptions, performance académique, utilisation, communication (§10) ; rapports personnalisés et exports | §4, §10 | S30–S34 | ⬜ |

### Phase 4 — Tests (CDC §6.4)

| Lot | Contenu | Semaines | Statut |
|---|---|---|---|
| L11a Tests et recette | Tests unitaires et d'intégration en continu dans chaque lot ; tests système de bout en bout (candidat → diplômé) ; tests de sécurité (droits, isolation des données, fuites) ; tests de charge (pics d'inscription au concours) ; UAT avec l'IUSO | en continu + S33–S36 | ⬜ |

### Phase 5 — Formation (CDC §6.5)

| Lot | Contenu | Semaines | Statut |
|---|---|---|---|
| L11b Formation | Manuels par profil, tutoriels vidéo, sessions administrateurs / enseignants / étudiants, formation de formateurs | S34–S38 | ⬜ |

### Phase 6 — Déploiement et maintenance (CDC §6.6)

| Lot | Contenu | Semaines | Statut |
|---|---|---|---|
| L11c Déploiement | Migration des données ; mise en production progressive (pilote sur une filière puis généralisation) ; support renforcé au lancement ; accord de maintenance et SLA ; suivi des indicateurs §10 | S37–S40, puis maintenance | ⬜ |

## 4. Jalons

| Jalon | Critère de passage | Semaine visée | Statut |
|---|---|---|---|
| J0 Lancement | Équipe, interlocuteurs IUSO et accès confirmés | S1 | ⬜ |
| J1 Cadrage validé | Décisions D1–D10 tranchées, processus documentés | S3 | ⬜ |
| J2 Conception validée | Maquettes et modèle de données approuvés par l'IUSO | S7 | ⬜ |
| J3 Socle opérationnel | Connexion, rôles et référentiels en recette | S10 | ⬜ |
| J4 Concours en ligne | Une campagne de concours complète jouable en recette | S15 | ⬜ |
| J5 Inscriptions en ligne | Admis → étudiant inscrit et payé | S19 | ⬜ |
| J6 Année académique pilotable | EDT, absences, notes, moyennes et relevés en recette | S28 | ⬜ |
| J7 Fin de cursus numérique | PV signés et attestations vérifiables par QR code | S32 | ⬜ |
| J8 Recette globale | UAT signée par l'IUSO | S36 | ⬜ |
| J9 Mise en production | Plateforme en service, utilisateurs formés | S40 | ⬜ |

## 5. Dépendances et ordre

```
L0 Cadrage → L1 Conception → L2 Socle ─┬→ L3 Concours → L4 Inscriptions ─┬→ L5 Scolarité ─┐
                                        │                                 └→ L6 Évaluations ┴→ L7 Soutenances
                                        │                                                    └→ L8 Diplômes
                                        └→ L9 Portail (en continu) ───────────────→ L10 Tableau de bord
                                                                    → L11 Tests / Formation / Déploiement
```

Ordre justifié : le concours alimente les inscriptions, les inscriptions alimentent emplois du temps et notes, les notes alimentent soutenances et diplômes. Le calendrier réel du prochain concours de l'IUSO peut avancer L3 si besoin.

## 6. Risques principaux

| Risque | Impact | Parade |
|---|---|---|
| Règles de calcul des moyennes et rattrapages floues (D8) | Moyennes et diplômes erronés | Obtenir le règlement des études au cadrage ; tests sur des cas réels d'années passées |
| Connectivité internet limitée (§8) | Plateforme lente ou inaccessible | Pages légères, mobile d'abord, mise en cache ; hébergement proche des utilisateurs |
| Intégration paiement / SMS locale | Retard sur L3 et L4 | Choisir les fournisseurs dès L0 ; prévoir un mode « paiement validé manuellement » |
| Sécurité et confidentialité (données personnelles, notes, PV) | Fuite ou falsification | Droits côté serveur ou base, chiffrement, journal d'audit, revue de sécurité par lot |
| Données existantes hétérogènes | Migration longue | Inventaire en L0, scripts de reprise testés en recette |
| Autorisation APDPVP refusée ou tardive (D7) | Mise en production bloquée | Dépôt dès L0 ; plan B : PostgreSQL et fichiers hébergés au Gabon, joints via Hyperdrive / Workers VPC |
| Adoption par les utilisateurs | Faible usage | Pilote, formation, enquêtes de satisfaction (§10) |
| Périmètre « carrière enseignants » non spécifié (D9) | Dérive du périmètre | Trancher en L0 ; si retenu, l'ajouter comme lot séparé |

## 7. Journal d'avancement

| Date | Événement |
|---|---|
| 2026-10-08 | Cahier des charges lu et transcrit ; plan d'avancement initial établi. Aucune stack ni dépôt de code fixés pour l'instant. |
| 2026-10-08 | D1 : application web retenue (pas de desktop Rust) ; TanStack Start préféré à Next.js. |
| 2026-10-08 | D2 : hébergement chez Cloudflare. |
| 2026-10-08 | Stack validée dans les docs officielles ([validation-stack.md](validation-stack.md)) ; autorisation APDPVP de transfert identifiée comme prérequis légal. |
| 2026-10-08 | D3 à D6 tranchés (SMS, paiement, LMS, signature) : voir [choix-prestataires.md](choix-prestataires.md). Restent à l'IUSO : D8, D9, D10, compte marchand, demande APDPVP. |
| 2026-10-08 | D7 : Déreck considère l'hébergement hors Gabon couvert par les autorisations du client ; consentement explicite ajouté aux formulaires (L3, L4). |
| 2026-10-08 | L2 démarré : dépôt Danel2025/iuso-gestion-universitaire, PR #1 en brouillon (auth Better Auth, rôles, référentiels, journal d'audit inaltérable, R2, Queue). Parcours testé en local. |
| 2026-10-08 | PR #1 fusionnée dans main après type-check et build réussis ; passage à pnpm 12. Déploiement Cloudflare en attente des ressources (base UE, Hyperdrive, R2, Queue) et d'un accès Cloudflare. |
| 2026-10-09 | L2 : sauvegardes ajoutées (base chiffrée vers R2 chaque nuit, copie incrémentale des fichiers R2 par le cron du Worker, script de restauration). Non testé sur de vrais services : pg_dump et R2 absents en local ; essai de restauration à faire en recette. |
