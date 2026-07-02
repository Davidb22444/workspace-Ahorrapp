import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthFromCookie } from '@/lib/auth-utils'
import { z } from 'zod'

const paySchema = z.object({
  amount: z.number().positive(),
  note: z.string().optional(),
  date: z.string().optional(),
})

function snakeToCamel(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    result[camelKey] = value
  }
  return result
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accountId = getAuthFromCookie(request)
    if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const parsed = paySchema.parse(body)

    const debt = await prisma.debts.findFirst({
      where: { id },
    })

    if (!debt) {
      return NextResponse.json({ error: 'Debt not found' }, { status: 404 })
    }

    if (debt.account_id !== accountId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const remaining = Number(debt.total_amount) - Number(debt.paid_amount)

    if (parsed.amount > remaining) {
      return NextResponse.json(
        { error: 'Payment amount exceeds remaining balance' },
        { status: 400 }
      )
    }

    const payment = await prisma.debt_payments.create({
      data: {
        amount: parsed.amount,
        date: new Date(parsed.date || new Date().toISOString().split('T')[0]),
        note: parsed.note || null,
        debt_id: id,
        account_id: debt.account_id,
      },
    })

    if (!payment) {
      console.error('Create payment error:')
      return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 })
    }

    const originalPaidAmount = Number(debt.paid_amount)
    const newPaidAmount = originalPaidAmount + parsed.amount
    let newStatus = debt.status
    if (newPaidAmount >= Number(debt.total_amount)) {
      newStatus = 'paid'
    } else if (newPaidAmount > 0) {
      newStatus = 'partial'
    }

    const result = await prisma.debts.updateMany({
      where: { id, paid_amount: originalPaidAmount },
      data: { paid_amount: newPaidAmount, status: newStatus },
    })

    if (result.count === 0) {
      await prisma.debt_payments.delete({ where: { id: payment.id } })
      return NextResponse.json({ error: 'Conflict, please retry' }, { status: 409 })
    }

    const updatedDebt = await prisma.debts.findFirst({
      where: { id },
    })

    const camelDebt = snakeToCamel(updatedDebt as unknown as Record<string, unknown>) as {
      totalAmount: number
      paidAmount: number
    } & Record<string, unknown>
    const totalAmount = Number(camelDebt.totalAmount)
    const paidAmount = Number(camelDebt.paidAmount)

    return NextResponse.json({
      payment: snakeToCamel(payment as unknown as Record<string, unknown>),
      debt: {
        ...camelDebt,
        remaining: Number(Math.max(0, totalAmount - paidAmount).toFixed(2)),
        progress: totalAmount > 0
          ? Number(((paidAmount / totalAmount) * 100).toFixed(1))
          : 0,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('Pay debt error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}