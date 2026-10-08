import { useRouter } from '@tanstack/react-router'
import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { messageErreur } from '#/lib/erreurs'

/**
 * Formulaire qui appelle une server function puis recharge les données de la page.
 * `versDonnees` convertit le FormData en objet ; la validation qui fait foi est
 * celle de la server function.
 */
export function Formulaire<T>({
  action,
  versDonnees,
  libelleBouton,
  children,
}: {
  action: (options: { data: T }) => Promise<unknown>
  versDonnees: (formulaire: FormData) => T
  libelleBouton: string
  children: ReactNode
}) {
  const router = useRouter()
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  async function soumettre(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault()
    const element = evenement.currentTarget
    setErreur(null)
    setEnCours(true)
    try {
      await action({ data: versDonnees(new FormData(element)) })
      element.reset()
      await router.invalidate()
    } catch (e) {
      setErreur(messageErreur(e))
    } finally {
      setEnCours(false)
    }
  }

  return (
    <form method="post" onSubmit={soumettre} className="space-y-3">
      {children}
      {erreur && (
        <p role="alert" className="alerte-erreur">
          {erreur}
        </p>
      )}
      <button type="submit" className="bouton" disabled={enCours}>
        {enCours ? 'Enregistrement…' : libelleBouton}
      </button>
    </form>
  )
}

export function Champ({
  nom,
  libelle,
  type = 'text',
  requis = true,
  ...attributs
}: {
  nom: string
  libelle: string
  type?: string
  requis?: boolean
  placeholder?: string
  min?: number
  max?: number
}) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="etiquette">
        {libelle}
      </label>
      <input id={id} name={nom} type={type} required={requis} className="champ" {...attributs} />
    </div>
  )
}

/** Valeur texte d'un champ, ou undefined s'il est vide. */
export function texteOptionnel(formulaire: FormData, nom: string): string | undefined {
  const valeur = String(formulaire.get(nom) ?? '').trim()
  return valeur === '' ? undefined : valeur
}

export function nombreOptionnel(formulaire: FormData, nom: string): number | undefined {
  const valeur = texteOptionnel(formulaire, nom)
  return valeur === undefined ? undefined : Number(valeur)
}
