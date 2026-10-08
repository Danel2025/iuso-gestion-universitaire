import { createFileRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { BoutonAction } from '#/components/BoutonAction'
import { Champ, Formulaire, nombreOptionnel, texteOptionnel } from '#/components/Formulaire'
import { Tableau } from '#/components/Tableau'
import { aPermission } from '#/lib/droits'
import {
  basculerFiliere,
  creerAnneeAcademique,
  creerFiliere,
  creerNiveau,
  creerSalle,
  definirAnneeCourante,
  listerReferentiels,
} from '#/server/fonctions/referentiels'

export const Route = createFileRoute('/espace/referentiels')({
  loader: () => listerReferentiels(),
  head: () => ({ meta: [{ title: 'Référentiels · IUSO-SNE' }] }),
  component: Referentiels,
})

const texte = (f: FormData, nom: string) => String(f.get(nom) ?? '')

function Referentiels() {
  const { annees, filieres, niveaux, salles } = Route.useLoaderData()
  const { utilisateur } = Route.useRouteContext()
  const peutGerer = aPermission(utilisateur.roles, 'referentiels.gerer')

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Référentiels</h1>

      <Section
        titre="Années académiques"
        formulaire={
          peutGerer && (
            <Formulaire
              action={creerAnneeAcademique}
              libelleBouton="Ajouter l’année"
              versDonnees={(f) => ({
                libelle: texte(f, 'libelle'),
                dateDebut: texte(f, 'dateDebut'),
                dateFin: texte(f, 'dateFin'),
              })}
            >
              <Champ nom="libelle" libelle="Libellé" placeholder="2026-2027" />
              <Champ nom="dateDebut" libelle="Date de début" type="date" />
              <Champ nom="dateFin" libelle="Date de fin" type="date" />
            </Formulaire>
          )
        }
      >
        <Tableau
          entetes={['Libellé', 'Début', 'Fin', 'Statut']}
          lignes={annees.map((a) => [
            a.libelle,
            dateFr(a.dateDebut),
            dateFr(a.dateFin),
            a.estCourante ? (
              <strong key="c">Année courante</strong>
            ) : peutGerer ? (
              <BoutonAction
                key="c"
                libelle="Définir comme courante"
                action={() => definirAnneeCourante({ data: { id: a.id } })}
              />
            ) : (
              ''
            ),
          ])}
        />
      </Section>

      <Section
        titre="Filières"
        formulaire={
          peutGerer && (
            <Formulaire
              action={creerFiliere}
              libelleBouton="Ajouter la filière"
              versDonnees={(f) => ({
                code: texte(f, 'code'),
                libelle: texte(f, 'libelle'),
                description: texteOptionnel(f, 'description'),
              })}
            >
              <Champ nom="code" libelle="Code" placeholder="GRH" />
              <Champ nom="libelle" libelle="Libellé" placeholder="Gestion des ressources humaines" />
              <Champ nom="description" libelle="Description" requis={false} />
            </Formulaire>
          )
        }
      >
        <Tableau
          entetes={['Code', 'Libellé', 'Statut']}
          lignes={filieres.map((f) => [
            f.code,
            f.libelle,
            peutGerer ? (
              <BoutonAction
                key="s"
                libelle={f.active ? 'Active · désactiver' : 'Inactive · réactiver'}
                action={() => basculerFiliere({ data: { id: f.id, active: !f.active } })}
              />
            ) : f.active ? (
              'Active'
            ) : (
              'Inactive'
            ),
          ])}
        />
      </Section>

      <Section
        titre="Niveaux"
        formulaire={
          peutGerer && (
            <Formulaire
              action={creerNiveau}
              libelleBouton="Ajouter le niveau"
              versDonnees={(f) => ({
                code: texte(f, 'code'),
                libelle: texte(f, 'libelle'),
                ordre: Number(texte(f, 'ordre')),
              })}
            >
              <Champ nom="code" libelle="Code" placeholder="L1" />
              <Champ nom="libelle" libelle="Libellé" placeholder="Licence 1" />
              <Champ nom="ordre" libelle="Ordre" type="number" min={1} max={20} />
            </Formulaire>
          )
        }
      >
        <Tableau
          entetes={['Ordre', 'Code', 'Libellé']}
          lignes={niveaux.map((n) => [String(n.ordre), n.code, n.libelle])}
        />
      </Section>

      <Section
        titre="Salles"
        formulaire={
          peutGerer && (
            <Formulaire
              action={creerSalle}
              libelleBouton="Ajouter la salle"
              versDonnees={(f) => ({
                code: texte(f, 'code'),
                libelle: texte(f, 'libelle'),
                batiment: texteOptionnel(f, 'batiment'),
                capacite: nombreOptionnel(f, 'capacite'),
              })}
            >
              <Champ nom="code" libelle="Code" placeholder="A101" />
              <Champ nom="libelle" libelle="Libellé" placeholder="Amphithéâtre A" />
              <Champ nom="batiment" libelle="Bâtiment" requis={false} />
              <Champ nom="capacite" libelle="Capacité" type="number" min={1} requis={false} />
            </Formulaire>
          )
        }
      >
        <Tableau
          entetes={['Code', 'Libellé', 'Bâtiment', 'Capacité']}
          lignes={salles.map((s) => [
            s.code,
            s.libelle,
            s.batiment ?? '',
            s.capacite == null ? '' : String(s.capacite),
          ])}
        />
      </Section>
    </div>
  )
}

function dateFr(iso: string) {
  const [annee, mois, jour] = iso.split('-')
  return `${jour}/${mois}/${annee}`
}

function Section({ titre, formulaire, children }: { titre: string; formulaire: ReactNode; children: ReactNode }) {
  return (
    <section className="carte">
      <h2 className="mb-4 text-lg font-semibold">{titre}</h2>
      <div className={formulaire ? 'grid gap-6 lg:grid-cols-[2fr_1fr]' : ''}>
        <div className="overflow-x-auto">{children}</div>
        {formulaire && <div>{formulaire}</div>}
      </div>
    </section>
  )
}
