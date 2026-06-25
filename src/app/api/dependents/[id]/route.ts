import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const dependentUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  relationship: z.string().optional(),
  economicWeight: z.number().min(0).optional(),
  birthDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const dependent = await db.dependent.findUnique({ where: { id } })

    if (!dependent) {
      return NextResponse.json({ error: 'Dependent not found' }, { status: 404 })
    }

    return NextResponse.json({ dependent })
  } catch (error) {
    console.error('Get dependent error:', error)
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
    const parsed = dependentUpdateSchema.parse(body)

    const data: Record<string, unknown> = { ...parsed }
    if (parsed.birthDate !== undefined) {
      data.birthDate = parsed.birthDate ? new Date(parsed.birthDate) : null
    }

    const dependent = await db.dependent.update({
      where: { id },
      data,
    })

    return NextResponse.json({ dependent })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    console.error('Update dependent error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.dependent.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete dependent error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}