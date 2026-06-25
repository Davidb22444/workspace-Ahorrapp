import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = registerSchema.parse(body)

    const existing = await db.account.findUnique({
      where: { email: parsed.email },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      )
    }

    const hashedPassword = await bcrypt.hash(parsed.password, 12)

    const user = await db.account.create({
      data: {
        email: parsed.email,
        password: hashedPassword,
        name: parsed.name,
      },
    })

    const { password: _pw, ...safeUser } = user

    const response = NextResponse.json({ user: safeUser }, { status: 201 })
    response.cookies.set('accountId', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
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