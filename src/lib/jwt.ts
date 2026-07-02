import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { revokeToken } from './session-store'

const SECRET = process.env.JWT_SECRET
const TOKEN_NAME = 'session'
const ACCESS_TOKEN_EXPIRES = '15m' as const
const REFRESH_TOKEN_EXPIRES = '7d' as const

export interface JwtPayload {
  accountId: string
  role?: string
  status?: string
  jti: string
  type?: 'access' | 'refresh'
  exp?: number
  iat?: number
}

function getSecret(): string {
  if (!SECRET) {
    throw new Error(
      'JWT_SECRET is not defined. Add it to your .env file:\n' +
      'JWT_SECRET=your-secret-key\n' +
      'You can generate one with: openssl rand -hex 32'
    )
  }
  return SECRET
}

export function signToken(payload: JwtPayload, expiresIn: number | `${number}h` | `${number}m` | `${number}d` | `${number}s`): string {
  return jwt.sign(payload, getSecret(), { expiresIn, algorithm: 'HS256' })
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getSecret(), { algorithms: ['HS256'] }) as JwtPayload
}

export function createAccessToken(accountId: string, role?: string, status?: string): string {
  return signToken(
    { accountId, role, status, jti: crypto.randomUUID(), type: 'access' },
    ACCESS_TOKEN_EXPIRES
  )
}

export function createRefreshToken(accountId: string, role?: string, status?: string): string {
  return signToken(
    { accountId, role, status, jti: crypto.randomUUID(), type: 'refresh' },
    REFRESH_TOKEN_EXPIRES
  )
}

export function createSessionToken(accountId: string, role?: string, status?: string): string {
  return createAccessToken(accountId, role, status)
}

export function refreshSessionToken(refreshToken: string): { accessToken: string; refreshToken: string } | null {
  try {
    const payload = verifyToken(refreshToken)
    if (payload.type !== 'refresh') return null
    revokeToken(payload.jti, payload.exp! * 1000)
    const accessToken = createAccessToken(payload.accountId, payload.role, payload.status)
    const newRefreshToken = createRefreshToken(payload.accountId, payload.role, payload.status)
    return { accessToken, refreshToken: newRefreshToken }
  } catch {
    return null
  }
}

export { TOKEN_NAME }
