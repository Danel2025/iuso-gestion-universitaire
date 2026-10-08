/**
 * Traduction des erreurs PostgreSQL attendues en messages destinés à l'utilisateur.
 * Les autres erreurs remontent telles quelles (journalisées par le Worker) ;
 * on n'expose jamais le message SQL brut pour un cas métier prévisible.
 */
import { DrizzleQueryError } from 'drizzle-orm/errors'

const VIOLATION_UNICITE = '23505'

export function estViolationUnicite(erreur: unknown): boolean {
  const cause = erreur instanceof DrizzleQueryError ? erreur.cause : erreur
  return typeof cause === 'object' && cause !== null && 'code' in cause && cause.code === VIOLATION_UNICITE
}

/** Exécute `operation` et remplace une violation d'unicité par `message`. */
export async function siDoublon<T>(message: string, operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (erreur) {
    if (estViolationUnicite(erreur)) throw new Error(message)
    throw erreur
  }
}
