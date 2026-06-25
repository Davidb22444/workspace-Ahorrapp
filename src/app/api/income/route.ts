import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const incomeCreateSchema = z.object({
  source: z.string().min(1),
  amount: z.number().positive(),
  description: z.string().optional(),
  frequency: z.string().default('monthly'),
  date: z.string().optional(),
  categoryId: z.string().optional(),
  accountId: z.string().min(1),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const categoryId = searchParams.get('categoryId')
    const frequency = searchParams.get('frequency')

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
    }

    const where: Record<string, unknown> = { accountId }

    if (from || to) {
      where.date = {} as Record<string, unknown>
      if (from) (where.date as Record<string, unknown>).gte = new Date(from)
      if (to) (where.date as Record<string, unknown>).lte = new Date(to)
    }
    if (categoryId) where.categoryId = categoryId
    if (frequency) where.frequency = frequency

    const incomes = await db.income.findMany({
      where,
      orderBy: { date: 'desc' },
      include: { category: { select: { id: true, name: true, icon: true, color: true } } },
    })

    const total = incomes.reduce((sum, i) => sum + i.amount, 0)

    return NextResponse.json({ incomes, total: Number(total.toFixed(2)) })
  } catch (error) {
    console.error('List income error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = incomeCreateSchema.parse(body)

    const income = await db.income.create({
      data: {
        source: parsed.source,
        amount: parsed.amount,
        description: parsed.description,
        frequency: parsed.frequency,
        date: parsed.date ? new Date(parsed.date) : new Date(),
        categoryId: parsed.categoryId,
        accountId: parsed.accountId,
      },
      include: { category: { select: { id: true, name: true, icon: true, color: true } } },
    })

    // Also create a movement record
    await db.movement.create({
      data: {
        type: 'income',
        amount: income.amount,
        description: `Ingreso: ${income.source}`,
        date: income.date,
        categoryId: income.categoryId,
        accountId: income.accountId,
      },
    })

    return NextResponse.json({ income }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    console.error('Create income error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}