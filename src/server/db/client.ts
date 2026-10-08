/**
 * Accès PostgreSQL via Hyperdrive.
 *
 * Un Worker ne peut pas réutiliser une connexion TCP d'une requête à l'autre :
 * on ouvre donc un client `pg` par requête (Hyperdrive garde le vrai pool côté
 * Cloudflare, l'ouverture est rapide) et on le ferme une fois le travail fini.
 * https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-drivers-and-libraries/drizzle-orm/
 */
import { env, waitUntil } from 'cloudflare:workers'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Client } from 'pg'
import * as schema from './schema'

export type Database = NodePgDatabase<typeof schema>

/** Exécute `travail` avec une connexion dédiée, fermée ensuite sans retarder la réponse. */
export async function avecBase<T>(travail: (db: Database) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: env.HYPERDRIVE.connectionString })
  await client.connect()
  try {
    return await travail(drizzle({ client, schema, casing: 'snake_case' }))
  } finally {
    waitUntil(client.end())
  }
}
