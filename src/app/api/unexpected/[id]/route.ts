import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const unexpectedUpdateSchema = z.object({
  amount: z.number().positive().optional(),
  description: z.string().min(1).optional(),
  date: z.string().optional(),
  categoryId: z.string().nullable().optional(),
  dependentId: z.string().nullable().optional(),
  resolved: z.boolean().optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const unexpected = await db.unexpected.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, icon: true, color: true } },
        dependent: { select: { id: true, name: true, relationship: true } },
      },
    })

    if (!unexpected) {
      return NextResponse.json({ error: 'Unexpected expense not found' }, { status: 404 })
    }

    return NextResponse.json({ unexpected })
  } catch (error) {
    console.error('Get unexpected error:', error)
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
    const parsed = unexpectedUpdateSchema.parse(body)

    const data: Record<string, unknown> = { ...parsed }
    if (parsed.date) data.date = new Date(parsed.date)

    const unexpected = await db.unexpected.update({
      where: { id },
      data,
      include: {
        category: { select: { id: true, name: true, icon: true, color: true } },
        dependent: { select: { id: true, name: true, relationship: true } },
      },
    })

    return NextResponse.json({ unexpected })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    console.error('Update unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.unexpected.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}