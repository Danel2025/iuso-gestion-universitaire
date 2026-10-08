/**
 * Création des comptes par l'administration (le personnel ne s'inscrit pas
 * lui-même). Utilisé par la server function d'administration et par le script
 * de création du premier administrateur ; ce module ne dépend donc pas du
 * runtime Cloudflare.
 */
import { hashPassword } from 'better-auth/crypto'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { Role } from '../../lib/droits'
import * as schema from '../db/schema'

type Executeur = Pick<NodePgDatabase<typeof schema>, 'insert'>

export type NouveauCompte = {
  nom: string
  email: string
  motDePasse: string
  roles: Role[]
  attribuePar: string | null
}

export async function creerCompte(tx: Executeur, compte: NouveauCompte): Promise<string> {
  const id = crypto.randomUUID()
  await tx.insert(schema.authUser).values({
    id,
    name: compte.nom,
    email: compte.email.trim().toLowerCase(),
    emailVerified: false,
  })
  await tx.insert(schema.authAccount).values({
    id: crypto.randomUUID(),
    accountId: id,
    providerId: 'credential',
    userId: id,
    password: await hashPassword(compte.motDePasse),
  })
  if (compte.roles.length > 0) {
    await tx
      .insert(schema.roleUtilisateur)
      .values(compte.roles.map((role) => ({ utilisateurId: id, role, attribuePar: compte.attribuePar })))
  }
  return id
}
