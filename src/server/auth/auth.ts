/**
 * Configuration Better Auth (e-mail + mot de passe, sessions en base).
 * https://www.better-auth.com/docs/integrations/tanstack
 *
 * L'instance est construite pour une connexion donnée, car la connexion
 * PostgreSQL est propre à chaque requête (voir src/server/db/client.ts).
 */
import { env } from 'cloudflare:workers'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import type { Database } from '../db/client'
import { authAccount, authRateLimit, authSession, authUser, authVerification } from '../db/schema'

export function creerAuth(db: Database) {
  return betterAuth({
    appName: 'IUSO-SNE',
    baseURL: env.APP_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        user: authUser,
        session: authSession,
        account: authAccount,
        verification: authVerification,
        rateLimit: authRateLimit,
      },
    }),
    emailAndPassword: {
      enabled: true,
      // Les comptes du personnel sont créés par un administrateur ;
      // l'inscription des candidats sera ouverte avec le module concours (L3).
      disableSignUp: true,
      minPasswordLength: 10,
    },
    session: {
      expiresIn: 60 * 60 * 8, // une journée de travail
      updateAge: 60 * 60, // prolongée au plus une fois par heure
    },
    rateLimit: {
      enabled: true,
      storage: 'database',
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/email': { window: 60, max: 5 },
      },
    },
    advanced: {
      ipAddress: { ipAddressHeaders: ['cf-connecting-ip'] },
      useSecureCookies: env.APP_ENV !== 'development',
    },
    plugins: [tanstackStartCookies()], // doit rester le dernier plugin
  })
}

export type Auth = ReturnType<typeof creerAuth>
