import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const debtUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  totalAmount: z.number().positive().optional(),
  interestRate: z.number().min(0).nullable().optional(),
  dueDate: z.string().nullable().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
  installments: z.number().int().positive().nullable().optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const debt = await db.debt.findUnique({
      where: { id },
      include: { payments: { orderBy: { date: 'desc' } } },
    })

    if (!debt) {
      return NextResponse.json({ error: 'Debt not found' }, { status: 404 })
    }

    return NextResponse.json({
      debt: {
        ...debt,
        remaining: Number(Math.max(0, debt.totalAmount - debt.paidAmount).toFixed(2)),
        progress: debt.totalAmount > 0
          ? Number(((debt.paidAmount / debt.totalAmount) * 100).toFixed(1))
          : 0,
      },
    })
  } catch (error) {
    console.error('Get debt error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const parsed = debtUpdateSchema.parse(body)

    const data: Record<string, unknown> = { ...parsed }
    if (parsed.dueDate !== undefined) {
      data.dueDate = parsed.dueDate ? new Date(parsed.dueDate) : null
    }

    const debt = await db.debt.update({
      where: { id },
      data,
      include: { payments: { orderBy: { date: 'desc' } } },
    })

    return NextResponse.json({ debt })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    console.error('Update debt error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.debt.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete debt error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}