/**
 * Référentiels du socle : années académiques, filières, niveaux, salles.
 * Lecture : `referentiels.lire` ; écriture : `referentiels.gerer`, journalisée.
 */
import { createServerFn } from '@tanstack/react-start'
import { asc, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { journaliser } from '../audit'
import { siDoublon } from '../erreurs'
import { exigerPermission } from '../auth/middleware'
import { anneeAcademique, filiere, niveau, salle } from '../db/schema'

const texte = (max: number) => z.string().trim().min(1, 'Champ obligatoire.').max(max)
const code = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9-]{1,20}$/, 'Lettres, chiffres et tirets uniquement (20 caractères au plus).')

export const listerReferentiels = createServerFn({ method: 'GET' })
  .middleware([exigerPermission('referentiels.lire')])
  .handler(async ({ context: { db } }) => {
    const [annees, filieres, niveaux, salles] = await Promise.all([
      db.select().from(anneeAcademique).orderBy(desc(anneeAcademique.dateDebut)),
      db.select().from(filiere).orderBy(asc(filiere.code)),
      db.select().from(niveau).orderBy(asc(niveau.ordre)),
      db.select().from(salle).orderBy(asc(salle.code)),
    ])
    return { annees, filieres, niveaux, salles }
  })

const schemaAnnee = z
  .object({
    libelle: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{4}$/, 'Format attendu : 2026-2027.'),
    dateDebut: z.iso.date(),
    dateFin: z.iso.date(),
  })
  .refine((a) => a.dateDebut < a.dateFin, {
    message: 'La date de fin doit suivre la date de début.',
    path: ['dateFin'],
  })

export const creerAnneeAcademique = createServerFn({ method: 'POST' })
  .middleware([exigerPermission('referentiels.gerer')])
  .validator(schemaAnnee)
  .handler(({ data, context: { db, utilisateur } }) =>
    siDoublon('Cette année académique existe déjà.', () =>
      db.transaction(async (tx) => {
        const [cree] = await tx.insert(anneeAcademique).values(data).returning()
        await journaliser(tx, {
          acteurId: utilisateur.id,
          action: 'annee.creation',
          entite: 'annee_academique',
          entiteId: cree.id,
          details: data,
        })
        return cree
      }),
    ),
  )

export const definirAnneeCourante = createServerFn({ method: 'POST' })
  .middleware([exigerPermission('referentiels.gerer')])
  .validator(z.object({ id: z.uuid() }))
  .handler(({ data, context: { db, utilisateur } }) =>
    db.transaction(async (tx) => {
      // Deux écritures dans la même transaction : l'index unique partiel garantit
      // qu'il n'existe jamais deux années courantes.
      await tx.update(anneeAcademique).set({ estCourante: false }).where(eq(anneeAcademique.estCourante, true))
      const [maj] = await tx
        .update(anneeAcademique)
        .set({ estCourante: true })
        .where(eq(anneeAcademique.id, data.id))
        .returning()
      if (!maj) throw new Error('Année académique introuvable.')
      await journaliser(tx, {
        acteurId: utilisateur.id,
        action: 'annee.courante',
        entite: 'annee_academique',
        entiteId: maj.id,
      })
    }),
  )

export const creerFiliere = createServerFn({ method: 'POST' })
  .middleware([exigerPermission('referentiels.gerer')])
  .validator(z.object({ code, libelle: texte(200), description: z.string().trim().max(2000).optional() }))
  .handler(({ data, context: { db, utilisateur } }) =>
    siDoublon('Une filière porte déjà ce code.', () =>
      db.transaction(async (tx) => {
        const [cree] = await tx.insert(filiere).values(data).returning()
        await journaliser(tx, {
          acteurId: utilisateur.id,
          action: 'filiere.creation',
          entite: 'filiere',
          entiteId: cree.id,
          details: data,
        })
        return cree
      }),
    ),
  )

export const basculerFiliere = createServerFn({ method: 'POST' })
  .middleware([exigerPermission('referentiels.gerer')])
  .validator(z.object({ id: z.uuid(), active: z.boolean() }))
  .handler(({ data, context: { db, utilisateur } }) =>
    db.transaction(async (tx) => {
      const [maj] = await tx.update(filiere).set({ active: data.active }).where(eq(filiere.id, data.id)).returning()
      if (!maj) throw new Error('Filière introuvable.')
      await journaliser(tx, {
        acteurId: utilisateur.id,
        action: data.active ? 'filiere.activation' : 'filiere.desactivation',
        entite: 'filiere',
        entiteId: maj.id,
      })
    }),
  )

export const creerNiveau = createServerFn({ method: 'POST' })
  .middleware([exigerPermission('referentiels.gerer')])
  .validator(z.object({ code, libelle: texte(100), ordre: z.number().int().min(1).max(20) }))
  .handler(({ data, context: { db, utilisateur } }) =>
    siDoublon('Un niveau porte déjà ce code.', () =>
      db.transaction(async (tx) => {
        const [cree] = await tx.insert(niveau).values(data).returning()
        await journaliser(tx, {
          acteurId: utilisateur.id,
          action: 'niveau.creation',
          entite: 'niveau',
          entiteId: cree.id,
          details: data,
        })
        return cree
      }),
    ),
  )

export const creerSalle = createServerFn({ method: 'POST' })
  .middleware([exigerPermission('referentiels.gerer')])
  .validator(
    z.object({
      code,
      libelle: texte(100),
      batiment: z.string().trim().max(100).optional(),
      capacite: z.number().int().min(1).max(5000).optional(),
    }),
  )
  .handler(({ data, context: { db, utilisateur } }) =>
    siDoublon('Une salle porte déjà ce code.', () =>
      db.transaction(async (tx) => {
        const [cree] = await tx.insert(salle).values(data).returning()
        await journaliser(tx, {
          acteurId: utilisateur.id,
          action: 'salle.creation',
          entite: 'salle',
          entiteId: cree.id,
          details: data,
        })
        return cree
      }),
    ),
  )
