import { env } from 'cloudflare:workers'
import { emailJournal, smsJournal } from './journal'
import type { FournisseurEmail, FournisseurSms } from './types'

/**
 * Point unique de sélection des prestataires. En production, l'absence de
 * prestataire configuré est une erreur, pas un envoi silencieusement simulé.
 */
export function fournisseurEmail(): FournisseurEmail {
  if (env.APP_ENV === 'production') throw new Error("Aucun prestataire e-mail n'est configuré.")
  return emailJournal
}

export function fournisseurSms(): FournisseurSms {
  if (env.APP_ENV === 'production') throw new Error("Aucun prestataire SMS n'est configuré.")
  return smsJournal
}
