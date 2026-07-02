import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { createAccessToken, createRefreshToken, TOKEN_NAME } from '@/lib/jwt'
import { checkRateLimit, getClientIp } from '@/lib/security'

const verifySchema = z.object({
  code: z.string().length(6),
  email: z.string().email().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const limit = checkRateLimit(`verify-email:${ip}`, 5, 15 * 60 * 1000)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const parsed = verifySchema.parse(body)

    const verification = await prisma.email_verification.findUnique({
      where: { token: parsed.code },
      include: { account: true },
    })

    if (!verification) {
      return NextResponse.json(
        { error: 'Código inválido' },
        { status: 400 }
      )
    }

    if (new Date() > verification.expires_at) {
      await prisma.email_verification.delete({
        where: { id: verification.id },
      })
      return NextResponse.json(
        { error: 'El código ha expirado. Solicita uno nuevo.' },
        { status: 400 }
      )
    }

    if (verification.account.status === 'active') {
      return NextResponse.json(
        { message: 'La cuenta ya está verificada' },
        { status: 200 }
      )
    }

    if (parsed.email && verification.account.email !== parsed.email) {
      return NextResponse.json(
        { error: 'El código no corresponde a este correo' },
        { status: 400 }
      )
    }

    const updatedAccount = await prisma.accounts.update({
      where: { id: verification.account.id },
      data: {
        status: 'active',
        updated_at: new Date(),
      },
    })

    await prisma.email_verification.delete({
      where: { id: verification.id },
    })

    const accessToken = createAccessToken(updatedAccount.id, updatedAccount.role, updatedAccount.status)
    const refreshToken = createRefreshToken(updatedAccount.id, updatedAccount.role, updatedAccount.status)

    const response = NextResponse.json({
      success: true,
      user: {
        id: updatedAccount.id,
        email: updatedAccount.email,
        name: updatedAccount.name,
        role: updatedAccount.role,
      },
      message: '¡Correo electrónico verificado exitosamente! Tu cuenta ha sido activada.',
    })

    response.cookies.set(TOKEN_NAME, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60,
      path: '/',
    })
    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Código inválido. Debe ser un código de 6 dígitos.' },
        { status: 400 }
      )
    }
    console.error('Email verification error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json(
      { error: 'Token de verificación requerido' },
      { status: 400 }
    )
  }

  const verification = await prisma.email_verification.findUnique({
    where: { token },
    include: { account: true },
  })

  if (!verification) {
    return NextResponse.json(
      { error: 'Token inválido o no encontrado' },
      { status: 400 }
    )
  }

  if (new Date() > verification.expires_at) {
    await prisma.email_verification.delete({
      where: { id: verification.id },
    })
    return NextResponse.json(
      { error: 'El token ha expirado' },
      { status: 400 }
    )
  }

  if (verification.account.status === 'active') {
    return NextResponse.json(
      { message: 'La cuenta ya está verificada' },
      { status: 200 }
    )
  }

  const updatedAccount = await prisma.accounts.update({
    where: { id: verification.account.id },
    data: {
      status: 'active',
      updated_at: new Date(),
    },
  })

  await prisma.email_verification.delete({
    where: { id: verification.id },
  })

  const accessToken = createAccessToken(updatedAccount.id, updatedAccount.role, updatedAccount.status)
  const refreshToken = createRefreshToken(updatedAccount.id, updatedAccount.role, updatedAccount.status)

  const response = NextResponse.json({
    success: true,
    message: '¡Correo electrónico verificado exitosamente! Tu cuenta ha sido activada.',
  })

  response.cookies.set(TOKEN_NAME, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60,
    path: '/',
  })
  response.cookies.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  })

  return response
}
