import { createFileRoute } from '@tanstack/react-router'
import { LIBELLES_ROLES } from '#/lib/droits'

export const Route = createFileRoute('/espace/')({
  head: () => ({ meta: [{ title: 'Tableau de bord · IUSO-SNE' }] }),
  component: TableauDeBord,
})

const MODULES = [
  ['Concours d’entrée', 'Candidatures, paiement des frais, convocations, résultats.'],
  ['Inscriptions', 'Inscriptions administratives et pédagogiques, paiements, pièces justificatives.'],
  ['Scolarité', 'Emplois du temps, absences et retards.'],
  ['Évaluations', 'Notes, moyennes, rattrapages et relevés.'],
  ['Soutenances et diplômes', 'Procès-verbaux signés, attestations vérifiables par QR code.'],
] as const

function TableauDeBord() {
  const { utilisateur } = Route.useRouteContext()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bonjour {utilisateur.nom}</h1>
        <p className="mt-1 text-encre-douce">
          {utilisateur.roles.length > 0
            ? `Profil : ${utilisateur.roles.map((r) => LIBELLES_ROLES[r]).join(', ')}.`
            : 'Aucun rôle ne vous est encore attribué. Contactez l’administration de la plateforme.'}
        </p>
      </div>
      <section aria-labelledby="modules">
        <h2 id="modules" className="mb-3 text-lg font-semibold">
          Modules à venir
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map(([titre, description]) => (
            <li key={titre} className="carte">
              <p className="font-semibold">{titre}</p>
              <p className="mt-1 text-sm text-encre-douce">{description}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
