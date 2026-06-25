import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const expenseUpdateSchema = z.object({
  amount: z.number().positive().optional(),
  description: z.string().min(1).optional(),
  date: z.string().optional(),
  categoryId: z.string().nullable().optional(),
  dependentId: z.string().nullable().optional(),
  isRecurring: z.boolean().optional(),
  frequency: z.string().nullable().optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const expense = await db.expense.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, icon: true, color: true } },
        dependent: { select: { id: true, name: true, relationship: true } },
      },
    })

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    return NextResponse.json({ expense })
  } catch (error) {
    console.error('Get expense error:', error)
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
    const parsed = expenseUpdateSchema.parse(body)

    const data: Record<string, unknown> = { ...parsed }
    if (parsed.date) data.date = new Date(parsed.date)

    const expense = await db.expense.update({
      where: { id },
      data,
      include: {
        category: { select: { id: true, name: true, icon: true, color: true } },
        dependent: { select: { id: true, name: true, relationship: true } },
      },
    })

    return NextResponse.json({ expense })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    console.error('Update expense error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.expense.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete expense error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}