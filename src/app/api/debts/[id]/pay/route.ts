import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const paySchema = z.object({
  amount: z.number().positive(),
  note: z.string().optional(),
  date: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const parsed = paySchema.parse(body)

    const debt = await db.debt.findUnique({ where: { id } })
    if (!debt) {
      return NextResponse.json({ error: 'Debt not found' }, { status: 404 })
    }

    if (parsed.amount > (debt.totalAmount - debt.paidAmount)) {
      return NextResponse.json(
        { error: 'Payment amount exceeds remaining balance' },
        { status: 400 }
      )
    }

    // Create payment
    const payment = await db.debtPayment.create({
      data: {
        amount: parsed.amount,
        date: parsed.date ? new Date(parsed.date) : new Date(),
        note: parsed.note,
        debtId: id,
        accountId: debt.accountId,
      },
    })

    // Update debt's paid amount
    const newPaidAmount = debt.paidAmount + parsed.amount
    let newStatus = debt.status
    if (newPaidAmount >= debt.totalAmount) {
      newStatus = 'paid'
    } else if (newPaidAmount > 0) {
      newStatus = 'partial'
    }

    const updatedDebt = await db.debt.update({
      where: { id },
      data: { paidAmount: newPaidAmount, status: newStatus },
    })

    return NextResponse.json({
      payment,
      debt: {
        ...updatedDebt,
        remaining: Number(Math.max(0, updatedDebt.totalAmount - updatedDebt.paidAmount).toFixed(2)),
        progress: updatedDebt.totalAmount > 0
          ? Number(((updatedDebt.paidAmount / updatedDebt.totalAmount) * 100).toFixed(1))
          : 0,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    console.error('Pay debt error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}