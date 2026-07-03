import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { getAuthFromCookie } from '@/lib/auth-utils'

const budgetCreateSchema = z.object({
  name: z.string().min(1),
  totalAmount: z.number().positive(),
  needsPercent: z.number().min(0).max(100).default(50),
  wantsPercent: z.number().min(0).max(100).default(30),
  savingsPercent: z.number().min(0).max(100).default(20),
  cycle: z.string().default('monthly'),
  isActive: z.boolean().default(true),
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
    const { searchParams } = new URL(request.url)
    const accountId = getAuthFromCookie(request)
    const isActive = searchParams.get('isActive')

    if (!accountId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const where: Record<string, unknown> = { account_id: accountId }
    if (isActive !== null) {
      where.is_active = isActive === 'true'
    }

    const budgets = await prisma.budgets.findMany({
      where,
      orderBy: { created_at: 'desc' },
    })

    if (!budgets || budgets.length === 0) {
      return NextResponse.json({ budgets: [] })
    }

    const budgetIds = budgets.map((b: { id: string }) => b.id)
    const periods = await prisma.budget_periods.findMany({
      where: { budget_id: { in: budgetIds } },
      orderBy: { start_date: 'desc' },
    })

    if (!periods) {
      return NextResponse.json({ error: 'Failed to fetch budget periods' }, { status: 500 })
    }

    const periodMap: Record<string, unknown[]> = {}
    if (periods) {
      for (const p of periods) {
        if (!periodMap[p.budget_id]) periodMap[p.budget_id] = []
        periodMap[p.budget_id].push(snakeToCamel(p as unknown as Record<string, unknown>))
      }
    }

    const enriched = budgets.map((budget: Record<string, unknown>) => {
      const camel = snakeToCamel(budget)
      return {
        ...camel,
        periods: periodMap[budget.id] || [],
      }
    })

    return NextResponse.json({ budgets: enriched })
  } catch (error) {
    console.error('List budgets error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const accountId = getAuthFromCookie(request); if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const body = await request.json()
    const parsed = budgetCreateSchema.parse(body)

    const budget = await prisma.budgets.create({
      data: {
        name: parsed.name,
        total_amount: parsed.totalAmount,
        needs_percent: parsed.needsPercent,
        wants_percent: parsed.wantsPercent,
        savings_percent: parsed.savingsPercent,
        cycle: parsed.cycle,
        is_active: parsed.isActive,
        account_id: accountId,
      },
    })

    const camelBudget = snakeToCamel(budget as unknown as Record<string, unknown>)

    return NextResponse.json({ budget: { ...camelBudget, periods: [] } }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('Create budget error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
