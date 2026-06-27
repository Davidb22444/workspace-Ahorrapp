import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthFromCookie } from '@/lib/auth-utils'
import { z } from 'zod'

const contributeSchema = z.object({
  amount: z.number().positive(),
  note: z.string().optional(),
  date: z.string().optional(),
})

function snakeToCamel(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    result[camelKey] = value
  }
  return result
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accountId = getAuthFromCookie(request)
    if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const parsed = contributeSchema.parse(body)

    // Fetch current goal
    const { data: goal, error: goalError } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('id', id)
      .single()

    if (goalError || !goal) {
      return NextResponse.json({ error: 'Savings goal not found' }, { status: 404 })
    }

    if (goal.account_id !== accountId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Insert contribution
    const { data: contribution, error: contribError } = await supabase
      .from('savings_contributions')
      .insert({
        amount: parsed.amount,
        date: parsed.date || new Date().toISOString().split('T')[0],
        note: parsed.note || null,
        goal_id: id,
        account_id: goal.account_id,
      })
      .select()
      .single()

    if (contribError) {
      console.error('Create contribution error:', contribError)
      return NextResponse.json({ error: 'Failed to create contribution' }, { status: 500 })
    }

    // Update goal's saved amount with optimistic lock
    const originalSavedAmount = Number(goal.saved_amount)
    const newSavedAmount = originalSavedAmount + parsed.amount
    let newStatus = goal.status
    if (newSavedAmount >= Number(goal.target_amount)) {
      newStatus = 'completed'
    } else if (newStatus === 'completed' && newSavedAmount < Number(goal.target_amount)) {
      newStatus = 'active'
    }

    const { data: updatedGoal, error: updateError } = await supabase
      .from('savings_goals')
      .update({
        saved_amount: newSavedAmount,
        status: newStatus,
      })
      .eq('id', id)
      .eq('saved_amount', originalSavedAmount)
      .select()
      .single()

    if (updateError || !updatedGoal) {
      await supabase.from('savings_contributions').delete().eq('id', contribution.id)
      if (updateError) console.error('Update savings goal error:', updateError)
      return NextResponse.json({ error: 'Conflict, please retry' }, { status: 409 })
    }

    const camelGoal = snakeToCamel(updatedGoal as unknown as Record<string, unknown>) as {
      targetAmount: number
      savedAmount: number
    } & Record<string, unknown>
    const targetAmount = Number(camelGoal.targetAmount)
    const savedAmount = Number(camelGoal.savedAmount)

    return NextResponse.json({
      contribution: snakeToCamel(contribution as unknown as Record<string, unknown>),
      savingsGoal: {
        ...camelGoal,
        progress: targetAmount > 0
          ? Number(((savedAmount / targetAmount) * 100).toFixed(1))
          : 0,
        remaining: Number(Math.max(0, targetAmount - savedAmount).toFixed(2)),
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('Contribute to savings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}