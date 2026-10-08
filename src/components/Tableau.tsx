import type { ReactNode } from 'react'

export function Tableau({ entetes, lignes }: { entetes: string[]; lignes: ReactNode[][] }) {
  if (lignes.length === 0) return <p className="text-sm text-encre-douce">Aucun élément pour l’instant.</p>
  return (
    <table className="tableau">
      <thead>
        <tr>
          {entetes.map((e) => (
            <th key={e} scope="col">
              {e}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {lignes.map((cellules, i) => (
          <tr key={i}>
            {cellules.map((c, j) => (
              <td key={j}>{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
