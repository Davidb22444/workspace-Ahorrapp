import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromCookie } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const savingsCreateSchema = z.object({
  name: z.string().min(1),
  targetAmount: z.number().positive(),
  icon: z.string().default('PiggyBank'),
  color: z.string().default('#10b981'),
  deadline: z.string().optional(),
})

function snakeToCamel(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    result[camelKey] = value
  }
  return result
}

export async function GET(request: NextRequest) {
  try {
    const accountId = getAuthFromCookie(request)
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    if (!accountId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const where: Record<string, unknown> = { account_id: accountId }
    if (status) where.status = status

    const goals = await prisma.savings_goals.findMany({
      where,
      orderBy: { created_at: 'desc' },
    })

    if (!goals || goals.length === 0) {
      return NextResponse.json({ savingsGoals: [] })
    }

    const goalIds = goals.map((g: { id: string }) => g.id)
    const contributions = await prisma.savings_contributions.findMany({
      where: { goal_id: { in: goalIds } },
      orderBy: { date: 'desc' },
    })

    if (!contributions) {
      return NextResponse.json({ error: 'Failed to fetch contributions' }, { status: 500 })
    }

    const contribMap: Record<string, unknown[]> = {}
    if (contributions) {
      for (const c of contributions) {
        if (!contribMap[c.goal_id]) contribMap[c.goal_id] = []
        if (contribMap[c.goal_id].length < 10) {
          contribMap[c.goal_id].push(snakeToCamel(c as unknown as Record<string, unknown>))
        }
      }
    }

    const enriched = goals.map((goal) => {
      const camel = snakeToCamel(goal as unknown as Record<string, unknown>) as {
        targetAmount: number
        savedAmount: number
      } & Record<string, unknown>
      const targetAmount = Number(camel.targetAmount)
      const savedAmount = Number(camel.savedAmount)
      return {
        ...camel,
        progress: targetAmount > 0
          ? Number(((savedAmount / targetAmount) * 100).toFixed(1))
          : 0,
        remaining: Number(Math.max(0, targetAmount - savedAmount).toFixed(2)),
        contributions: contribMap[goal.id] || [],
        contributionsCount: (contribMap[goal.id] || []).length,
      }
    })

    return NextResponse.json({ savingsGoals: enriched })
  } catch (error) {
    console.error('List savings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const accountId = getAuthFromCookie(request)
    if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = await request.json()
    const parsed = savingsCreateSchema.parse(body)

    const goal = await prisma.savings_goals.create({
      data: {
        name: parsed.name,
        target_amount: parsed.targetAmount,
        icon: parsed.icon,
        color: parsed.color,
        deadline: parsed.deadline ? new Date(parsed.deadline) : null,
        account_id: accountId,
        saved_amount: 0,
        status: 'active',
      },
    })

    const camelGoal = snakeToCamel(goal as unknown as Record<string, unknown>)

    return NextResponse.json({ savingsGoal: camelGoal }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('Create savings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
