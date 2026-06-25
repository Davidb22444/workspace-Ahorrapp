import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const savingsUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  targetAmount: z.number().positive().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  deadline: z.string().nullable().optional(),
  status: z.string().optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const goal = await db.savingsGoal.findUnique({
      where: { id },
      include: {
        contributions: {
          orderBy: { date: 'desc' },
        },
      },
    })

    if (!goal) {
      return NextResponse.json({ error: 'Savings goal not found' }, { status: 404 })
    }

    return NextResponse.json({
      savingsGoal: {
        ...goal,
        progress: goal.targetAmount > 0
          ? Number(((goal.savedAmount / goal.targetAmount) * 100).toFixed(1))
          : 0,
        remaining: Number(Math.max(0, goal.targetAmount - goal.savedAmount).toFixed(2)),
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
    const { id } = await params
    const body = await request.json()
    const parsed = savingsUpdateSchema.parse(body)

    const data: Record<string, unknown> = { ...parsed }
    if (parsed.deadline !== undefined) {
      data.deadline = parsed.deadline ? new Date(parsed.deadline) : null
    }

    const goal = await db.savingsGoal.update({
      where: { id },
      data,
    })

    return NextResponse.json({ savingsGoal: goal })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    console.error('Update savings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.savingsGoal.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete savings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}