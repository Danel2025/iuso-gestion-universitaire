import { createFileRoute } from '@tanstack/react-router'
import { Tableau } from '#/components/Tableau'
import { lireJournalAudit } from '#/server/fonctions/utilisateurs'

export const Route = createFileRoute('/espace/journal')({
  loader: () => lireJournalAudit(),
  head: () => ({ meta: [{ title: 'Journal d’audit · IUSO-SNE' }] }),
  component: Journal,
})

const formatDate = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'medium',
  timeZone: 'Africa/Libreville',
})

function Journal() {
  const entrees = Route.useLoaderData()
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Journal d’audit</h1>
      <p className="text-sm text-encre-douce">
        Les 200 dernières opérations, heure de Libreville. Le journal ne peut être ni modifié ni effacé.
      </p>
      <section className="carte overflow-x-auto">
        <Tableau
          entetes={['Date', 'Acteur', 'Action', 'Objet', 'Adresse IP']}
          lignes={entrees.map((e) => [
            formatDate.format(new Date(e.horodatage)),
            e.acteur ?? 'Système',
            e.action,
            e.entiteId ? `${e.entite} ${e.entiteId}` : e.entite,
            e.adresseIp ?? '',
          ])}
        />
      </section>
    </div>
  )
}
