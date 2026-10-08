import { createFileRoute } from '@tanstack/react-router'
import { creerAuth } from '#/server/auth/auth'
import { avecBase } from '#/server/db/client'

function traiter({ request }: { request: Request }) {
  return avecBase((db) => creerAuth(db).handler(request))
}

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: { GET: traiter, POST: traiter },
  },
})
