import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { keysToCamel } from '@/lib/supabase-utils'
import { z } from 'zod'
import { getAuthFromCookie } from '@/lib/auth-utils'
import { createAuditLog } from '@/lib/security'

const expenseUpdateSchema = z.object({
  amount: z.number().positive().optional(),
  description: z.string().min(1).optional(),
  date: z.string().optional(),
  categoryId: z.string().nullable().optional(),
  dependentId: z.string().nullable().optional(),
  isRecurring: z.boolean().optional(),
  frequency: z.string().nullable().optional(),
})

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const accountId = getAuthFromCookie(request)
    if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const { id } = await params
    const data = await prisma.expenses.findFirst({ where: { id, account_id: accountId } })
    if (!data) return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    return NextResponse.json({ expense: keysToCamel(data) })
  } catch (error) {
    console.error('Get expense error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const accountId = getAuthFromCookie(request)
    if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const { id } = await params
    const body = await request.json()
    const parsed = expenseUpdateSchema.parse(body)

    const existing = await prisma.expenses.findFirst({ where: { id, account_id: accountId } })
    if (!existing) return NextResponse.json({ error: 'Expense not found' }, { status: 404 })

    const u: Record<string, any> = {}
    if (parsed.amount !== undefined) u.amount = parsed.amount
    if (parsed.description !== undefined) u.description = parsed.description
    if (parsed.date !== undefined) u.date = parsed.date
    if (parsed.categoryId !== undefined) u.category_id = parsed.categoryId
    if (parsed.dependentId !== undefined) u.dependent_id = parsed.dependentId
    if (parsed.isRecurring !== undefined) u.is_recurring = parsed.isRecurring
    if (parsed.frequency !== undefined) u.frequency = parsed.frequency

    const data = await prisma.expenses.update({ where: { id }, data: u })

    createAuditLog({
      action: 'UPDATE',
      entity: 'expense',
      entityId: id,
      details: `Gasto actualizado`,
      accountId,
    })

    return NextResponse.json({ expense: keysToCamel(data) })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('Update expense error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const accountId = getAuthFromCookie(request)
    if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const { id } = await params

    const existing = await prisma.expenses.findFirst({ where: { id, account_id: accountId } })
    if (!existing) return NextResponse.json({ error: 'Expense not found' }, { status: 404 })

    await prisma.expenses.delete({ where: { id } })

    createAuditLog({
      action: 'DELETE',
      entity: 'expense',
      entityId: id,
      details: `Gasto eliminado: $${existing.amount} - ${existing.description}`,
      accountId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete expense error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
