import { createServerFn } from '@tanstack/react-start'
import { chargerUtilisateur, dbMiddleware } from '../auth/middleware'

/**
 * Utilisateur connecté, ou null. Sert aux `beforeLoad` des routes pour
 * l'ergonomie (redirections, menus) ; il ne protège aucune donnée à lui seul.
 */
export const obtenirUtilisateurCourant = createServerFn({ method: 'GET' })
  .middleware([dbMiddleware])
  .handler(({ context }) => chargerUtilisateur(context.db))
