import { defineConfig } from 'drizzle-kit'

/**
 * `npm run db:generate` produit les migrations SQL à partir du schéma, sans base.
 * `npm run db:migrate` les applique sur la base désignée par DATABASE_URL
 * (connexion directe à PostgreSQL, pas via Hyperdrive).
 */
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/server/db/schema/index.ts',
  out: './drizzle',
  casing: 'snake_case',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
  strict: true,
  verbose: true,
})
