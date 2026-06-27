import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { z } from 'zod'
import { getAuthFromCookie } from '@/lib/auth-utils'

const savingsUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  targetAmount: z.number().positive().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  deadline: z.string().nullable().optional(),
  status: z.string().optional(),
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

    const { data: goal, error: goalError } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('id', id)
      .eq('account_id', accountId)
      .single()

    if (goalError || !goal) {
      return NextResponse.json({ error: 'Savings goal not found' }, { status: 404 })
    }

    const { data: contributions, error: contribError } = await supabase
      .from('savings_contributions')
      .select('*')
      .eq('goal_id', id)
      .order('date', { ascending: false })

    if (contribError) {
      console.error('Get savings contributions error:', contribError)
      return NextResponse.json({ error: 'Failed to fetch contributions' }, { status: 500 })
    }

    const camelGoal = snakeToCamel(goal as unknown as Record<string, unknown>) as {
      targetAmount: number
      savedAmount: number
    } & Record<string, unknown>
    const targetAmount = Number(camelGoal.targetAmount)
    const savedAmount = Number(camelGoal.savedAmount)

    return NextResponse.json({
      savingsGoal: {
        ...camelGoal,
        progress: targetAmount > 0
          ? Number(((savedAmount / targetAmount) * 100).toFixed(1))
          : 0,
        remaining: Number(Math.max(0, targetAmount - savedAmount).toFixed(2)),
        contributions: (contributions || []).map((c) =>
          snakeToCamel(c as unknown as Record<string, unknown>)
        ),
      },
    })
  } catch (error) {
    console.error('Get savings error:', error)
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
    const parsed = savingsUpdateSchema.parse(body)

    const updateData: Record<string, unknown> = {}
    if (parsed.name !== undefined) updateData.name = parsed.name
    if (parsed.targetAmount !== undefined) updateData.target_amount = parsed.targetAmount
    if (parsed.icon !== undefined) updateData.icon = parsed.icon
    if (parsed.color !== undefined) updateData.color = parsed.color
    if (parsed.deadline !== undefined) updateData.deadline = parsed.deadline
    if (parsed.status !== undefined) updateData.status = parsed.status

    const { data: goal, error } = await supabase
      .from('savings_goals')
      .update(updateData)
      .eq('id', id)
      .eq('account_id', accountId)
      .select()
      .single()

    if (error) {
      console.error('Update savings error:', error)
      return NextResponse.json({ error: 'Failed to update savings goal' }, { status: 500 })
    }

    const camelGoal = snakeToCamel(goal as unknown as Record<string, unknown>)

    return NextResponse.json({ savingsGoal: camelGoal })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('Update savings error:', error)
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

    // Delete contributions first
    await supabase.from('savings_contributions').delete().eq('goal_id', id)

    const { error } = await supabase.from('savings_goals').delete().eq('id', id).eq('account_id', accountId)

    if (error) {
      console.error('Delete savings error:', error)
      return NextResponse.json({ error: 'Failed to delete savings goal' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete savings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
