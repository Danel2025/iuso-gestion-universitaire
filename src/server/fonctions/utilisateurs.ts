/**
 * Administration des comptes et des rôles (FR013), et consultation du journal d'audit.
 */
import { createServerFn } from '@tanstack/react-start'
import { asc, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { ROLES } from '#/lib/droits'
import { journaliser } from '../audit'
import { exigerPermission } from '../auth/middleware'
import { authUser, journalAudit, roleUtilisateur } from '../db/schema'
import { siDoublon } from '../erreurs'
import { creerCompte } from '../utilisateurs/comptes'

export const listerUtilisateurs = createServerFn({ method: 'GET' })
  .middleware([exigerPermission('utilisateurs.lire')])
  .handler(async ({ context: { db } }) => {
    const lignes = await db
      .select({ id: authUser.id, nom: authUser.name, email: authUser.email, creeLe: authUser.createdAt, role: roleUtilisateur.role })
      .from(authUser)
      .leftJoin(roleUtilisateur, eq(roleUtilisateur.utilisateurId, authUser.id))
      .orderBy(asc(authUser.name))
    const parId = new Map<string, { id: string; nom: string; email: string; creeLe: Date; roles: (typeof ROLES)[number][] }>()
    for (const { role, ...u } of lignes) {
      const existant = parId.get(u.id) ?? { ...u, roles: [] }
      if (role) existant.roles.push(role)
      parId.set(u.id, existant)
    }
    return [...parId.values()]
  })

const schemaRoles = z.array(z.enum(ROLES)).max(ROLES.length)

export const creerUtilisateur = createServerFn({ method: 'POST' })
  .middleware([exigerPermission('utilisateurs.gerer')])
  .validator(
    z.object({
      nom: z.string().trim().min(2).max(200),
      email: z.email('Adresse e-mail invalide.'),
      motDePasse: z.string().min(10, 'Au moins 10 caractères.').max(128),
      roles: schemaRoles,
    }),
  )
  .handler(({ data, context: { db, utilisateur } }) =>
    siDoublon('Un compte existe déjà avec cette adresse e-mail.', () =>
      db.transaction(async (tx) => {
        const id = await creerCompte(tx, { ...data, attribuePar: utilisateur.id })
        await journaliser(tx, {
          acteurId: utilisateur.id,
          action: 'utilisateur.creation',
          entite: 'utilisateur',
          entiteId: id,
          details: { email: data.email, roles: data.roles },
        })
        return { id }
      }),
    ),
  )

export const modifierRoles = createServerFn({ method: 'POST' })
  .middleware([exigerPermission('utilisateurs.gerer')])
  .validator(z.object({ utilisateurId: z.string().min(1), roles: schemaRoles }))
  .handler(({ data, context: { db, utilisateur } }) => {
    if (data.utilisateurId === utilisateur.id && !data.roles.includes('administrateur')) {
      // Évite qu'un administrateur se retire lui-même l'accès à l'administration.
      throw new Error('Vous ne pouvez pas retirer votre propre rôle d’administrateur.')
    }
    return db.transaction(async (tx) => {
      const [cible] = await tx.select({ id: authUser.id }).from(authUser).where(eq(authUser.id, data.utilisateurId))
      if (!cible) throw new Error('Utilisateur introuvable.')
      const avant = await tx
        .select({ role: roleUtilisateur.role })
        .from(roleUtilisateur)
        .where(eq(roleUtilisateur.utilisateurId, data.utilisateurId))
      await tx.delete(roleUtilisateur).where(eq(roleUtilisateur.utilisateurId, data.utilisateurId))
      if (data.roles.length > 0) {
        await tx
          .insert(roleUtilisateur)
          .values(data.roles.map((role) => ({ utilisateurId: data.utilisateurId, role, attribuePar: utilisateur.id })))
      }
      await journaliser(tx, {
        acteurId: utilisateur.id,
        action: 'utilisateur.roles',
        entite: 'utilisateur',
        entiteId: data.utilisateurId,
        details: { avant: avant.map((r) => r.role), apres: data.roles },
      })
    })
  })

export const lireJournalAudit = createServerFn({ method: 'GET' })
  .middleware([exigerPermission('audit.lire')])
  .handler(({ context: { db } }) =>
    db
      .select({
        id: journalAudit.id,
        horodatage: journalAudit.horodatage,
        action: journalAudit.action,
        entite: journalAudit.entite,
        entiteId: journalAudit.entiteId,
        acteur: authUser.name,
        adresseIp: journalAudit.adresseIp,
      })
      .from(journalAudit)
      .leftJoin(authUser, eq(authUser.id, journalAudit.acteurId))
      .orderBy(desc(journalAudit.horodatage))
      .limit(200),
  )
