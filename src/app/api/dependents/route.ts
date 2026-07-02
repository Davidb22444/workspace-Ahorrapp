import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromCookie } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { rowsToCamel, keysToCamel } from '@/lib/supabase-utils'
import { z } from 'zod'

const dependentCreateSchema = z.object({
  name: z.string().min(1),
  relationship: z.string().default('other'),
  economicWeight: z.number().min(0).default(1.0),
  birthDate: z.string().optional(),
  notes: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const accountId = getAuthFromCookie(request)

    if (!accountId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const data = await prisma.dependents.findMany({
      where: { account_id: accountId },
      orderBy: { name: 'asc' },
    })

    const dependents = rowsToCamel(data)

    return NextResponse.json({ dependents })
  } catch (error) {
    console.error('List dependents error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const accountId = getAuthFromCookie(request)
    if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = await request.json()
    const parsed = dependentCreateSchema.parse(body)

    const data = await prisma.dependents.create({
      data: {
        name: parsed.name,
        relationship: parsed.relationship,
        economic_weight: parsed.economicWeight,
        birth_date: parsed.birthDate || null,
        notes: parsed.notes || null,
        account_id: accountId,
      },
    })

    const dependent = keysToCamel(data)

    return NextResponse.json({ dependent }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('Create dependent error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
