import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { keysToCamel } from '@/lib/supabase-utils'
import { z } from 'zod'
import { getAuthFromCookie } from '@/lib/auth-utils'

const unexpectedUpdateSchema = z.object({
  amount: z.number().positive().optional(),
  description: z.string().min(1).optional(),
  date: z.string().optional(),
  categoryId: z.string().nullable().optional(),
  dependentId: z.string().nullable().optional(),
  resolved: z.boolean().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accountId = getAuthFromCookie(request)
    if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const { id } = await params
    const data = await prisma.unexpecteds.findFirst({
      where: { id, account_id: accountId },
    })

    if (!data) {
      return NextResponse.json({ error: 'Unexpected expense not found' }, { status: 404 })
    }

    let category = null
    let dependent = null
    if (data.category_id) {
      const cat = await prisma.categories.findUnique({ where: { id: data.category_id }, select: { id: true, name: true, icon: true, color: true } })
      if (cat) category = keysToCamel(cat)
    }
    if (data.dependent_id) {
      const dep = await prisma.dependents.findUnique({ where: { id: data.dependent_id }, select: { id: true, name: true, relationship: true } })
      if (dep) dependent = keysToCamel(dep)
    }

    const unexpected = { ...keysToCamel(data), category, dependent }

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
    const accountId = getAuthFromCookie(request)
    if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const { id } = await params
    const body = await request.json()
    const parsed = unexpectedUpdateSchema.parse(body)

    const existing = await prisma.unexpecteds.findFirst({
      where: { id, account_id: accountId },
      select: { id: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Unexpected expense not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (parsed.amount !== undefined) updateData.amount = parsed.amount
    if (parsed.description !== undefined) updateData.description = parsed.description
    if (parsed.date !== undefined) updateData.date = parsed.date
    if (parsed.categoryId !== undefined) updateData.category_id = parsed.categoryId
    if (parsed.dependentId !== undefined) updateData.dependent_id = parsed.dependentId
    if (parsed.resolved !== undefined) updateData.resolved = parsed.resolved

    const data = await prisma.unexpecteds.update({
      where: { id },
      data: updateData,
    })

    let category = null
    let dependent = null
    if (data.category_id) {
      const cat = await prisma.categories.findUnique({ where: { id: data.category_id }, select: { id: true, name: true, icon: true, color: true } })
      if (cat) category = keysToCamel(cat)
    }
    if (data.dependent_id) {
      const dep = await prisma.dependents.findUnique({ where: { id: data.dependent_id }, select: { id: true, name: true, relationship: true } })
      if (dep) dependent = keysToCamel(dep)
    }

    const unexpected = { ...keysToCamel(data), category, dependent }

    return NextResponse.json({ unexpected })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('Update unexpected error:', error)
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

    const existing = await prisma.unexpecteds.findFirst({
      where: { id, account_id: accountId },
      select: { id: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Unexpected expense not found' }, { status: 404 })
    }

    await prisma.unexpecteds.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
