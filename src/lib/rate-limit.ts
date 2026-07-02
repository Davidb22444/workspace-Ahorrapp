const rateMap = new Map<string, { count: number; resetTime: number }>()

const CLEANUP_INTERVAL = 60_000

setInterval(() => {
  const now = Date.now()
  for (const [key, record] of rateMap.entries()) {
    if (now > record.resetTime) {
      rateMap.delete(key)
    }
  }
}, CLEANUP_INTERVAL)

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
