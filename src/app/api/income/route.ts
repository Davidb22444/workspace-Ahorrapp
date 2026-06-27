import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { z } from 'zod'
import { getAuthFromCookie } from '@/lib/auth-utils'

const incomeCreateSchema = z.object({
  source: z.string().min(1),
  amount: z.number().positive(),
  description: z.string().optional(),
  frequency: z.string().default('monthly'),
  date: z.string().optional(),
  categoryId: z.string().optional(),
})

function toCamel(row: Record<string, any>) {
  const r: Record<string, any> = {}
  for (const [k, v] of Object.entries(row)) {
    const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    r[camel] = v
  }
  return r
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = getAuthFromCookie(request)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const categoryId = searchParams.get('categoryId')
    const frequency = searchParams.get('frequency')

    if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    let query = supabase.from('incomes').select('*').eq('account_id', accountId)

    if (from) query = query.gte('date', from)
    if (to) query = query.lte('date', to)
    if (categoryId) query = query.eq('category_id', categoryId)
    if (frequency) query = query.eq('frequency', frequency)

    const { data, error } = await query.order('date', { ascending: false })
    if (error) return NextResponse.json({ error: 'Failed to fetch incomes' }, { status: 500 })

    const incomes = (data || []).map(toCamel)
    return NextResponse.json({ incomes })
  } catch (error) {
    console.error('List income error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const accountId = getAuthFromCookie(request); if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const body = await request.json()
    const parsed = incomeCreateSchema.parse(body)

    const { data, error } = await supabase.from('incomes').insert({
      source: parsed.source,
      amount: parsed.amount,
      description: parsed.description || null,
      frequency: parsed.frequency,
      date: parsed.date || new Date().toISOString(),
      category_id: parsed.categoryId || null,
      account_id: accountId,
    }).select().single()

    if (error) return NextResponse.json({ error: 'Failed to create income' }, { status: 400 })

    const { error: movError } = await supabase.from('movements').insert({
      type: 'income',
      amount: parsed.amount,
      description: `Ingreso: ${parsed.source}`,
      date: parsed.date || new Date().toISOString(),
      category_id: parsed.categoryId || null,
      account_id: accountId,
    })

    if (movError) {
      await supabase.from('incomes').delete().eq('id', data.id)
      console.error('Create movement error:', movError)
      return NextResponse.json({ error: 'Failed to create movement' }, { status: 500 })
    }

    const income = toCamel(data)
    return NextResponse.json({ income }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('Create income error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
