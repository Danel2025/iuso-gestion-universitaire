import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { clientAuth } from '#/lib/client-auth'
import { obtenirUtilisateurCourant } from '#/server/fonctions/session'

export const Route = createFileRoute('/connexion')({
  beforeLoad: async () => {
    if (await obtenirUtilisateurCourant()) throw redirect({ to: '/espace' })
  },
  head: () => ({ meta: [{ title: 'Connexion · IUSO-SNE' }] }),
  component: Connexion,
})

function Connexion() {
  const router = useRouter()
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  async function soumettre(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault()
    const formulaire = new FormData(evenement.currentTarget)
    setErreur(null)
    setEnCours(true)
    const { error } = await clientAuth.signIn.email({
      email: String(formulaire.get('email')),
      password: String(formulaire.get('motDePasse')),
    })
    setEnCours(false)
    if (error) {
      setErreur(
        error.status === 429
          ? 'Trop de tentatives. Réessayez dans une minute.'
          : 'Adresse e-mail ou mot de passe incorrect.',
      )
      return
    }
    await router.invalidate()
    await router.navigate({ to: '/espace' })
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-16">
      <p className="text-sm font-semibold tracking-wide text-accent uppercase">IUSO-SNE</p>
      <h1 className="mt-1 mb-6 text-2xl font-bold">Connexion</h1>
      {/* method="post" : si le formulaire part avant le chargement du JavaScript, les identifiants ne finissent pas dans l’URL. */}
      <form method="post" onSubmit={soumettre} className="carte space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="etiquette">
            Adresse e-mail
          </label>
          <input id="email" name="email" type="email" autoComplete="username" required className="champ" />
        </div>
        <div>
          <label htmlFor="motDePasse" className="etiquette">
            Mot de passe
          </label>
          <input
            id="motDePasse"
            name="motDePasse"
            type="password"
            autoComplete="current-password"
            required
            className="champ"
          />
        </div>
        {erreur && (
          <p role="alert" className="alerte-erreur">
            {erreur}
          </p>
        )}
        <button type="submit" className="bouton w-full" disabled={enCours}>
          {enCours ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </main>
  )
}
