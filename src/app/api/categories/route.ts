import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const categoryCreateSchema = z.object({
  name: z.string().min(1),
  icon: z.string().default('Circle'),
  color: z.string().default('#6366f1'),
  type: z.string().default('expense'),
  accountId: z.string().min(1),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const type = searchParams.get('type')

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
    }

    const where: Record<string, unknown> = { accountId }
    if (type) where.type = type

    const categories = await db.category.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    })

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('List categories error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = categoryCreateSchema.parse(body)

    const category = await db.category.create({
      data: {
        name: parsed.name,
        icon: parsed.icon,
        color: parsed.color,
        type: parsed.type,
        isDefault: false,
        accountId: parsed.accountId,
      },
    })

    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    console.error('Create category error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}