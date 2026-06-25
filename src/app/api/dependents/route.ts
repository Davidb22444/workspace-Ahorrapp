import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const dependentCreateSchema = z.object({
  name: z.string().min(1),
  relationship: z.string().default('other'),
  economicWeight: z.number().min(0).default(1.0),
  birthDate: z.string().optional(),
  notes: z.string().optional(),
  accountId: z.string().min(1),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
    }

    const dependents = await db.dependent.findMany({
      where: { accountId },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ dependents })
  } catch (error) {
    console.error('List dependents error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = dependentCreateSchema.parse(body)

    const dependent = await db.dependent.create({
      data: {
        name: parsed.name,
        relationship: parsed.relationship,
        economicWeight: parsed.economicWeight,
        birthDate: parsed.birthDate ? new Date(parsed.birthDate) : null,
        notes: parsed.notes,
        accountId: parsed.accountId,
      },
    })

    return NextResponse.json({ dependent }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    console.error('Create dependent error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}