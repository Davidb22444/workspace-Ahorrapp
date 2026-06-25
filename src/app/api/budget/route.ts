import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const budgetCreateSchema = z.object({
  name: z.string().min(1),
  totalAmount: z.number().positive(),
  needsPercent: z.number().min(0).max(100).default(50),
  wantsPercent: z.number().min(0).max(100).default(30),
  savingsPercent: z.number().min(0).max(100).default(20),
  cycle: z.string().default('monthly'),
  isActive: z.boolean().default(true),
  accountId: z.string().min(1),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const isActive = searchParams.get('isActive')

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
    }

    const where: Record<string, unknown> = { accountId }
    if (isActive !== null) where.isActive = isActive === 'true'

    const budgets = await db.budget.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        periods: { orderBy: { startDate: 'desc' } },
      },
    })

    return NextResponse.json({ budgets })
  } catch (error) {
    console.error('List budgets error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = budgetCreateSchema.parse(body)

    const budget = await db.budget.create({
      data: {
        name: parsed.name,
        totalAmount: parsed.totalAmount,
        needsPercent: parsed.needsPercent,
        wantsPercent: parsed.wantsPercent,
        savingsPercent: parsed.savingsPercent,
        cycle: parsed.cycle,
        isActive: parsed.isActive,
        accountId: parsed.accountId,
      },
    })

    return NextResponse.json({ budget }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    console.error('Create budget error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}