import { Link, Outlet, createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { aPermission, LIBELLES_ROLES, type Permission } from '#/lib/droits'
import { clientAuth } from '#/lib/client-auth'
import { obtenirUtilisateurCourant } from '#/server/fonctions/session'

/**
 * Espace connecté. La redirection ci-dessous n'est qu'un confort de navigation :
 * chaque server function appelée par ces pages vérifie elle-même session et droits.
 */
export const Route = createFileRoute('/espace')({
  beforeLoad: async () => {
    const utilisateur = await obtenirUtilisateurCourant()
    if (!utilisateur) throw redirect({ to: '/connexion' })
    return { utilisateur }
  },
  component: Espace,
})

const MENU: {
  to: '/espace' | '/espace/referentiels' | '/espace/utilisateurs' | '/espace/journal'
  libelle: string
  permission?: Permission
}[] = [
  { to: '/espace', libelle: 'Tableau de bord' },
  { to: '/espace/referentiels', libelle: 'Référentiels', permission: 'referentiels.lire' },
  { to: '/espace/utilisateurs', libelle: 'Utilisateurs', permission: 'utilisateurs.lire' },
  { to: '/espace/journal', libelle: 'Journal d’audit', permission: 'audit.lire' },
]

function Espace() {
  const { utilisateur } = Route.useRouteContext()
  const router = useRouter()

  async function seDeconnecter() {
    await clientAuth.signOut()
    await router.invalidate()
    await router.navigate({ to: '/connexion' })
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-ligne bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to="/espace" className="font-bold text-encre no-underline">
            IUSO-SNE
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-encre-douce sm:inline">
              {utilisateur.nom}
              {utilisateur.roles.length > 0 && ` · ${utilisateur.roles.map((r) => LIBELLES_ROLES[r]).join(', ')}`}
            </span>
            <button type="button" className="bouton-secondaire" onClick={seDeconnecter}>
              Se déconnecter
            </button>
          </div>
        </div>
        <nav aria-label="Navigation principale" className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
          {MENU.filter((m) => !m.permission || aPermission(utilisateur.roles, m.permission)).map((m) => (
            <Link
              key={m.to}
              to={m.to}
              activeOptions={{ exact: true }}
              className="border-b-2 border-transparent px-3 py-2 text-sm whitespace-nowrap text-encre-douce no-underline hover:text-encre"
              activeProps={{ className: 'border-accent! text-encre!' }}
            >
              {m.libelle}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
