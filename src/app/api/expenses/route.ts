import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { keysToCamel } from '@/lib/supabase-utils'
import { z } from 'zod'
import { getAuthFromCookie } from '@/lib/auth-utils'
import { createAuditLog } from '@/lib/security'

const expenseCreateSchema = z.object({
  amount: z.number().positive(),
  description: z.string().min(1),
  date: z.string().optional(),
  categoryId: z.string().optional(),
  dependentId: z.string().optional(),
  isRecurring: z.boolean().default(false),
  frequency: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = getAuthFromCookie(request)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const categoryId = searchParams.get('categoryId')
    const dependentId = searchParams.get('dependentId')
    const isRecurring = searchParams.get('isRecurring')

    if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const where: Record<string, any> = { account_id: accountId }
    if (categoryId) where.category_id = categoryId
    if (dependentId) where.dependent_id = dependentId
    if (isRecurring !== null) where.is_recurring = isRecurring === 'true'
    if (from || to) {
      where.date = {}
      if (from) where.date.gte = new Date(from)
      if (to) where.date.lte = new Date(to)
    }

    const data = await prisma.expenses.findMany({
      where,
      orderBy: { date: 'desc' },
    })

    const expenses = (data || []).map(keysToCamel)
    const total = expenses.reduce((sum: number, e: any) => sum + e.amount, 0)
    return NextResponse.json({ expenses, total: Number(total.toFixed(2)) })
  } catch (error) {
    console.error('List expenses error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const accountId = getAuthFromCookie(request); if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const body = await request.json()
    const parsed = expenseCreateSchema.parse(body)

    const expense = await prisma.expenses.create({
      data: {
        amount: parsed.amount,
        description: parsed.description,
        date: parsed.date ? new Date(parsed.date) : new Date(),
        category_id: parsed.categoryId || null,
        dependent_id: parsed.dependentId || null,
        is_recurring: parsed.isRecurring,
        frequency: parsed.frequency || null,
        account_id: accountId,
      },
    })

    try {
      await prisma.movements.create({
        data: {
          type: 'expense',
          amount: parsed.amount,
          description: `Gasto: ${parsed.description}`,
          date: parsed.date ? new Date(parsed.date) : new Date(),
          category_id: parsed.categoryId || null,
          account_id: accountId,
        },
      })
    } catch (movError) {
      await prisma.expenses.delete({ where: { id: expense.id } })
      console.error('Create movement error:', movError)
      return NextResponse.json({ error: 'Failed to create movement' }, { status: 500 })
    }

    createAuditLog({
      action: 'CREATE',
      entity: 'expense',
      entityId: expense.id,
      details: `Gasto creado: $${parsed.amount} - ${parsed.description}`,
      accountId,
    })

    return NextResponse.json({ expense: keysToCamel(expense) }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('Create expense error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
