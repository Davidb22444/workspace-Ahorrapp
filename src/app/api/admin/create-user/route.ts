import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { hash } from 'bcryptjs'
import prisma from '@/lib/prisma'
import { requireRole } from '@/lib/auth-utils'
import { validatePassword } from '@/lib/security'
import { sendEmail } from '@/lib/email-service'
import { generateEmailVerificationCode, renderEmailVerificationEmail } from '@/lib/email-templates'
import { createDefaultCategories } from '@/lib/default-categories'

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(['user', 'admin']).optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Only admins can create users through this endpoint
    const auth = requireRole(request, ['admin'])
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const parsed = createUserSchema.parse(body)

    const passwordValidation = validatePassword(parsed.password)
    if (!passwordValidation.valid) {
      return NextResponse.json({ error: passwordValidation.message }, { status: 400 })
    }

    const existing = await prisma.accounts.findUnique({ where: { email: parsed.email } })
    if (existing) {
      return NextResponse.json(
        { error: 'El correo electrónico ya está en uso' },
        { status: 409 }
      )
    }

    const hashedPassword = await hash(parsed.password, 12)

    const user = await prisma.accounts.create({
      data: {
        email: parsed.email,
        password: hashedPassword,
        name: parsed.name,
        role: parsed.role || 'user',
        status: 'pending_verification',
      },
    })

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
    sendEmail(parsed.email, 'Verifica tu correo electrónico - AhorrApp', emailHtml)
      .then((r) => console.log('[admin/create-user] email sent:', r))
      .catch((e) => console.error('[admin/create-user] email failed (non-fatal):', e))

    await createDefaultCategories(user.id)

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        message: 'Usuario creado exitosamente. Se envió un código de verificación al correo.',
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Admin user creation error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
