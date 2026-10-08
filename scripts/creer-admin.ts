/**
 * Crée le premier compte administrateur, directement en base.
 *
 *   ADMIN_MOT_DE_PASSE='…' pnpm run admin:creer admin@iuso-sne.ga "Nom Prénom"
 *
 * Le mot de passe passe par une variable d'environnement pour ne pas rester
 * dans l'historique du shell avec les arguments.
 */
import { drizzle } from 'drizzle-orm/node-postgres'
import { Client } from 'pg'
import * as schema from '../src/server/db/schema'
import { creerCompte } from '../src/server/utilisateurs/comptes'

// pnpm transmet un « -- » éventuel au script : on l'ignore.
const [email, nom] = process.argv.slice(2).filter((arg) => arg !== '--')
const motDePasse = process.env.ADMIN_MOT_DE_PASSE
const url = process.env.DATABASE_URL

if (!email || !nom || !motDePasse || !url) {
  console.error('Usage : ADMIN_MOT_DE_PASSE=… DATABASE_URL=… pnpm run admin:creer <email> "<nom>"')
  process.exit(1)
}
if (motDePasse.length < 10) {
  console.error('Le mot de passe doit contenir au moins 10 caractères.')
  process.exit(1)
}

const client = new Client({ connectionString: url })
await client.connect()
try {
  const db = drizzle({ client, schema, casing: 'snake_case' })
  const id = await db.transaction(async (tx) => {
    const id = await creerCompte(tx, { nom, email, motDePasse, roles: ['administrateur'], attribuePar: null })
    await tx.insert(schema.journalAudit).values({
      acteurId: null,
      action: 'utilisateur.creation',
      entite: 'utilisateur',
      entiteId: id,
      details: { roles: ['administrateur'], origine: 'script creer-admin' },
    })
    return id
  })
  console.info(`Administrateur créé : ${email} (${id})`)
} finally {
  await client.end()
}
