/** Message affichable d'une erreur renvoyée par une server function. */
export function messageErreur(erreur: unknown): string {
  return erreur instanceof Error && erreur.message ? erreur.message : 'Une erreur inattendue est survenue.'
}
