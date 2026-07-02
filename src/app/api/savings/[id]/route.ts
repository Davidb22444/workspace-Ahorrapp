import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { getAuthFromCookie } from '@/lib/auth-utils'

const savingsUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  targetAmount: z.number().positive().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  deadline: z.string().nullable().optional(),
  status: z.string().optional(),
})

function snakeToCamel(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    result[camelKey] = value
  }
  return result
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accountId = getAuthFromCookie(request)
    if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const { id } = await params

    const goal = await prisma.savings_goals.findFirst({
      where: { id, account_id: accountId },
    })

    if (!goal) {
      return NextResponse.json({ error: 'Savings goal not found' }, { status: 404 })
    }

    const contributions = await prisma.savings_contributions.findMany({
      where: { goal_id: id },
      orderBy: { date: 'desc' },
    })

    if (!contributions) {
      return NextResponse.json({ error: 'Failed to fetch contributions' }, { status: 500 })
    }

    const camelGoal = snakeToCamel(goal as unknown as Record<string, unknown>) as {
      targetAmount: number
      savedAmount: number
    } & Record<string, unknown>
    const targetAmount = Number(camelGoal.targetAmount)
    const savedAmount = Number(camelGoal.savedAmount)

    return NextResponse.json({
      savingsGoal: {
        ...camelGoal,
        progress: targetAmount > 0
          ? Number(((savedAmount / targetAmount) * 100).toFixed(1))
          : 0,
        remaining: Number(Math.max(0, targetAmount - savedAmount).toFixed(2)),
        contributions: (contributions || []).map((c) =>
          snakeToCamel(c as unknown as Record<string, unknown>)
        ),
      },
    })
  } catch (error) {
    console.error('Get savings error:', error)
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
    const parsed = savingsUpdateSchema.parse(body)

    const existing = await prisma.savings_goals.findFirst({
      where: { id, account_id: accountId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Savings goal not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (parsed.name !== undefined) updateData.name = parsed.name
    if (parsed.targetAmount !== undefined) updateData.target_amount = parsed.targetAmount
    if (parsed.icon !== undefined) updateData.icon = parsed.icon
    if (parsed.color !== undefined) updateData.color = parsed.color
    if (parsed.deadline !== undefined) updateData.deadline = parsed.deadline
    if (parsed.status !== undefined) updateData.status = parsed.status

    const goal = await prisma.savings_goals.update({
      where: { id },
      data: updateData,
    })

    const camelGoal = snakeToCamel(goal as unknown as Record<string, unknown>)

    return NextResponse.json({ savingsGoal: camelGoal })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('Update savings error:', error)
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

    const existing = await prisma.savings_goals.findFirst({
      where: { id, account_id: accountId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Savings goal not found' }, { status: 404 })
    }

    await prisma.savings_contributions.deleteMany({ where: { goal_id: id } })
    await prisma.savings_goals.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete savings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
