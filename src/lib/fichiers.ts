/**
 * Règles de dépôt des fichiers (CDC §5.1 : justificatifs PDF, JPEG ou PNG,
 * taille maximale à fixer avec l'IUSO). Module pur, partagé client/serveur ;
 * le serveur revérifie toujours, y compris la signature binaire du fichier.
 */

export const TYPES_ACCEPTES = ['application/pdf', 'image/jpeg', 'image/png'] as const
export type TypeAccepte = (typeof TYPES_ACCEPTES)[number]

/** Valeur provisoire, en attendant la limite fixée par l'IUSO. */
export const TAILLE_MAX_OCTETS = 5 * 1024 * 1024

export type ResultatValidation = { ok: true; type: TypeAccepte } | { ok: false; erreur: string }

const SIGNATURES: Record<TypeAccepte, number[]> = {
  'application/pdf': [0x25, 0x50, 0x44, 0x46, 0x2d], // %PDF-
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
}

/** Détermine le type réel à partir des premiers octets, sans se fier à l'extension. */
export function detecterType(entete: Uint8Array): TypeAccepte | null {
  for (const type of TYPES_ACCEPTES) {
    const signature = SIGNATURES[type]
    if (entete.length >= signature.length && signature.every((octet, i) => entete[i] === octet)) {
      return type
    }
  }
  return null
}

export function validerFichier(taille: number, entete: Uint8Array): ResultatValidation {
  if (taille === 0) return { ok: false, erreur: 'Le fichier est vide.' }
  if (taille > TAILLE_MAX_OCTETS) {
    return { ok: false, erreur: `Le fichier dépasse la taille maximale de ${TAILLE_MAX_OCTETS / (1024 * 1024)} Mo.` }
  }
  const type = detecterType(entete)
  if (!type) return { ok: false, erreur: 'Format non accepté : seuls les fichiers PDF, JPEG et PNG sont admis.' }
  return { ok: true, type }
}
