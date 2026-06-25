import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const debtCreateSchema = z.object({
  name: z.string().min(1),
  totalAmount: z.number().positive(),
  interestRate: z.number().min(0).optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  type: z.string().default('loan'),
  installments: z.number().int().positive().optional(),
  accountId: z.string().min(1),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
    }

    const where: Record<string, unknown> = { accountId }
    if (status) where.status = status
    if (type) where.type = type

    const debts = await db.debt.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        payments: { orderBy: { date: 'desc' } },
      },
    })

    const enriched = debts.map((debt) => ({
      ...debt,
      remaining: Number(Math.max(0, debt.totalAmount - debt.paidAmount).toFixed(2)),
      progress: debt.totalAmount > 0
        ? Number(((debt.paidAmount / debt.totalAmount) * 100).toFixed(1))
        : 0,
      paymentsCount: debt.payments.length,
    }))

    const totalDebt = debts.reduce((sum, d) => sum + (d.totalAmount - d.paidAmount), 0)

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
    const body = await request.json()
    const parsed = debtCreateSchema.parse(body)

    const debt = await db.debt.create({
      data: {
        name: parsed.name,
        totalAmount: parsed.totalAmount,
        interestRate: parsed.interestRate,
        startDate: parsed.startDate ? new Date(parsed.startDate) : new Date(),
        dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
        type: parsed.type,
        installments: parsed.installments,
        accountId: parsed.accountId,
      },
    })

    return NextResponse.json({ debt }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    console.error('Create debt error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}