import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
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

    const { data: existing, error: findError } = await supabase
      .from('accounts')
      .select('id')
      .eq('email', parsed.email)
      .maybeSingle()

    if (findError) {
      console.error('Register find error:', findError)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }

    if (existing) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      )
    }

    const { data: user, error: insertError } = await supabase
      .from('accounts')
      .insert({
        email: parsed.email,
        password: parsed.password,
        name: parsed.name,
      })
      .select()
      .single()

    if (insertError || !user) {
      console.error('Register insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      )
    }

    const { password: _pw, created_at, updated_at, ...rest } = user
    const safeUser = {
      ...rest,
      createdAt: created_at,
      updatedAt: updated_at,
    }

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