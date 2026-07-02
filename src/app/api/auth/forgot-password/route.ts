import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'
import { checkRateLimit, getClientIp } from '@/lib/security'
import { sendEmail } from '@/lib/email-service'

const forgotSchema = z.object({
  email: z.string().email(),
})

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const limit = checkRateLimit(`forgot-password:${ip}`, 3, 15 * 60 * 1000)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const parsed = forgotSchema.parse(body)

    const user = await prisma.accounts.findUnique({
      where: { email: parsed.email },
    })

    if (!user) {
      return NextResponse.json({ message: 'Si el correo existe, recibirás un enlace para restablecer tu contraseña.' })
    }

    const resetToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    await prisma.password_reset.upsert({
      where: { account_id: user.id },
      update: { token: resetToken, expires_at: expiresAt },
      create: { account_id: user.id, token: resetToken, expires_at: expiresAt },
    })

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>Restablece tu contraseña - AhorrApp</title></head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #10b981; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1>Restablece tu contraseña</h1>
          </div>
          <div style="background: white; padding: 30px; border: 1px solid #e5e7eb;">
            <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en AhorrApp.</p>
            <p><a href="${resetUrl}" style="display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Restablecer contraseña</a></p>
            <p>Este enlace expirará en 1 hora.</p>
            <p>Si no solicitaste restablecer tu contraseña, ignora este correo.</p>
          </div>
        </div>
      </body>
      </html>
    `
    await sendEmail(parsed.email, 'Restablece tu contraseña - AhorrApp', emailHtml)

    return NextResponse.json({ message: 'Si el correo existe, recibirás un enlace para restablecer tu contraseña.' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
