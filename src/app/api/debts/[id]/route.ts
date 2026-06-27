import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { z } from 'zod'
import { getAuthFromCookie } from '@/lib/auth-utils'

const debtUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  totalAmount: z.number().positive().optional(),
  interestRate: z.number().min(0).nullable().optional(),
  dueDate: z.string().nullable().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
  installments: z.number().int().positive().nullable().optional(),
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

    const { data: debt, error: debtError } = await supabase
      .from('debts')
      .select('*')
      .eq('id', id)
      .eq('account_id', accountId)
      .single()

    if (debtError || !debt) {
      return NextResponse.json({ error: 'Debt not found' }, { status: 404 })
    }

    const { data: payments, error: payError } = await supabase
      .from('debt_payments')
      .select('*')
      .eq('debt_id', id)
      .order('date', { ascending: false })

    if (payError) {
      console.error('Get debt payments error:', payError)
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
    }

    const camelDebt = snakeToCamel(debt as unknown as Record<string, unknown>) as {
      totalAmount: number
      paidAmount: number
    } & Record<string, unknown>
    const totalAmount = Number(camelDebt.totalAmount)
    const paidAmount = Number(camelDebt.paidAmount)

    return NextResponse.json({
      debt: {
        ...camelDebt,
        remaining: Number(Math.max(0, totalAmount - paidAmount).toFixed(2)),
        progress: totalAmount > 0
          ? Number(((paidAmount / totalAmount) * 100).toFixed(1))
          : 0,
        payments: (payments || []).map((p) =>
          snakeToCamel(p as unknown as Record<string, unknown>)
        ),
      },
    })
  } catch (error) {
    console.error('Get debt error:', error)
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
    const parsed = debtUpdateSchema.parse(body)

    const updateData: Record<string, unknown> = {}
    if (parsed.name !== undefined) updateData.name = parsed.name
    if (parsed.totalAmount !== undefined) updateData.total_amount = parsed.totalAmount
    if (parsed.interestRate !== undefined) updateData.interest_rate = parsed.interestRate
    if (parsed.dueDate !== undefined) updateData.due_date = parsed.dueDate
    if (parsed.status !== undefined) updateData.status = parsed.status
    if (parsed.type !== undefined) updateData.type = parsed.type
    if (parsed.installments !== undefined) updateData.installments = parsed.installments

    const { data: debt, error } = await supabase
      .from('debts')
      .update(updateData)
      .eq('id', id)
      .eq('account_id', accountId)
      .select()
      .single()

    if (error) {
      console.error('Update debt error:', error)
      return NextResponse.json({ error: 'Failed to update debt' }, { status: 500 })
    }

    const camelDebt = snakeToCamel(debt as unknown as Record<string, unknown>)

    return NextResponse.json({ debt: camelDebt })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('Update debt error:', error)
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

    // Delete payments first
    await supabase.from('debt_payments').delete().eq('debt_id', id)

    const { error } = await supabase.from('debts').delete().eq('id', id).eq('account_id', accountId)

    if (error) {
      console.error('Delete debt error:', error)
      return NextResponse.json({ error: 'Failed to delete debt' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete debt error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
