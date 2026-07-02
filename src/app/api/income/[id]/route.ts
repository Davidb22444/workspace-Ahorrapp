import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { keysToCamel } from '@/lib/supabase-utils'
import { z } from 'zod'
import { getAuthFromCookie } from '@/lib/auth-utils'

const incomeUpdateSchema = z.object({
  source: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  description: z.string().optional(),
  frequency: z.string().optional(),
  date: z.string().optional(),
  categoryId: z.string().nullable().optional(),
})

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const accountId = getAuthFromCookie(request)
    if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const { id } = await params
    const data = await prisma.incomes.findFirst({ where: { id, account_id: accountId } })
    if (!data) return NextResponse.json({ error: 'Income not found' }, { status: 404 })
    return NextResponse.json({ income: keysToCamel(data) })
  } catch (error) {
    console.error('Get income error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const accountId = getAuthFromCookie(request)
    if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const { id } = await params
    const body = await request.json()
    const parsed = incomeUpdateSchema.parse(body)

    const existing = await prisma.incomes.findFirst({ where: { id, account_id: accountId } })
    if (!existing) return NextResponse.json({ error: 'Income not found' }, { status: 404 })

    const updateData: Record<string, any> = {}
    if (parsed.source !== undefined) updateData.source = parsed.source
    if (parsed.amount !== undefined) updateData.amount = parsed.amount
    if (parsed.description !== undefined) updateData.description = parsed.description
    if (parsed.frequency !== undefined) updateData.frequency = parsed.frequency
    if (parsed.date !== undefined) updateData.date = parsed.date
    if (parsed.categoryId !== undefined) updateData.category_id = parsed.categoryId

    const data = await prisma.incomes.update({ where: { id }, data: updateData })

    return NextResponse.json({ income: keysToCamel(data) })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('Update income error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const accountId = getAuthFromCookie(request)
    if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const { id } = await params

    const existing = await prisma.incomes.findFirst({ where: { id, account_id: accountId } })
    if (!existing) return NextResponse.json({ error: 'Income not found' }, { status: 404 })

    await prisma.incomes.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete income error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
