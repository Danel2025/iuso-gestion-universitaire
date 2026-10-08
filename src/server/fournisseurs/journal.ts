/**
 * Fournisseurs de développement : écrivent le message dans les logs du Worker
 * au lieu de l'envoyer. Utilisés tant qu'aucun prestataire n'est configuré.
 */
import type { FournisseurEmail, FournisseurSms } from './types'

export const emailJournal: FournisseurEmail = {
  async envoyer(message) {
    console.info('[email simulé]', { a: message.a, sujet: message.sujet })
  },
}

export const smsJournal: FournisseurSms = {
  async envoyer(message) {
    console.info('[sms simulé]', { a: message.a, longueur: message.texte.length })
  },
}
