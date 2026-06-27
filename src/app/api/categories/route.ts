import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { rowsToCamel, keysToCamel } from '@/lib/supabase-utils'
import { z } from 'zod'
import { getAuthFromCookie } from '@/lib/auth-utils'

const categoryCreateSchema = z.object({
  name: z.string().min(1),
  icon: z.string().default('Circle'),
  color: z.string().default('#6366f1'),
  type: z.string().default('expense'),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = getAuthFromCookie(request)
    const type = searchParams.get('type')

    if (!accountId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    let query = supabase
      .from('categories')
      .select('*')
      .eq('account_id', accountId)

    if (type) {
      query = query.eq('type', type)
    }

    const { data, error } = await query

    if (error) {
      console.error('List categories error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    const categories = rowsToCamel(data || [])

    // Sort: isDefault desc, name asc (client-side sort since Supabase doesn't easily do multi-sort on booleans)
    categories.sort((a: any, b: any) => {
      if ((b.isDefault || false) !== (a.isDefault || false)) {
        return (b.isDefault || false) ? 1 : -1
      }
      return ((a.name || '').localeCompare(b.name || ''))
    })

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('List categories error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const accountId = getAuthFromCookie(request); if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const body = await request.json()
    const parsed = categoryCreateSchema.parse(body)

    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: parsed.name,
        icon: parsed.icon,
        color: parsed.color,
        type: parsed.type,
        is_default: false,
        account_id: accountId,
      })
      .select()
      .single()

    if (error) {
      console.error('Create category error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    const category = keysToCamel(data)

    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('Create category error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
