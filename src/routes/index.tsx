import { Link, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Accueil })

function Accueil() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-16">
      <p className="text-sm font-semibold tracking-wide text-accent uppercase">IUSO-SNE</p>
      <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Plateforme de gestion académique et administrative</h1>
      <p className="mt-4 text-encre-douce">
        Institut Universitaire des Sciences de l’Organisation Sophie Ntoutoume Emane : concours d’entrée, inscriptions,
        scolarité, évaluations et diplômes.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/connexion" className="bouton">
          Se connecter
        </Link>
      </div>
    </main>
  )
}
