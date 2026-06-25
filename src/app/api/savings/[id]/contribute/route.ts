import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const contributeSchema = z.object({
  amount: z.number().positive(),
  note: z.string().optional(),
  date: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const parsed = contributeSchema.parse(body)

    const goal = await db.savingsGoal.findUnique({ where: { id } })
    if (!goal) {
      return NextResponse.json({ error: 'Savings goal not found' }, { status: 404 })
    }

    // Create contribution
    const contribution = await db.savingsContribution.create({
      data: {
        amount: parsed.amount,
        date: parsed.date ? new Date(parsed.date) : new Date(),
        note: parsed.note,
        goalId: id,
        accountId: goal.accountId,
      },
    })

    // Update goal's saved amount
    const newSavedAmount = goal.savedAmount + parsed.amount
    let newStatus = goal.status
    if (newSavedAmount >= goal.targetAmount) {
      newStatus = 'completed'
    } else if (newStatus === 'completed' && newSavedAmount < goal.targetAmount) {
      newStatus = 'active'
    }

    const updatedGoal = await db.savingsGoal.update({
      where: { id },
      data: { savedAmount: newSavedAmount, status: newStatus },
    })

    return NextResponse.json({
      contribution,
      savingsGoal: {
        ...updatedGoal,
        progress: updatedGoal.targetAmount > 0
          ? Number(((updatedGoal.savedAmount / updatedGoal.targetAmount) * 100).toFixed(1))
          : 0,
        remaining: Number(Math.max(0, updatedGoal.targetAmount - updatedGoal.savedAmount).toFixed(2)),
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    console.error('Contribute to savings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}