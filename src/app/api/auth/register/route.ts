import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { z } from 'zod'
import { hash } from 'bcryptjs'

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

    const hashedPassword = await hash(parsed.password, 12)

    const { data: user, error: insertError } = await supabase
      .from('accounts')
      .insert({
        email: parsed.email,
        password: hashedPassword,
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

    // Seed default categories for new user
    await supabase.from('categories').insert([
      { name: 'Vivienda', icon: 'Home', color: '#10b981', type: 'expense', is_default: true, account_id: user.id },
      { name: 'Alimentación', icon: 'UtensilsCrossed', color: '#f59e0b', type: 'expense', is_default: true, account_id: user.id },
      { name: 'Transporte', icon: 'Car', color: '#f43f5e', type: 'expense', is_default: true, account_id: user.id },
      { name: 'Entretenimiento', icon: 'Gamepad2', color: '#6366f1', type: 'expense', is_default: true, account_id: user.id },
      { name: 'Servicios', icon: 'Zap', color: '#06b6d4', type: 'expense', is_default: true, account_id: user.id },
      { name: 'Salud', icon: 'Heart', color: '#ec4899', type: 'expense', is_default: true, account_id: user.id },
      { name: 'Educación', icon: 'GraduationCap', color: '#8b5cf6', type: 'expense', is_default: true, account_id: user.id },
      { name: 'Otros', icon: 'Circle', color: '#94a3b8', type: 'expense', is_default: true, account_id: user.id },
      { name: 'Salario', icon: 'Banknote', color: '#10b981', type: 'income', is_default: true, account_id: user.id },
      { name: 'Freelance', icon: 'Laptop', color: '#06b6d4', type: 'income', is_default: true, account_id: user.id },
      { name: 'Inversión', icon: 'TrendingUp', color: '#8b5cf6', type: 'income', is_default: true, account_id: user.id },
    ])

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