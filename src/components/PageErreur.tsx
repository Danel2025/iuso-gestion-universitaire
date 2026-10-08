import { Link, type ErrorComponentProps } from '@tanstack/react-router'
import { messageErreur } from '#/lib/erreurs'

/** Page d'erreur par défaut : affiche le message (déjà rédigé pour l'utilisateur côté serveur). */
export function PageErreur({ error, reset }: ErrorComponentProps) {
  return (
    <div role="alert" className="mx-auto max-w-xl px-4 py-12 text-center">
      <h1 className="text-xl font-bold">Impossible d’afficher cette page</h1>
      <p className="mt-2 text-encre-douce">{messageErreur(error)}</p>
      <div className="mt-6 flex justify-center gap-3">
        <button type="button" className="bouton-secondaire" onClick={reset}>
          Réessayer
        </button>
        <Link to="/espace" className="bouton">
          Retour au tableau de bord
        </Link>
      </div>
    </div>
  )
}
