/**
 * Matrice des rôles et des permissions (FR013).
 *
 * Module pur, partagé entre client et serveur : le client s'en sert uniquement
 * pour afficher ou masquer des éléments d'interface. Le contrôle qui fait foi
 * est fait côté serveur (middleware des server functions, voir
 * src/server/auth/middleware.ts).
 */

export const ROLES = [
  'administrateur',
  'direction',
  'scolarite',
  'finance',
  'concours',
  'enseignant',
  'etudiant',
  'candidat',
] as const

export type Role = (typeof ROLES)[number]

export const LIBELLES_ROLES: Record<Role, string> = {
  administrateur: 'Administrateur de la plateforme',
  direction: 'Direction',
  scolarite: 'Service de la scolarité',
  finance: 'Service financier',
  concours: 'Gestionnaire des concours',
  enseignant: 'Enseignant',
  etudiant: 'Étudiant',
  candidat: 'Candidat',
}

export const PERMISSIONS = [
  'referentiels.lire',
  'referentiels.gerer',
  'utilisateurs.lire',
  'utilisateurs.gerer',
  'audit.lire',
  'fichiers.deposer',
] as const

export type Permission = (typeof PERMISSIONS)[number]

const MATRICE: Record<Role, readonly Permission[]> = {
  administrateur: PERMISSIONS,
  direction: ['referentiels.lire', 'utilisateurs.lire', 'audit.lire'],
  scolarite: ['referentiels.lire', 'referentiels.gerer', 'utilisateurs.lire', 'fichiers.deposer'],
  finance: ['referentiels.lire', 'fichiers.deposer'],
  concours: ['referentiels.lire', 'fichiers.deposer'],
  enseignant: ['referentiels.lire', 'fichiers.deposer'],
  etudiant: ['fichiers.deposer'],
  candidat: ['fichiers.deposer'],
}

export function estRole(valeur: string): valeur is Role {
  return (ROLES as readonly string[]).includes(valeur)
}

export function permissionsDe(roles: readonly Role[]): Set<Permission> {
  return new Set(roles.flatMap((role) => MATRICE[role]))
}

export function aPermission(roles: readonly Role[], permission: Permission): boolean {
  return roles.some((role) => MATRICE[role].includes(permission))
}
