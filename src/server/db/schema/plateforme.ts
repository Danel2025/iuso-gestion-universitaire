/**
 * Tables transverses du socle : rôles, référentiels, journal d'audit,
 * fichiers déposés et notifications.
 */
import { sql } from 'drizzle-orm'
import {
  bigint,
  bigserial,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { ROLES } from '../../../lib/droits'
import { authUser } from './auth'

const creeLe = timestamp({ withTimezone: true }).notNull().defaultNow()
const modifieLe = timestamp({ withTimezone: true })
  .notNull()
  .defaultNow()
  .$onUpdate(() => new Date())

// ── Rôles ────────────────────────────────────────────────────────────────

export const roleEnum = pgEnum('role', ROLES)

export const roleUtilisateur = pgTable(
  'role_utilisateur',
  {
    utilisateurId: text()
      .notNull()
      .references(() => authUser.id, { onDelete: 'cascade' }),
    role: roleEnum().notNull(),
    attribuePar: text().references(() => authUser.id, { onDelete: 'set null' }),
    attribueLe: creeLe,
  },
  (t) => [primaryKey({ columns: [t.utilisateurId, t.role] })],
)

// ── Référentiels ─────────────────────────────────────────────────────────

export const anneeAcademique = pgTable(
  'annee_academique',
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Exemple : « 2026-2027 ». */
    libelle: text().notNull().unique(),
    dateDebut: date().notNull(),
    dateFin: date().notNull(),
    estCourante: boolean().notNull().default(false),
    creeLe,
    modifieLe,
  },
  // Une seule année académique courante à la fois.
  (t) => [
    uniqueIndex('annee_academique_courante_unique')
      .on(t.estCourante)
      .where(sql`${t.estCourante}`),
  ],
)

export const filiere = pgTable('filiere', {
  id: uuid().primaryKey().defaultRandom(),
  code: text().notNull().unique(),
  libelle: text().notNull(),
  description: text(),
  active: boolean().notNull().default(true),
  creeLe,
  modifieLe,
})

export const niveau = pgTable('niveau', {
  id: uuid().primaryKey().defaultRandom(),
  /** Exemple : « L1 », « M2 ». */
  code: text().notNull().unique(),
  libelle: text().notNull(),
  /** Ordre d'affichage et de progression (L1 = 1, L2 = 2…). */
  ordre: smallint().notNull(),
  creeLe,
  modifieLe,
})

export const salle = pgTable('salle', {
  id: uuid().primaryKey().defaultRandom(),
  code: text().notNull().unique(),
  libelle: text().notNull(),
  batiment: text(),
  capacite: integer(),
  active: boolean().notNull().default(true),
  creeLe,
  modifieLe,
})

// ── Journal d'audit ──────────────────────────────────────────────────────

/**
 * Journal append-only : la migration installe un trigger qui refuse
 * UPDATE et DELETE sur cette table.
 */
export const journalAudit = pgTable(
  'journal_audit',
  {
    id: bigserial({ mode: 'number' }).primaryKey(),
    horodatage: timestamp({ withTimezone: true }).notNull().defaultNow(),
    /** Sans clé étrangère : la trace doit survivre à la suppression d'un compte. */
    acteurId: text(),
    action: text().notNull(),
    entite: text().notNull(),
    entiteId: text(),
    details: jsonb().$type<Record<string, unknown>>(),
    adresseIp: text(),
    userAgent: text(),
  },
  (t) => [index().on(t.entite, t.entiteId), index().on(t.acteurId), index().on(t.horodatage)],
)

// ── Fichiers (objets R2) ─────────────────────────────────────────────────

export const fichier = pgTable(
  'fichier',
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Clé de l'objet dans le bucket R2, jamais exposée publiquement. */
    cleR2: text().notNull().unique(),
    nomOriginal: text().notNull(),
    typeMime: text().notNull(),
    taille: bigint({ mode: 'number' }).notNull(),
    empreinteSha256: text().notNull(),
    /** Usage métier : justificatif, pv, attestation… */
    categorie: text().notNull(),
    proprietaireId: text().references(() => authUser.id, { onDelete: 'set null' }),
    deposePar: text().references(() => authUser.id, { onDelete: 'set null' }),
    creeLe,
  },
  (t) => [index().on(t.proprietaireId)],
)

// ── Notifications ────────────────────────────────────────────────────────

export const canalNotificationEnum = pgEnum('canal_notification', ['email', 'sms', 'portail'])
export const statutNotificationEnum = pgEnum('statut_notification', ['en_attente', 'envoyee', 'echec'])

/**
 * Chaque notification est d'abord écrite ici, puis envoyée par le consommateur
 * de la Queue NOTIFICATIONS. La table sert aussi de boîte de réception du portail.
 */
export const notification = pgTable(
  'notification',
  {
    id: uuid().primaryKey().defaultRandom(),
    destinataireId: text().references(() => authUser.id, { onDelete: 'cascade' }),
    canal: canalNotificationEnum().notNull(),
    /** Adresse e-mail ou numéro E.164, figé au moment de l'envoi. */
    adresse: text(),
    sujet: text().notNull(),
    contenu: text().notNull(),
    statut: statutNotificationEnum().notNull().default('en_attente'),
    tentatives: smallint().notNull().default(0),
    derniereErreur: text(),
    creeLe,
    envoyeeLe: timestamp({ withTimezone: true }),
    lueLe: timestamp({ withTimezone: true }),
  },
  (t) => [index().on(t.destinataireId, t.creeLe), index().on(t.statut)],
)
