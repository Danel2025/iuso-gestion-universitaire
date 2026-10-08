/**
 * Point d'entrée du Worker : requêtes HTTP (TanStack Start), consommateur de
 * la Queue des notifications et tâches planifiées (Cron Triggers).
 * https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/#custom-entrypoints
 */
import handler from '@tanstack/react-start/server-entry'
import { traiterLotNotifications, type MessageQueueNotification } from './server/notifications/notifications'

export default {
  // Le 2e argument de handler.fetch est une option TanStack, pas l'env Cloudflare :
  // on ne transmet que la requête (les bindings sont lus via `cloudflare:workers`).
  fetch: (requete) => handler.fetch(requete),

  async queue(lot) {
    await traiterLotNotifications(lot as MessageBatch<MessageQueueNotification>)
  },

  async scheduled(evenement) {
    // Relances quotidiennes (pièces manquantes, absences répétées) : ajoutées avec les lots L4 et L5.
    console.info('Tâche planifiée déclenchée', evenement.cron)
  },
} satisfies ExportedHandler<Env>
