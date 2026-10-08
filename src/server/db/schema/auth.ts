/**
 * Tables gérées par Better Auth (modèles user, session, account, verification, rateLimit).
 * Les noms de propriétés TypeScript sont ceux attendus par l'adaptateur Drizzle de
 * Better Auth ; les colonnes SQL sont en snake_case (option `casing` de Drizzle).
 * Les tables sont préfixées `auth_` pour éviter le mot réservé `user` en SQL.
 */
import { bigint, boolean, index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

const horodatages = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}

export const authUser = pgTable('auth_user', {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  image: text(),
  ...horodatages,
})

export const authSession = pgTable(
  'auth_session',
  {
    id: text().primaryKey(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    token: text().notNull().unique(),
    ipAddress: text(),
    userAgent: text(),
    userId: text()
      .notNull()
      .references(() => authUser.id, { onDelete: 'cascade' }),
    ...horodatages,
  },
  (t) => [index().on(t.userId)],
)

export const authAccount = pgTable(
  'auth_account',
  {
    id: text().primaryKey(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: text()
      .notNull()
      .references(() => authUser.id, { onDelete: 'cascade' }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    password: text(),
    ...horodatages,
  },
  (t) => [index().on(t.userId)],
)

export const authVerification = pgTable(
  'auth_verification',
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ...horodatages,
  },
  (t) => [index().on(t.identifier)],
)

/** Compteurs de limitation de débit : stockés en base car la mémoire d'un Worker n'est pas partagée. */
export const authRateLimit = pgTable('auth_rate_limit', {
  id: text().primaryKey(),
  key: text().notNull().unique(),
  count: integer().notNull(),
  lastRequest: bigint({ mode: 'number' }).notNull(),
})
