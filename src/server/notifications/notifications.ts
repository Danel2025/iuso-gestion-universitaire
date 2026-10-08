/**
 * Notifications (e-mail, SMS, portail).
 *
 * `notifier` enregistre la notification en base puis, pour l'e-mail et le SMS,
 * dépose son identifiant dans la Queue NOTIFICATIONS : l'envoi réel se fait
 * hors de la requête utilisateur, avec nouvelles tentatives automatiques.
 */
import { env } from 'cloudflare:workers'
import { and, eq, sql } from 'drizzle-orm'
import { avecBase, type Database } from '../db/client'
import { notification } from '../db/schema'
import { fournisseurEmail, fournisseurSms } from '../fournisseurs'

export type MessageQueueNotification = { notificationId: string }

/** Au-delà, la notification passe en échec (visible par l'administration). Inférieur à max_retries de wrangler.jsonc. */
const MAX_TENTATIVES = 5

type NouvelleNotification = {
  destinataireId: string | null
  canal: 'email' | 'sms' | 'portail'
  adresse?: string
  sujet: string
  contenu: string
}

export async function notifier(db: Database, n: NouvelleNotification): Promise<string> {
  if (n.canal !== 'portail' && !n.adresse) throw new Error(`Adresse manquante pour une notification ${n.canal}.`)
  const [creee] = await db
    .insert(notification)
    .values({
      destinataireId: n.destinataireId,
      canal: n.canal,
      adresse: n.adresse ?? null,
      sujet: n.sujet,
      contenu: n.contenu,
      // Une notification portail est disponible dès son écriture.
      statut: n.canal === 'portail' ? 'envoyee' : 'en_attente',
      envoyeeLe: n.canal === 'portail' ? new Date() : null,
    })
    .returning({ id: notification.id })
  if (n.canal !== 'portail') {
    await env.NOTIFICATIONS.send({ notificationId: creee.id } satisfies MessageQueueNotification)
  }
  return creee.id
}

async function envoyer(db: Database, id: string): Promise<void> {
  const [n] = await db
    .select()
    .from(notification)
    .where(and(eq(notification.id, id), eq(notification.statut, 'en_attente')))
  // Déjà envoyée (message rejoué par la Queue) ou supprimée : rien à faire.
  if (!n || !n.adresse) return

  try {
    if (n.canal === 'email') {
      await fournisseurEmail().envoyer({ a: n.adresse, sujet: n.sujet, texte: n.contenu })
    } else if (n.canal === 'sms') {
      await fournisseurSms().envoyer({ a: n.adresse, texte: n.contenu })
    }
    await db
      .update(notification)
      .set({ statut: 'envoyee', envoyeeLe: new Date(), tentatives: sql`${notification.tentatives} + 1` })
      .where(eq(notification.id, id))
  } catch (erreur) {
    await db
      .update(notification)
      .set({ tentatives: sql`${notification.tentatives} + 1`, derniereErreur: String(erreur).slice(0, 500) })
      .where(eq(notification.id, id))
    throw erreur
  }
}

/** Consommateur de la Queue : chaque message est acquitté ou rejoué individuellement. */
export async function traiterLotNotifications(lot: MessageBatch<MessageQueueNotification>): Promise<void> {
  await avecBase(async (db) => {
    for (const message of lot.messages) {
      try {
        await envoyer(db, message.body.notificationId)
        message.ack()
      } catch (erreur) {
        console.error('Échec d’envoi de notification', message.body.notificationId, erreur)
        if (message.attempts >= MAX_TENTATIVES) {
          await db.update(notification).set({ statut: 'echec' }).where(eq(notification.id, message.body.notificationId))
          message.ack()
        } else {
          message.retry({ delaySeconds: 60 * message.attempts })
        }
      }
    }
  })
}
