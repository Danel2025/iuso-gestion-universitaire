/**
 * Sauvegarde des fichiers R2 : copie, vers un second bucket, des objets que la sauvegarde ne
 * contient pas encore. Les clés R2 sont des UUID jamais réécrits (voir deposerFichier) : un objet
 * déjà copié n'a donc pas à être comparé de nouveau. Les suppressions ne sont pas répercutées ;
 * c'est la règle de cycle de vie du bucket de sauvegarde qui fixe la durée de conservation.
 */
export type BucketSource = Pick<R2Bucket, 'list' | 'get'>
export type BucketSauvegarde = Pick<R2Bucket, 'list' | 'put'>

export interface BilanSauvegardeFichiers {
  copies: number
  echecs: number
  /** Objets encore à copier lors du prochain passage (au-delà de la limite d'un passage). */
  restants: number
}

async function listerCles(bucket: Pick<R2Bucket, 'list'>): Promise<string[]> {
  const cles: string[] = []
  let cursor: string | undefined
  do {
    const page = await bucket.list({ cursor, limit: 1000 })
    for (const objet of page.objects) cles.push(objet.key)
    cursor = page.truncated ? page.cursor : undefined
  } while (cursor)
  return cles
}

export async function sauvegarderFichiers(
  source: BucketSource,
  cible: BucketSauvegarde,
  options: { limite?: number } = {},
): Promise<BilanSauvegardeFichiers> {
  const limite = options.limite ?? 500
  const dejaSauvegardes = new Set(await listerCles(cible))
  const manquants = (await listerCles(source)).filter((cle) => !dejaSauvegardes.has(cle))

  let copies = 0
  let echecs = 0
  for (const cle of manquants.slice(0, limite)) {
    try {
      const objet = await source.get(cle)
      // Supprimé entre le listage et la lecture (dépôt annulé) : rien à sauvegarder.
      if (!objet) continue
      await cible.put(cle, objet.body, {
        httpMetadata: objet.httpMetadata,
        customMetadata: objet.customMetadata,
        // R2 refuse l'écriture si le contenu reçu ne correspond pas à l'empreinte d'origine.
        sha256: objet.checksums.sha256,
      })
      copies++
    } catch (erreur) {
      echecs++
      console.error('Sauvegarde fichier en échec', cle, erreur)
    }
  }
  return { copies, echecs, restants: Math.max(0, manquants.length - limite) }
}
