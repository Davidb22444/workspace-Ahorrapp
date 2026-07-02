import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import crypto from 'crypto'

const rateMap = new Map<string, { count: number; resetTime: number }>()
const RATE_CLEANUP_INTERVAL = 60_000

setInterval(() => {
  const now = Date.now()
  for (const [key, record] of rateMap.entries()) {
    if (now > record.resetTime) {
      rateMap.delete(key)
    }
  }
}, RATE_CLEANUP_INTERVAL)

export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const record = rateMap.get(key)
  if (!record || now > record.resetTime) {
    rateMap.set(key, { count: 1, resetTime: now + windowMs })
    return { allowed: true, remaining: maxAttempts - 1, resetIn: windowMs }
  }
  const remaining = Math.max(0, maxAttempts - record.count - 1)
  if (record.count >= maxAttempts) {
    return { allowed: false, remaining: 0, resetIn: record.resetTime - now }
  }
  record.count++
  return { allowed: true, remaining, resetIn: record.resetTime - now }
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

export function withApiRateLimit(
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>,
  maxRequests: number = 60,
  windowMs: number = 60_000
) {
  return async (request: NextRequest, ...args: any[]) => {
    const ip = getClientIp(request)
    const path = new URL(request.url).pathname
    const limit = checkRateLimit(`api:${ip}:${path}`, maxRequests, windowMs)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(limit.resetIn / 1000)),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(limit.resetIn / 1000)),
          },
        }
      )
    }
    return handler(request, ...args)
  }
}

const csrfTokens = new Map<string, { token: string; expiresAt: number }>()
const CSRF_EXPIRY = 60 * 60 * 1000
const CSRF_CLEANUP = 5 * 60 * 1000

setInterval(() => {
  const now = Date.now()
  for (const [key, record] of csrfTokens.entries()) {
    if (now > record.expiresAt) {
      csrfTokens.delete(key)
    }
  }
}, CSRF_CLEANUP)

export function generateCsrfToken(accountId: string): string {
  const token = crypto.randomBytes(32).toString('hex')
  csrfTokens.set(`${accountId}:${token}`, {
    token,
    expiresAt: Date.now() + CSRF_EXPIRY,
  })
  return token
}

export function validateCsrfToken(accountId: string, token: string): boolean {
  const record = csrfTokens.get(`${accountId}:${token}`)
  if (!record) return false
  if (Date.now() > record.expiresAt) {
    csrfTokens.delete(`${accountId}:${token}`)
    return false
  }
  csrfTokens.delete(`${accountId}:${token}`)
  return true
}

export function csrfProtection(handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>) {
  return async (request: NextRequest, ...args: any[]) => {
    if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') {
      return handler(request, ...args)
    }
    const csrfToken = request.headers.get('x-csrf-token')
    if (!csrfToken) {
      return NextResponse.json({ error: 'CSRF token requerido' }, { status: 403 })
    }
    const accountId = request.headers.get('x-account-id')
    if (!accountId || !validateCsrfToken(accountId, csrfToken)) {
      return NextResponse.json({ error: 'CSRF token inválido' }, { status: 403 })
    }
    return handler(request, ...args)
  }
}

export async function createAuditLog(params: {
  action: string
  entity: string
  entityId?: string
  details?: string
  accountId: string
}) {
  try {
    await prisma.audit_logs.create({
      data: {
        action: params.action,
        entity: params.entity,
        entity_id: params.entityId || null,
        details: params.details || null,
        account_id: params.accountId,
      },
    })
  } catch (error) {
    console.error('Failed to create audit log:', error)
  }
}

export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'La contraseña debe tener al menos 8 caracteres' }
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'La contraseña debe contener al menos una letra mayúscula' }
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'La contraseña debe contener al menos una letra minúscula' }
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'La contraseña debe contener al menos un número' }
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, message: 'La contraseña debe contener al menos un carácter especial' }
  }
  return { valid: true }
}
