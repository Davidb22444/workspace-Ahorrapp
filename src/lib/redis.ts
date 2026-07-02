import { Redis } from '@upstash/redis'

/**
 * Cliente Redis (Upstash) compartido para estado distribuido:
 * revocación de sesiones, rate limiting y tokens CSRF.
 *
 * En entornos serverless (Vercel) el estado en memoria no es fiable
 * porque cada instancia tiene su propio proceso. Redis provee un
 * almacén compartido y con expiración automática (TTL).
 */
export const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
})
