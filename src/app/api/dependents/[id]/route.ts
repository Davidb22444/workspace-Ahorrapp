import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { keysToCamel } from '@/lib/supabase-utils'
import { z } from 'zod'
import { getAuthFromCookie } from '@/lib/auth-utils'

const dependentUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  relationship: z.string().optional(),
  economicWeight: z.number().min(0).optional(),
  birthDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accountId = getAuthFromCookie(request)
    if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const { id } = await params
    const data = await prisma.dependents.findFirst({
      where: { id, account_id: accountId },
    })

    if (!data) {
      return NextResponse.json({ error: 'Dependent not found' }, { status: 404 })
    }

    const dependent = keysToCamel(data)

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
    const accountId = getAuthFromCookie(request)
    if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const { id } = await params
    const body = await request.json()
    const parsed = dependentUpdateSchema.parse(body)

    const existing = await prisma.dependents.findFirst({
      where: { id, account_id: accountId },
      select: { id: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Dependent not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (parsed.name !== undefined) updateData.name = parsed.name
    if (parsed.relationship !== undefined) updateData.relationship = parsed.relationship
    if (parsed.economicWeight !== undefined) updateData.economic_weight = parsed.economicWeight
    if (parsed.birthDate !== undefined) updateData.birth_date = parsed.birthDate
    if (parsed.notes !== undefined) updateData.notes = parsed.notes

    const data = await prisma.dependents.update({
      where: { id },
      data: updateData,
    })

    const dependent = keysToCamel(data)

    return NextResponse.json({ dependent })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('Update dependent error:', error)
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

    const existing = await prisma.dependents.findFirst({
      where: { id, account_id: accountId },
      select: { id: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Dependent not found' }, { status: 404 })
    }

    await prisma.dependents.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete dependent error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
