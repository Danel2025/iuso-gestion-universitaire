import { defineConfig } from 'vitest/config'

/**
 * Tests unitaires des modules purs (droits, validation des fichiers…),
 * sans le plugin Cloudflare de vite.config.ts.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
