import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { Champ, Formulaire } from '#/components/Formulaire'
import { Tableau } from '#/components/Tableau'
import { aPermission, estRole, LIBELLES_ROLES, ROLES, type Role } from '#/lib/droits'
import { messageErreur } from '#/lib/erreurs'
import { creerUtilisateur, listerUtilisateurs, modifierRoles } from '#/server/fonctions/utilisateurs'

export const Route = createFileRoute('/espace/utilisateurs')({
  loader: () => listerUtilisateurs(),
  head: () => ({ meta: [{ title: 'Utilisateurs · IUSO-SNE' }] }),
  component: Utilisateurs,
})

const rolesCoches = (f: FormData): Role[] => f.getAll('roles').map(String).filter(estRole)

function Utilisateurs() {
  const utilisateurs = Route.useLoaderData()
  const { utilisateur } = Route.useRouteContext()
  const peutGerer = aPermission(utilisateur.roles, 'utilisateurs.gerer')

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Utilisateurs</h1>
      <div className={peutGerer ? 'grid gap-6 lg:grid-cols-[2fr_1fr]' : ''}>
        <section className="carte overflow-x-auto">
          <Tableau
            entetes={['Nom', 'Adresse e-mail', 'Rôles']}
            lignes={utilisateurs.map((u) => [
              u.nom,
              u.email,
              peutGerer ? (
                <EditeurRoles key="r" utilisateurId={u.id} roles={u.roles} />
              ) : (
                u.roles.map((r) => LIBELLES_ROLES[r]).join(', ')
              ),
            ])}
          />
        </section>
        {peutGerer && (
          <section className="carte">
            <h2 className="mb-4 text-lg font-semibold">Créer un compte</h2>
            <Formulaire
              action={creerUtilisateur}
              libelleBouton="Créer le compte"
              versDonnees={(f) => ({
                nom: String(f.get('nom') ?? ''),
                email: String(f.get('email') ?? ''),
                motDePasse: String(f.get('motDePasse') ?? ''),
                roles: rolesCoches(f),
              })}
            >
              <Champ nom="nom" libelle="Nom complet" />
              <Champ nom="email" libelle="Adresse e-mail" type="email" />
              <Champ nom="motDePasse" libelle="Mot de passe provisoire (10 caractères au moins)" type="password" />
              <CasesRoles />
            </Formulaire>
          </section>
        )}
      </div>
    </div>
  )
}

function CasesRoles({ coches = [] }: { coches?: Role[] }) {
  return (
    <fieldset>
      <legend className="etiquette">Rôles</legend>
      <div className="grid gap-1">
        {ROLES.map((role) => (
          <label key={role} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="roles" value={role} defaultChecked={coches.includes(role)} />
            {LIBELLES_ROLES[role]}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function EditeurRoles({ utilisateurId, roles }: { utilisateurId: string; roles: Role[] }) {
  const router = useRouter()
  const [ouvert, setOuvert] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  if (!ouvert) {
    return (
      <button type="button" className="text-left text-sm text-accent underline" onClick={() => setOuvert(true)}>
        {roles.length > 0 ? roles.map((r) => LIBELLES_ROLES[r]).join(', ') : 'Aucun rôle'} · modifier
      </button>
    )
  }
  return (
    <form
      className="space-y-2"
      onSubmit={async (e) => {
        e.preventDefault()
        setErreur(null)
        try {
          await modifierRoles({ data: { utilisateurId, roles: rolesCoches(new FormData(e.currentTarget)) } })
          setOuvert(false)
          await router.invalidate()
        } catch (err) {
          setErreur(messageErreur(err))
        }
      }}
    >
      <CasesRoles coches={roles} />
      {erreur && <p className="text-xs text-danger">{erreur}</p>}
      <div className="flex gap-2">
        <button type="submit" className="bouton px-2! py-1! text-xs!">
          Enregistrer
        </button>
        <button type="button" className="bouton-secondaire px-2! py-1! text-xs!" onClick={() => setOuvert(false)}>
          Annuler
        </button>
      </div>
    </form>
  )
}
