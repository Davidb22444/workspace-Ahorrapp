import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const expenseCreateSchema = z.object({
  amount: z.number().positive(),
  description: z.string().min(1),
  date: z.string().optional(),
  categoryId: z.string().optional(),
  dependentId: z.string().optional(),
  isRecurring: z.boolean().default(false),
  frequency: z.string().optional(),
  accountId: z.string().min(1),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const categoryId = searchParams.get('categoryId')
    const dependentId = searchParams.get('dependentId')
    const isRecurring = searchParams.get('isRecurring')

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
    if (dependentId) where.dependentId = dependentId
    if (isRecurring !== null) where.isRecurring = isRecurring === 'true'

    const expenses = await db.expense.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        category: { select: { id: true, name: true, icon: true, color: true } },
        dependent: { select: { id: true, name: true, relationship: true } },
      },
    })

    const total = expenses.reduce((sum, e) => sum + e.amount, 0)

    return NextResponse.json({ expenses, total: Number(total.toFixed(2)) })
  } catch (error) {
    console.error('List expenses error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = expenseCreateSchema.parse(body)

    const expense = await db.expense.create({
      data: {
        amount: parsed.amount,
        description: parsed.description,
        date: parsed.date ? new Date(parsed.date) : new Date(),
        categoryId: parsed.categoryId,
        dependentId: parsed.dependentId,
        isRecurring: parsed.isRecurring,
        frequency: parsed.frequency,
        accountId: parsed.accountId,
      },
      include: {
        category: { select: { id: true, name: true, icon: true, color: true } },
        dependent: { select: { id: true, name: true, relationship: true } },
      },
    })

    // Create movement record
    await db.movement.create({
      data: {
        type: 'expense',
        amount: expense.amount,
        description: `Gasto: ${expense.description}`,
        date: expense.date,
        categoryId: expense.categoryId,
        accountId: expense.accountId,
      },
    })

    return NextResponse.json({ expense }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    console.error('Create expense error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}