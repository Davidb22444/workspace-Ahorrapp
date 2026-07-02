import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { hash } from 'bcryptjs'
import { checkRateLimit, getClientIp, validatePassword } from '@/lib/security'
import { sendEmail } from '@/lib/email-service'
import { generateEmailVerificationCode, renderEmailVerificationEmail } from '@/lib/email-templates'
import { createDefaultCategories } from '@/lib/default-categories'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const limit = checkRateLimit(`register:${ip}`, 3, 15 * 60 * 1000)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Demasiados registros. Intenta de nuevo en 15 minutos.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(limit.resetIn / 1000)),
            'X-RateLimit-Remaining': '0',
          },
        }
      )
    }

    const body = await request.json()
    const parsed = registerSchema.parse(body)

    const passwordValidation = validatePassword(parsed.password)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.message },
        { status: 400 }
      )
    }

    const existing = await prisma.accounts.findUnique({ where: { email: parsed.email } })

    if (existing) {
      return NextResponse.json(
        { error: 'Este correo ya está registrado. Intenta iniciar sesión.' },
        { status: 400 }
      )
    }

    const hashedPassword = await hash(parsed.password, 12)

    const user = await prisma.accounts.create({
      data: {
        email: parsed.email,
        password: hashedPassword,
        name: parsed.name,
        status: 'pending_verification',
      },
    })

    const { password: _pw, created_at, updated_at, ...rest } = user
    const safeUser = {
      ...rest,
      createdAt: created_at,
      updatedAt: updated_at,
    }

    const verificationCode = generateEmailVerificationCode()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await prisma.email_verification.create({
      data: {
        account_id: user.id,
        token: verificationCode,
        expires_at: expiresAt,
      },
    })

    const emailHtml = renderEmailVerificationEmail(parsed.email, verificationCode)
    sendEmail(parsed.email, 'Tu código de verificación - AhorrApp', emailHtml)
      .then((r) => console.log('[register] email sent:', r))
      .catch((e) => console.error('[register] email failed (non-fatal):', e))

    await createDefaultCategories(user.id)

    const response = NextResponse.json({
      user: safeUser,
      message: 'Registro exitoso. Revisa tu correo electrónico para obtener el código de verificación.',
      email: parsed.email,
    }, { status: 201 })

    response.cookies.set('pending_verification_email', parsed.email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60,
      path: '/',
    })

    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Register error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
