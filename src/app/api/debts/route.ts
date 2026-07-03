import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { getAuthFromCookie } from '@/lib/auth-utils'

const debtCreateSchema = z.object({
  name: z.string().min(1),
  totalAmount: z.number().positive(),
  interestRate: z.number().min(0).optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  type: z.string().default('loan'),
  installments: z.number().int().positive().optional(),
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
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    if (!accountId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const where: Record<string, unknown> = { account_id: accountId }
    if (status) where.status = status
    if (type) where.type = type

    const debts = await prisma.debts.findMany({
      where,
      orderBy: { created_at: 'desc' },
    })

    if (!debts || debts.length === 0) {
      return NextResponse.json({ debts: [], totalDebt: 0 })
    }

    const debtIds = debts.map((d: { id: string }) => d.id)
    const payments = await prisma.debt_payments.findMany({
      where: { debt_id: { in: debtIds } },
      orderBy: { date: 'desc' },
    })

    if (!payments) {
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
    }

    const payMap: Record<string, unknown[]> = {}
    if (payments) {
      for (const p of payments) {
        if (!payMap[p.debt_id]) payMap[p.debt_id] = []
        payMap[p.debt_id].push(snakeToCamel(p as unknown as Record<string, unknown>))
      }
    }

    const enriched = debts.map((debt: Record<string, unknown>) => {
      const camel = snakeToCamel(debt) as {
        totalAmount: number
        paidAmount: number
      } & Record<string, unknown>
      const totalAmount = Number(camel.totalAmount)
      const paidAmount = Number(camel.paidAmount)
      return {
        ...camel,
        remaining: Number(Math.max(0, totalAmount - paidAmount).toFixed(2)),
        progress: totalAmount > 0
          ? Number(((paidAmount / totalAmount) * 100).toFixed(1))
          : 0,
        payments: payMap[debt.id] || [],
        paymentsCount: (payMap[debt.id] || []).length,
      }
    })

    const totalDebt = debts.reduce(
      (sum: number, d: { total_amount: number; paid_amount: number }) => sum + (Number(d.total_amount) - Number(d.paid_amount)),
      0
    )

    return NextResponse.json({
      debts: enriched,
      totalDebt: Number(totalDebt.toFixed(2)),
    })
  } catch (error) {
    console.error('List debts error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const accountId = getAuthFromCookie(request); if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const body = await request.json()
    const parsed = debtCreateSchema.parse(body)

    const debt = await prisma.debts.create({
      data: {
        name: parsed.name,
        total_amount: parsed.totalAmount,
        paid_amount: 0,
        interest_rate: parsed.interestRate ?? null,
        start_date: new Date(parsed.startDate || new Date().toISOString().split('T')[0]),
        due_date: parsed.dueDate ? new Date(parsed.dueDate) : null,
        type: parsed.type,
        installments: parsed.installments ?? null,
        account_id: accountId,
        status: 'pending',
      },
    })

    const camelDebt = snakeToCamel(debt as unknown as Record<string, unknown>)

    return NextResponse.json({ debt: camelDebt }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('Create debt error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
