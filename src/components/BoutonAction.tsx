import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { messageErreur } from '#/lib/erreurs'

/** Bouton qui exécute une server function puis recharge les données de la page. */
export function BoutonAction({ libelle, action }: { libelle: string; action: () => Promise<unknown> }) {
  const router = useRouter()
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        className="bouton-secondaire px-2! py-1! text-xs!"
        disabled={enCours}
        onClick={async () => {
          setEnCours(true)
          setErreur(null)
          try {
            await action()
            await router.invalidate()
          } catch (e) {
            setErreur(messageErreur(e))
          } finally {
            setEnCours(false)
          }
        }}
      >
        {libelle}
      </button>
      {erreur && <span className="text-xs text-danger">{erreur}</span>}
    </span>
  )
}
