import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { hash } from 'bcryptjs'
import { checkRateLimit, getClientIp, validatePassword } from '@/lib/security'
import { revokeToken } from '@/lib/session-store'

const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
})

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const limit = checkRateLimit(`reset-password:${ip}`, 3, 15 * 60 * 1000)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const parsed = resetSchema.parse(body)

    const validation = validatePassword(parsed.password)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.message }, { status: 400 })
    }

    const resetRecord = await prisma.password_reset.findUnique({
      where: { token: parsed.token },
    })

    if (!resetRecord || new Date() > resetRecord.expires_at) {
      return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 400 })
    }

    const hashedPassword = await hash(parsed.password, 12)

    await prisma.accounts.update({
      where: { id: resetRecord.account_id },
      data: { password: hashedPassword, updated_at: new Date() },
    })

    await prisma.password_reset.delete({
      where: { id: resetRecord.id },
    })

    return NextResponse.json({ message: 'Contraseña restablecida exitosamente.' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('Reset password error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
