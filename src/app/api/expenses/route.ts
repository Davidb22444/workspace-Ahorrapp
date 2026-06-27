import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { keysToCamel } from '@/lib/supabase-utils'
import { z } from 'zod'
import { getAuthFromCookie } from '@/lib/auth-utils'

const expenseCreateSchema = z.object({
  amount: z.number().positive(),
  description: z.string().min(1),
  date: z.string().optional(),
  categoryId: z.string().optional(),
  dependentId: z.string().optional(),
  isRecurring: z.boolean().default(false),
  frequency: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = getAuthFromCookie(request)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const categoryId = searchParams.get('categoryId')
    const dependentId = searchParams.get('dependentId')
    const isRecurring = searchParams.get('isRecurring')

    if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    let query = supabase.from('expenses').select('*').eq('account_id', accountId)
    if (from) query = query.gte('date', from)
    if (to) query = query.lte('date', to)
    if (categoryId) query = query.eq('category_id', categoryId)
    if (dependentId) query = query.eq('dependent_id', dependentId)
    if (isRecurring !== null) query = query.eq('is_recurring', isRecurring === 'true')

    const { data, error } = await query.order('date', { ascending: false })
    if (error) return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 })

    const expenses = (data || []).map(keysToCamel)
    const total = expenses.reduce((sum: number, e: any) => sum + e.amount, 0)
    return NextResponse.json({ expenses, total: Number(total.toFixed(2)) })
  } catch (error) {
    console.error('List expenses error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const accountId = getAuthFromCookie(request); if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const body = await request.json()
    const parsed = expenseCreateSchema.parse(body)

    const { data, error } = await supabase.from('expenses').insert({
      amount: parsed.amount,
      description: parsed.description,
      date: parsed.date || new Date().toISOString(),
      category_id: parsed.categoryId || null,
      dependent_id: parsed.dependentId || null,
      is_recurring: parsed.isRecurring,
      frequency: parsed.frequency || null,
      account_id: accountId,
    }).select().single()

    if (error) return NextResponse.json({ error: 'Failed to create expense' }, { status: 400 })

    const { error: movError } = await supabase.from('movements').insert({
      type: 'expense', amount: parsed.amount,
      description: `Gasto: ${parsed.description}`,
      date: parsed.date || new Date().toISOString(),
      category_id: parsed.categoryId || null,
      account_id: accountId,
    })

    if (movError) {
      await supabase.from('expenses').delete().eq('id', data.id)
      console.error('Create movement error:', movError)
      return NextResponse.json({ error: 'Failed to create movement' }, { status: 500 })
    }

    return NextResponse.json({ expense: keysToCamel(data) }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('Create expense error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
