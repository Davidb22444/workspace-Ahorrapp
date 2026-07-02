import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { keysToCamel } from '@/lib/supabase-utils'
import { z } from 'zod'
import { getAuthFromCookie } from '@/lib/auth-utils'

const incomeCreateSchema = z.object({
  source: z.string().min(1),
  amount: z.number().positive(),
  description: z.string().optional(),
  frequency: z.string().default('monthly'),
  date: z.string().optional(),
  categoryId: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = getAuthFromCookie(request)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const categoryId = searchParams.get('categoryId')
    const frequency = searchParams.get('frequency')

    if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const where: Record<string, any> = { account_id: accountId }
    if (categoryId) where.category_id = categoryId
    if (frequency) where.frequency = frequency
    if (from || to) {
      where.date = {}
      if (from) where.date.gte = new Date(from)
      if (to) where.date.lte = new Date(to)
    }

    const data = await prisma.incomes.findMany({
      where,
      orderBy: { date: 'desc' },
    })

    const incomes = (data || []).map(keysToCamel)
    return NextResponse.json({ incomes })
  } catch (error) {
    console.error('List income error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const accountId = getAuthFromCookie(request); if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const body = await request.json()
    const parsed = incomeCreateSchema.parse(body)

    const income = await prisma.incomes.create({
      data: {
        source: parsed.source,
        amount: parsed.amount,
        description: parsed.description || null,
        frequency: parsed.frequency,
        date: parsed.date ? new Date(parsed.date) : new Date(),
        category_id: parsed.categoryId || null,
        account_id: accountId,
      },
    })

    try {
      await prisma.movements.create({
        data: {
          type: 'income',
          amount: parsed.amount,
          description: `Ingreso: ${parsed.source}`,
          date: parsed.date ? new Date(parsed.date) : new Date(),
          category_id: parsed.categoryId || null,
          account_id: accountId,
        },
      })
    } catch (movError) {
      await prisma.incomes.delete({ where: { id: income.id } })
      console.error('Create movement error:', movError)
      return NextResponse.json({ error: 'Failed to create movement' }, { status: 500 })
    }

    return NextResponse.json({ income: keysToCamel(income) }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('Create income error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
