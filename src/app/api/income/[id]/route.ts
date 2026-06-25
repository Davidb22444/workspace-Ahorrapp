import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const incomeUpdateSchema = z.object({
  source: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  description: z.string().optional(),
  frequency: z.string().optional(),
  date: z.string().optional(),
  categoryId: z.string().nullable().optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const income = await db.income.findUnique({
      where: { id },
      include: { category: { select: { id: true, name: true, icon: true, color: true } } },
    })

    if (!income) {
      return NextResponse.json({ error: 'Income not found' }, { status: 404 })
    }

    return NextResponse.json({ income })
  } catch (error) {
    console.error('Get income error:', error)
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
    const parsed = incomeUpdateSchema.parse(body)

    const data: Record<string, unknown> = { ...parsed }
    if (parsed.date) data.date = new Date(parsed.date)

    const income = await db.income.update({
      where: { id },
      data,
      include: { category: { select: { id: true, name: true, icon: true, color: true } } },
    })

    return NextResponse.json({ income })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    console.error('Update income error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.income.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete income error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}