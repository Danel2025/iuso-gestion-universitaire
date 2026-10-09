import { HeadContent, Scripts, createRootRoute, useRouter } from '@tanstack/react-router'
import type { NavigateOptions, ToOptions } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { I18nProvider, RouterProvider } from 'react-aria-components'
import policeTexte from '@fontsource-variable/libre-franklin/files/libre-franklin-latin-wght-normal.woff2?url'
import policeChiffres from '../assets/polices/chiffres-barlow-400.woff2?url'
import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'IUSO-SNE · Plateforme de gestion académique' },
      { name: 'robots', content: 'noindex' },
    ],
    links: [
      { rel: 'preload', href: policeTexte, as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
      { rel: 'preload', href: policeChiffres, as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  shellComponent: Document,
  notFoundComponent: () => (
    <main className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Page introuvable</h1>
      <p className="mt-2 text-encre-douce">La page demandée n’existe pas.</p>
      <a className="bouton mt-6" href="/">
        Retour à l’accueil
      </a>
    </main>
  ),
})

// Les liens des composants React Aria (Link, MenuItem href…) acceptent les
// routes typées de TanStack Router et naviguent côté client.
declare module 'react-aria-components' {
  interface RouterConfig {
    href: ToOptions['to']
    routerOptions: Omit<NavigateOptions, keyof ToOptions>
  }
}

function Document({ children }: { children: ReactNode }) {
  const router = useRouter()
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {/* Locale fixée (et non celle du navigateur) : dates, nombres et libellés
            des composants en français, identiques au rendu serveur. */}
        <I18nProvider locale="fr-FR">
          <RouterProvider
            navigate={(to, options) => router.navigate({ ...options, to })}
            useHref={(to) => router.buildLocation({ to }).href}
          >
            {children}
          </RouterProvider>
        </I18nProvider>
        <Scripts />
      </body>
    </html>
  )
}
