import { describe, expect, it } from 'vitest'
import { detecterType, TAILLE_MAX_OCTETS, validerFichier } from './fichiers'

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37])
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0])
const EXE = new Uint8Array([0x4d, 0x5a, 0x90, 0x00])

describe('validation des fichiers déposés', () => {
  it('détecte le type réel à partir des premiers octets', () => {
    expect(detecterType(PDF)).toBe('application/pdf')
    expect(detecterType(PNG)).toBe('image/png')
    expect(detecterType(JPEG)).toBe('image/jpeg')
    expect(detecterType(EXE)).toBeNull()
    expect(detecterType(new Uint8Array([0x25, 0x50]))).toBeNull()
  })

  it('accepte un PDF dans la limite de taille', () => {
    expect(validerFichier(1024, PDF)).toEqual({ ok: true, type: 'application/pdf' })
  })

  it('refuse un fichier vide, trop lourd ou d’un autre format', () => {
    expect(validerFichier(0, PDF).ok).toBe(false)
    expect(validerFichier(TAILLE_MAX_OCTETS + 1, PDF).ok).toBe(false)
    expect(validerFichier(1024, EXE).ok).toBe(false)
  })
})
