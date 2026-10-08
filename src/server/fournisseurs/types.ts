/**
 * Interfaces des fournisseurs externes. Les modules métier ne dépendent que de
 * ces interfaces, pour pouvoir changer de prestataire sans les toucher
 * (voir plan/choix-prestataires.md : SMS D5, paiement D4).
 */

export type MessageEmail = { a: string; sujet: string; texte: string }

export interface FournisseurEmail {
  envoyer(message: MessageEmail): Promise<void>
}

export type MessageSms = {
  /** Numéro au format E.164, par exemple +24177000000. */
  a: string
  texte: string
}

export interface FournisseurSms {
  envoyer(message: MessageSms): Promise<void>
}

export type DemandePaiement = {
  /** Identifiant interne de la facture, sert de clé d'idempotence. */
  reference: string
  montantFcfa: number
  telephone: string
  description: string
}

export type StatutPaiement = 'en_attente' | 'confirme' | 'echoue'

/** Implémentée au lot L4 (SingPay en premier, PVit ou E-Billing en alternative). */
export interface FournisseurPaiement {
  initier(demande: DemandePaiement): Promise<{ transactionId: string }>
  /** Le statut fait foi uniquement après interrogation côté serveur. */
  verifier(transactionId: string): Promise<StatutPaiement>
}
