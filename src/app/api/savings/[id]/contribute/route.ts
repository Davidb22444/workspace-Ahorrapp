import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
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

    const goal = await prisma.savings_goals.findFirst({
      where: { id },
    })

    if (!goal) {
      return NextResponse.json({ error: 'Savings goal not found' }, { status: 404 })
    }

    if (goal.account_id !== accountId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const contribution = await prisma.savings_contributions.create({
      data: {
        amount: parsed.amount,
        date: new Date(parsed.date || new Date().toISOString().split('T')[0]),
        note: parsed.note || null,
        goal_id: id,
        account_id: goal.account_id,
      },
    })

    if (!contribution) {
      console.error('Create contribution error:')
      return NextResponse.json({ error: 'Failed to create contribution' }, { status: 500 })
    }

    const originalSavedAmount = Number(goal.saved_amount)
    const newSavedAmount = originalSavedAmount + parsed.amount
    let newStatus = goal.status
    if (newSavedAmount >= Number(goal.target_amount)) {
      newStatus = 'completed'
    } else if (newStatus === 'completed' && newSavedAmount < Number(goal.target_amount)) {
      newStatus = 'active'
    }

    const result = await prisma.savings_goals.updateMany({
      where: { id, saved_amount: originalSavedAmount },
      data: { saved_amount: newSavedAmount, status: newStatus },
    })

    if (result.count === 0) {
      await prisma.savings_contributions.delete({ where: { id: contribution.id } })
      return NextResponse.json({ error: 'Conflict, please retry' }, { status: 409 })
    }

    const updatedGoal = await prisma.savings_goals.findFirst({
      where: { id },
    })

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