/**
 * Stockage des fichiers dans R2 (bucket en juridiction `eu`, jamais public).
 * Les fichiers sont servis par la route /api/fichiers/$id après contrôle des droits.
 */
import { env } from 'cloudflare:workers'
import { eq } from 'drizzle-orm'
import { aPermission } from '#/lib/droits'
import { validerFichier } from '#/lib/fichiers'
import { journaliser } from '../audit'
import type { UtilisateurCourant } from '../auth/middleware'
import type { Database } from '../db/client'
import { fichier } from '../db/schema'

export class FichierRefuse extends Error {}

async function sha256Hex(contenu: ArrayBuffer): Promise<string> {
  const empreinte = await crypto.subtle.digest('SHA-256', contenu)
  return [...new Uint8Array(empreinte)].map((o) => o.toString(16).padStart(2, '0')).join('')
}

export async function deposerFichier(
  db: Database,
  params: { fichier: File; categorie: string; proprietaireId: string | null; deposePar: string },
) {
  const contenu = await params.fichier.arrayBuffer()
  const validation = validerFichier(contenu.byteLength, new Uint8Array(contenu, 0, Math.min(16, contenu.byteLength)))
  if (!validation.ok) throw new FichierRefuse(validation.erreur)

  const cleR2 = `${params.categorie}/${crypto.randomUUID()}`
  const empreinteSha256 = await sha256Hex(contenu)
  await env.FICHIERS.put(cleR2, contenu, {
    httpMetadata: { contentType: validation.type },
    sha256: empreinteSha256,
  })

  try {
    return await db.transaction(async (tx) => {
      const [cree] = await tx
        .insert(fichier)
        .values({
          cleR2,
          nomOriginal: params.fichier.name.slice(0, 255),
          typeMime: validation.type,
          taille: contenu.byteLength,
          empreinteSha256,
          categorie: params.categorie,
          proprietaireId: params.proprietaireId,
          deposePar: params.deposePar,
        })
        .returning()
      await journaliser(tx, {
        acteurId: params.deposePar,
        action: 'fichier.depot',
        entite: 'fichier',
        entiteId: cree.id,
        details: { categorie: params.categorie, taille: cree.taille },
      })
      return cree
    })
  } catch (erreur) {
    // L'enregistrement en base a échoué : l'objet R2 ne doit pas rester orphelin.
    await env.FICHIERS.delete(cleR2)
    throw erreur
  }
}

/** Le propriétaire et le personnel habilité aux utilisateurs peuvent lire un fichier. */
export function peutLireFichier(
  utilisateur: UtilisateurCourant,
  f: { proprietaireId: string | null; deposePar: string | null },
) {
  return (
    f.proprietaireId === utilisateur.id ||
    f.deposePar === utilisateur.id ||
    aPermission(utilisateur.roles, 'utilisateurs.lire')
  )
}

export async function trouverFichier(db: Database, id: string) {
  const [f] = await db.select().from(fichier).where(eq(fichier.id, id))
  return f ?? null
}
