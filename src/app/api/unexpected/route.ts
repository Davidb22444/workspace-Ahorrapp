import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromCookie } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { rowsToCamel, keysToCamel } from '@/lib/supabase-utils'
import { z } from 'zod'

const unexpectedCreateSchema = z.object({
  amount: z.number().positive(),
  description: z.string().min(1),
  date: z.string().optional(),
  categoryId: z.string().optional(),
  dependentId: z.string().optional(),
  resolved: z.boolean().default(false),
})

export async function GET(request: NextRequest) {
  try {
    const accountId = getAuthFromCookie(request)
    const { searchParams } = new URL(request.url)
    const resolved = searchParams.get('resolved')
    const categoryId = searchParams.get('categoryId')

    if (!accountId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const where: any = { account_id: accountId }
    if (resolved !== null) {
      where.resolved = resolved === 'true'
    }
    if (categoryId) {
      where.category_id = categoryId
    }

    const rawUnexpecteds = await prisma.unexpecteds.findMany({
      where,
      orderBy: { date: 'desc' },
    })

    const unexpecteds = rowsToCamel(rawUnexpecteds)

    const categoryIds = [...new Set(unexpecteds.map((u: any) => u.categoryId).filter(Boolean))] as string[]
    const dependentIds = [...new Set(unexpecteds.map((u: any) => u.dependentId).filter(Boolean))] as string[]

    const [cats, deps] = await Promise.all([
      categoryIds.length > 0
        ? prisma.categories.findMany({ where: { id: { in: categoryIds } }, select: { id: true, name: true, icon: true, color: true } })
        : Promise.resolve([]),
      dependentIds.length > 0
        ? prisma.dependents.findMany({ where: { id: { in: dependentIds } }, select: { id: true, name: true, relationship: true } })
        : Promise.resolve([]),
    ])

    const catMap = new Map(cats.map((c: any) => [c.id, c]))
    const depMap = new Map(deps.map((d: any) => [d.id, d]))

    const enriched = unexpecteds.map((u: any) => ({
      ...u,
      category: u.categoryId ? keysToCamel(catMap.get(u.categoryId) || {}) : null,
      dependent: u.dependentId ? keysToCamel(depMap.get(u.dependentId) || {}) : null,
    }))

    const total = enriched.reduce((sum: number, u: any) => sum + (u.amount || 0), 0)

    return NextResponse.json({ unexpecteds: enriched, total: Number(total.toFixed(2)) })
  } catch (error) {
    console.error('List unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const accountId = getAuthFromCookie(request)
    if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = await request.json()
    const parsed = unexpectedCreateSchema.parse(body)

    const data = await prisma.unexpecteds.create({
      data: {
        amount: parsed.amount,
        description: parsed.description,
        date: parsed.date || new Date().toISOString(),
        resolved: parsed.resolved,
        ...(parsed.categoryId && { category_id: parsed.categoryId }),
        ...(parsed.dependentId && { dependent_id: parsed.dependentId }),
        account_id: accountId,
      },
    })

    try {
      await prisma.movements.create({
        data: {
          type: 'unexpected',
          amount: data.amount,
          description: `Imprevisto: ${data.description}`,
          date: data.date,
          category_id: data.category_id,
          account_id: data.account_id,
        },
      })
    } catch (movError) {
      await prisma.unexpecteds.delete({ where: { id: data.id } })
      console.error('Create movement error:', movError)
      return NextResponse.json({ error: 'Failed to create movement' }, { status: 500 })
    }

    const unexpected = keysToCamel(data)

    return NextResponse.json({ unexpected }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('Create unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
