/**
 * Middlewares des server functions.
 *
 * Une server function est un point d'entrée HTTP appelable directement : le
 * contrôle d'accès se fait ici, jamais seulement dans `beforeLoad` ou dans
 * l'interface. https://tanstack.com/start/latest/docs/framework/react/guide/middleware
 */
import { createMiddleware, createServerOnlyFn } from '@tanstack/react-start'
import { getRequestHeaders, setResponseStatus } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { aPermission, type Permission, type Role } from '#/lib/droits'
import { avecBase, type Database } from '../db/client'
import { roleUtilisateur } from '../db/schema'
import { creerAuth } from './auth'

export type UtilisateurCourant = {
  id: string
  nom: string
  email: string
  roles: Role[]
}

/** Ouvre une connexion PostgreSQL pour la durée de la server function. */
export const dbMiddleware = createMiddleware({ type: 'function' }).server(({ next }) =>
  avecBase((db) => next({ context: { db } })),
)

/**
 * Utilisateur de la session courante, ou null. Fonction serveur uniquement :
 * le compilateur de TanStack Start la retire du bundle client avec ses imports.
 */
export const chargerUtilisateur = createServerOnlyFn(async (db: Database): Promise<UtilisateurCourant | null> => {
  const session = await creerAuth(db).api.getSession({ headers: getRequestHeaders() })
  if (!session) return null
  const roles = await db
    .select({ role: roleUtilisateur.role })
    .from(roleUtilisateur)
    .where(eq(roleUtilisateur.utilisateurId, session.user.id))
  return {
    id: session.user.id,
    nom: session.user.name,
    email: session.user.email,
    roles: roles.map((r) => r.role),
  }
})

/** Exige une session valide ; expose `utilisateur` et `db` dans le contexte. */
export const authMiddleware = createMiddleware({ type: 'function' })
  .middleware([dbMiddleware])
  .server(async ({ next, context }) => {
    const utilisateur = await chargerUtilisateur(context.db)
    if (!utilisateur) {
      setResponseStatus(401)
      throw new Error('Authentification requise.')
    }
    return next({ context: { utilisateur } })
  })

/** Exige une session valide et la permission indiquée. */
export function exigerPermission(permission: Permission) {
  return createMiddleware({ type: 'function' })
    .middleware([authMiddleware])
    .server(({ next, context }) => {
      if (!aPermission(context.utilisateur.roles, permission)) {
        setResponseStatus(403)
        throw new Error('Accès refusé.')
      }
      return next()
    })
}
