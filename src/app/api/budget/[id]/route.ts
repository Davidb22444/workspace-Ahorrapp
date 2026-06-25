import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const budgetUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  totalAmount: z.number().positive().optional(),
  needsPercent: z.number().min(0).max(100).optional(),
  wantsPercent: z.number().min(0).max(100).optional(),
  savingsPercent: z.number().min(0).max(100).optional(),
  cycle: z.string().optional(),
  isActive: z.boolean().optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const budget = await db.budget.findUnique({
      where: { id },
      include: { periods: { orderBy: { startDate: 'desc' } } },
    })

    if (!budget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 })
    }

    return NextResponse.json({ budget })
  } catch (error) {
    console.error('Get budget error:', error)
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
    const parsed = budgetUpdateSchema.parse(body)

    const budget = await db.budget.update({
      where: { id },
      data: parsed,
      include: { periods: { orderBy: { startDate: 'desc' } } },
    })

    return NextResponse.json({ budget })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    console.error('Update budget error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.budget.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete budget error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}