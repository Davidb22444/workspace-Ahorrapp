import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthFromCookie } from '@/lib/auth-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accountId = getAuthFromCookie(request)
    if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { id } = await params
    if (id !== accountId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: user, error } = await supabase
      .from('accounts')
      .select('id, email, name, role, avatar, created_at, updated_at')
      .eq('id', id)
      .single()

    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { created_at, updated_at, ...rest } = user
    const mappedUser = {
      ...rest,
      createdAt: created_at,
      updatedAt: updated_at,
    }

    return NextResponse.json({ user: mappedUser })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
