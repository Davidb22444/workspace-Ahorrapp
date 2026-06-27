import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { z } from 'zod'
import { getAuthFromCookie } from '@/lib/auth-utils'

const budgetUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  totalAmount: z.number().positive().optional(),
  needsPercent: z.number().min(0).max(100).optional(),
  wantsPercent: z.number().min(0).max(100).optional(),
  savingsPercent: z.number().min(0).max(100).optional(),
  cycle: z.string().optional(),
  isActive: z.boolean().optional(),
})

function snakeToCamel(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    result[camelKey] = value
  }
  return result
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accountId = getAuthFromCookie(request)
    if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const { id } = await params

    const { data: budget, error: budgetError } = await supabase
      .from('budgets')
      .select('*')
      .eq('id', id)
      .eq('account_id', accountId)
      .single()

    if (budgetError || !budget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 })
    }

    const { data: periods, error: periodsError } = await supabase
      .from('budget_periods')
      .select('*')
      .eq('budget_id', id)
      .order('start_date', { ascending: false })

    if (periodsError) {
      console.error('Get budget periods error:', periodsError)
      return NextResponse.json({ error: 'Failed to fetch budget periods' }, { status: 500 })
    }

    const camelBudget = snakeToCamel(budget as unknown as Record<string, unknown>)

    return NextResponse.json({
      budget: {
        ...camelBudget,
        periods: (periods || []).map((p) =>
          snakeToCamel(p as unknown as Record<string, unknown>)
        ),
      },
    })
  } catch (error) {
    console.error('Get budget error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accountId = getAuthFromCookie(request)
    if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const { id } = await params
    const body = await request.json()
    const parsed = budgetUpdateSchema.parse(body)

    const updateData: Record<string, unknown> = {}
    if (parsed.name !== undefined) updateData.name = parsed.name
    if (parsed.totalAmount !== undefined) updateData.total_amount = parsed.totalAmount
    if (parsed.needsPercent !== undefined) updateData.needs_percent = parsed.needsPercent
    if (parsed.wantsPercent !== undefined) updateData.wants_percent = parsed.wantsPercent
    if (parsed.savingsPercent !== undefined) updateData.savings_percent = parsed.savingsPercent
    if (parsed.cycle !== undefined) updateData.cycle = parsed.cycle
    if (parsed.isActive !== undefined) updateData.is_active = parsed.isActive

    const { data: budget, error } = await supabase
      .from('budgets')
      .update(updateData)
      .eq('id', id)
      .eq('account_id', accountId)
      .select()
      .single()

    if (error) {
      console.error('Update budget error:', error)
      return NextResponse.json({ error: 'Failed to update budget' }, { status: 500 })
    }

    // Fetch periods for response
    const { data: periods } = await supabase
      .from('budget_periods')
      .select('*')
      .eq('budget_id', id)
      .order('start_date', { ascending: false })

    const camelBudget = snakeToCamel(budget as unknown as Record<string, unknown>)

    return NextResponse.json({
      budget: {
        ...camelBudget,
        periods: (periods || []).map((p) =>
          snakeToCamel(p as unknown as Record<string, unknown>)
        ),
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('Update budget error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accountId = getAuthFromCookie(request)
    if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const { id } = await params

    // Delete periods first
    await supabase.from('budget_periods').delete().eq('budget_id', id)

    const { error } = await supabase.from('budgets').delete().eq('id', id).eq('account_id', accountId)

    if (error) {
      console.error('Delete budget error:', error)
      return NextResponse.json({ error: 'Failed to delete budget' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete budget error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
