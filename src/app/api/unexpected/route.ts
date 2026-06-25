import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const unexpectedCreateSchema = z.object({
  amount: z.number().positive(),
  description: z.string().min(1),
  date: z.string().optional(),
  categoryId: z.string().optional(),
  dependentId: z.string().optional(),
  resolved: z.boolean().default(false),
  accountId: z.string().min(1),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const resolved = searchParams.get('resolved')
    const categoryId = searchParams.get('categoryId')

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
    }

    const where: Record<string, unknown> = { accountId }
    if (resolved !== null) where.resolved = resolved === 'true'
    if (categoryId) where.categoryId = categoryId

    const unexpecteds = await db.unexpected.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        category: { select: { id: true, name: true, icon: true, color: true } },
        dependent: { select: { id: true, name: true, relationship: true } },
      },
    })

    const total = unexpecteds.reduce((sum, u) => sum + u.amount, 0)

    return NextResponse.json({ unexpecteds, total: Number(total.toFixed(2)) })
  } catch (error) {
    console.error('List unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = unexpectedCreateSchema.parse(body)

    const unexpected = await db.unexpected.create({
      data: {
        amount: parsed.amount,
        description: parsed.description,
        date: parsed.date ? new Date(parsed.date) : new Date(),
        categoryId: parsed.categoryId,
        dependentId: parsed.dependentId,
        resolved: parsed.resolved,
        accountId: parsed.accountId,
      },
      include: {
        category: { select: { id: true, name: true, icon: true, color: true } },
        dependent: { select: { id: true, name: true, relationship: true } },
      },
    })

    // Create movement record
    await db.movement.create({
      data: {
        type: 'unexpected',
        amount: unexpected.amount,
        description: `Imprevisto: ${unexpected.description}`,
        date: unexpected.date,
        categoryId: unexpected.categoryId,
        accountId: unexpected.accountId,
      },
    })

    return NextResponse.json({ unexpected }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    console.error('Create unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}