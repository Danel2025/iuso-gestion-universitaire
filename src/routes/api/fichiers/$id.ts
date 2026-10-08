import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { z } from 'zod'
import { chargerUtilisateur } from '#/server/auth/middleware'
import { avecBase } from '#/server/db/client'
import { peutLireFichier, trouverFichier } from '#/server/fichiers/stockage'

/** Téléchargement d'un fichier déposé, après contrôle des droits. Jamais mis en cache partagé. */
export const Route = createFileRoute('/api/fichiers/$id')({
  server: {
    handlers: {
      GET: ({ params }) =>
        avecBase(async (db) => {
          const id = z.uuid().safeParse(params.id)
          if (!id.success) return new Response('Fichier introuvable.', { status: 404 })

          const utilisateur = await chargerUtilisateur(db)
          if (!utilisateur) return new Response('Authentification requise.', { status: 401 })

          const f = await trouverFichier(db, id.data)
          // Même réponse que « introuvable » pour ne pas révéler l'existence du fichier.
          if (!f || !peutLireFichier(utilisateur, f)) return new Response('Fichier introuvable.', { status: 404 })

          const objet = await env.FICHIERS.get(f.cleR2)
          if (!objet) return new Response('Fichier introuvable.', { status: 404 })

          return new Response(objet.body, {
            headers: {
              'content-type': f.typeMime,
              'content-length': String(f.taille),
              'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(f.nomOriginal)}`,
              'cache-control': 'private, no-store',
              'x-content-type-options': 'nosniff',
            },
          })
        }),
    },
  },
})
