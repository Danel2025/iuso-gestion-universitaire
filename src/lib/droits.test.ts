import { describe, expect, it } from 'vitest'
import { aPermission, estRole, permissionsDe } from './droits'

describe('matrice des droits', () => {
  it('un utilisateur sans rôle n’a aucune permission', () => {
    expect(permissionsDe([]).size).toBe(0)
    expect(aPermission([], 'referentiels.lire')).toBe(false)
  })

  it('seul l’administrateur gère les comptes', () => {
    expect(aPermission(['administrateur'], 'utilisateurs.gerer')).toBe(true)
    for (const role of ['direction', 'scolarite', 'finance', 'concours', 'enseignant', 'etudiant', 'candidat'] as const) {
      expect(aPermission([role], 'utilisateurs.gerer')).toBe(false)
    }
  })

  it('un étudiant ou un candidat ne lit ni les référentiels d’administration ni le journal', () => {
    expect(aPermission(['etudiant', 'candidat'], 'referentiels.lire')).toBe(false)
    expect(aPermission(['etudiant', 'candidat'], 'audit.lire')).toBe(false)
  })

  it('les permissions de plusieurs rôles se cumulent', () => {
    expect(aPermission(['enseignant'], 'referentiels.gerer')).toBe(false)
    expect(aPermission(['enseignant', 'scolarite'], 'referentiels.gerer')).toBe(true)
  })

  it('reconnaît les rôles valides', () => {
    expect(estRole('scolarite')).toBe(true)
    expect(estRole('superadmin')).toBe(false)
  })
})
