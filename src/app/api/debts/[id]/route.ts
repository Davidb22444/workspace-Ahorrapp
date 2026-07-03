import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { getAuthFromCookie } from '@/lib/auth-utils'

const debtUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  totalAmount: z.number().positive().optional(),
  interestRate: z.number().min(0).nullable().optional(),
  dueDate: z.string().nullable().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
  installments: z.number().int().positive().nullable().optional(),
})

function snakeToCamel(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    result[camelKey] = value
  }
  return result
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accountId = getAuthFromCookie(request)
    if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const { id } = await params

    const debt = await prisma.debts.findFirst({
      where: { id, account_id: accountId },
    })

    if (!debt) {
      return NextResponse.json({ error: 'Debt not found' }, { status: 404 })
    }

    const payments = await prisma.debt_payments.findMany({
      where: { debt_id: id },
      orderBy: { date: 'desc' },
    })

    if (!payments) {
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
    }

    const camelDebt = snakeToCamel(debt as unknown as Record<string, unknown>) as {
      totalAmount: number
      paidAmount: number
    } & Record<string, unknown>
    const totalAmount = Number(camelDebt.totalAmount)
    const paidAmount = Number(camelDebt.paidAmount)

    return NextResponse.json({
      debt: {
        ...camelDebt,
        remaining: Number(Math.max(0, totalAmount - paidAmount).toFixed(2)),
        progress: totalAmount > 0
          ? Number(((paidAmount / totalAmount) * 100).toFixed(1))
          : 0,
        payments: (payments || []).map((p: Record<string, unknown>) =>
          snakeToCamel(p)
        ),
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
    const accountId = getAuthFromCookie(request)
    if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const { id } = await params
    const body = await request.json()
    const parsed = debtUpdateSchema.parse(body)

    const existing = await prisma.debts.findFirst({
      where: { id, account_id: accountId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Debt not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (parsed.name !== undefined) updateData.name = parsed.name
    if (parsed.totalAmount !== undefined) updateData.total_amount = parsed.totalAmount
    if (parsed.interestRate !== undefined) updateData.interest_rate = parsed.interestRate
    if (parsed.dueDate !== undefined) updateData.due_date = parsed.dueDate
    if (parsed.status !== undefined) updateData.status = parsed.status
    if (parsed.type !== undefined) updateData.type = parsed.type
    if (parsed.installments !== undefined) updateData.installments = parsed.installments

    const debt = await prisma.debts.update({
      where: { id },
      data: updateData,
    })

    const camelDebt = snakeToCamel(debt as unknown as Record<string, unknown>)

    return NextResponse.json({ debt: camelDebt })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('Update debt error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accountId = getAuthFromCookie(request)
    if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const { id } = await params

    const existing = await prisma.debts.findFirst({
      where: { id, account_id: accountId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Debt not found' }, { status: 404 })
    }

    await prisma.debt_payments.deleteMany({ where: { debt_id: id } })
    await prisma.debts.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete debt error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
