import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const savingsCreateSchema = z.object({
  name: z.string().min(1),
  targetAmount: z.number().positive(),
  icon: z.string().default('PiggyBank'),
  color: z.string().default('#10b981'),
  deadline: z.string().optional(),
  accountId: z.string().min(1),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const status = searchParams.get('status')

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
    }

    const where: Record<string, unknown> = { accountId }
    if (status) where.status = status

    const goals = await db.savingsGoal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        contributions: {
          orderBy: { date: 'desc' },
          take: 10,
        },
      },
    })

    const enriched = goals.map((goal) => ({
      ...goal,
      progress: goal.targetAmount > 0
        ? Number(((goal.savedAmount / goal.targetAmount) * 100).toFixed(1))
        : 0,
      remaining: Number(Math.max(0, goal.targetAmount - goal.savedAmount).toFixed(2)),
      contributionsCount: goal.contributions.length,
    }))

    return NextResponse.json({ savingsGoals: enriched })
  } catch (error) {
    console.error('List savings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = savingsCreateSchema.parse(body)

    const goal = await db.savingsGoal.create({
      data: {
        name: parsed.name,
        targetAmount: parsed.targetAmount,
        icon: parsed.icon,
        color: parsed.color,
        deadline: parsed.deadline ? new Date(parsed.deadline) : null,
        accountId: parsed.accountId,
      },
    })

    return NextResponse.json({ savingsGoal: goal }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    console.error('Create savings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}