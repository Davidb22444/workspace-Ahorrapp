import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { toCamel } from '@/lib/supabase-helpers'
import { z } from 'zod'

const expenseCreateSchema = z.object({
  amount: z.number().positive(),
  description: z.string().min(1),
  date: z.string().optional(),
  categoryId: z.string().optional(),
  dependentId: z.string().optional(),
  isRecurring: z.boolean().default(false),
  frequency: z.string().optional(),
  accountId: z.string().min(1),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const categoryId = searchParams.get('categoryId')
    const dependentId = searchParams.get('dependentId')
    const isRecurring = searchParams.get('isRecurring')

    if (!accountId) return NextResponse.json({ error: 'accountId is required' }, { status: 400 })

    let query = supabase.from('expenses').select('*').eq('account_id', accountId)
    if (from) query = query.gte('date', from)
    if (to) query = query.lte('date', to)
    if (categoryId) query = query.eq('category_id', categoryId)
    if (dependentId) query = query.eq('dependent_id', dependentId)
    if (isRecurring !== null) query = query.eq('is_recurring', isRecurring === 'true')

    const { data, error } = await query.order('date', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const expenses = (data || []).map(toCamel)
    const total = expenses.reduce((sum: number, e: any) => sum + e.amount, 0)
    return NextResponse.json({ expenses, total: Number(total.toFixed(2)) })
  } catch (error) {
    console.error('List expenses error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
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
      account_id: parsed.accountId,
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await supabase.from('movements').insert({
      type: 'expense', amount: parsed.amount,
      description: `Gasto: ${parsed.description}`,
      date: parsed.date || new Date().toISOString(),
      category_id: parsed.categoryId || null,
      account_id: parsed.accountId,
    })

    return NextResponse.json({ expense: toCamel(data) }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    console.error('Create expense error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}