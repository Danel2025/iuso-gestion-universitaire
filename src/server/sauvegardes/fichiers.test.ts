import { describe, expect, it } from 'vitest'
import { sauvegarderFichiers, type BucketSauvegarde, type BucketSource } from './fichiers'

function fauxBucket(contenus: Record<string, string>) {
  const donnees = new Map(Object.entries(contenus))
  return {
    donnees,
    async list() {
      return { objects: [...donnees.keys()].map((key) => ({ key })), truncated: false }
    },
    async get(cle: string) {
      const texte = donnees.get(cle)
      if (texte === undefined) return null
      return { body: new Response(texte).body, httpMetadata: {}, customMetadata: {}, checksums: {} }
    },
    async put(cle: string, valeur: ReadableStream) {
      donnees.set(cle, await new Response(valeur).text())
    },
  }
}

const comme = <T>(b: unknown) => b as T

describe('sauvegarderFichiers', () => {
  it('copie uniquement les objets absents de la sauvegarde', async () => {
    const source = fauxBucket({ 'a/1': 'un', 'a/2': 'deux', 'b/3': 'trois' })
    const cible = fauxBucket({ 'a/1': 'un' })
    const bilan = await sauvegarderFichiers(comme<BucketSource>(source), comme<BucketSauvegarde>(cible))
    expect(bilan).toEqual({ copies: 2, echecs: 0, restants: 0 })
    expect([...cible.donnees.keys()].sort()).toEqual(['a/1', 'a/2', 'b/3'])
    expect(cible.donnees.get('b/3')).toBe('trois')
  })

  it('respecte la limite par passage et indique ce qui reste', async () => {
    const source = fauxBucket({ x: '1', y: '2', z: '3' })
    const cible = fauxBucket({})
    const bilan = await sauvegarderFichiers(comme<BucketSource>(source), comme<BucketSauvegarde>(cible), { limite: 2 })
    expect(bilan).toEqual({ copies: 2, echecs: 0, restants: 1 })
  })

  it("compte les échecs sans interrompre les autres copies", async () => {
    const source = fauxBucket({ ok: '1', ko: '2' })
    const cible = fauxBucket({})
    const putOriginal = cible.put.bind(cible)
    cible.put = async (cle, valeur) => {
      if (cle === 'ko') throw new Error('R2 indisponible')
      return putOriginal(cle, valeur)
    }
    const bilan = await sauvegarderFichiers(comme<BucketSource>(source), comme<BucketSauvegarde>(cible))
    expect(bilan).toEqual({ copies: 1, echecs: 1, restants: 0 })
    expect(cible.donnees.has('ok')).toBe(true)
  })

  it('ignore un objet supprimé entre le listage et la lecture', async () => {
    const source = fauxBucket({ fantome: 'x' })
    source.get = async () => null
    const cible = fauxBucket({})
    const bilan = await sauvegarderFichiers(comme<BucketSource>(source), comme<BucketSauvegarde>(cible))
    expect(bilan).toEqual({ copies: 0, echecs: 0, restants: 0 })
  })
})
