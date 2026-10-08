/**
 * Journal d'audit : toute opération sensible (création de compte, attribution
 * de rôle, modification d'un référentiel, dépôt de fichier…) y laisse une trace.
 * À appeler dans la même transaction que l'opération journalisée.
 */
import { getRequestHeader } from '@tanstack/react-start/server'
import type { Database } from './db/client'
import { journalAudit } from './db/schema'

type EntreeAudit = {
  acteurId: string | null
  action: string
  entite: string
  entiteId?: string | null
  details?: Record<string, unknown>
}

export async function journaliser(db: Pick<Database, 'insert'>, entree: EntreeAudit): Promise<void> {
  await db.insert(journalAudit).values({
    acteurId: entree.acteurId,
    action: entree.action,
    entite: entree.entite,
    entiteId: entree.entiteId ?? null,
    details: entree.details ?? null,
    adresseIp: getRequestHeader('cf-connecting-ip') ?? null,
    userAgent: getRequestHeader('user-agent') ?? null,
  })
}
