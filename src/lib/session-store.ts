import { randomUUID } from 'crypto'
import { redis } from './redis'

/**
 * Lista de revocación de tokens respaldada por Redis.
 *
 * Cuando se revoca un token (logout, refresh, reset de contraseña) se guarda
 * su `jti` en Redis con un TTL igual al tiempo restante de vida del token,
 * de modo que Redis lo elimina automáticamente al expirar. Esto sustituye al
 * `Map` en memoria, que no funcionaba de forma fiable en serverless.
 */

const REVOKED_PREFIX = 'revoked:'

export function generateJti(): string {
  return randomUUID()
}

export async function revokeToken(jti: string, expiresAt: number): Promise<void> {
  if (!jti) return
  const ttlSeconds = Math.ceil((expiresAt - Date.now()) / 1000)
  // Si ya expiró no hace falta guardarlo.
  if (ttlSeconds <= 0) return
  await redis.set(`${REVOKED_PREFIX}${jti}`, 1, { ex: ttlSeconds })
}

export async function isTokenRevoked(jti: string): Promise<boolean> {
  if (!jti) return false
  const exists = await redis.exists(`${REVOKED_PREFIX}${jti}`)
  return exists === 1
}
