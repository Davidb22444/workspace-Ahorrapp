import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const accountId = request.cookies.get('accountId')?.value

    if (!accountId) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    const { data: user, error } = await supabase
      .from('accounts')
      .select('id, email, name, role, avatar, created_at, updated_at')
      .eq('id', accountId)
      .single()

    if (error || !user) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    const { created_at, updated_at, ...rest } = user
    const safeUser = {
      ...rest,
      createdAt: created_at,
      updatedAt: updated_at,
    }

    return NextResponse.json({ user: safeUser })
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json({ user: null }, { status: 500 })
  }
}
