import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { z } from 'zod'

const incomeUpdateSchema = z.object({
  source: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  description: z.string().optional(),
  frequency: z.string().optional(),
  date: z.string().optional(),
  categoryId: z.string().nullable().optional(),
})

function toCamel(row: Record<string, any>) {
  const r: Record<string, any> = {}
  for (const [k, v] of Object.entries(row)) {
    const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    r[camel] = v
  }
  return r
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { data, error } = await supabase.from('incomes').select('*').eq('id', id).single()
    if (error || !data) return NextResponse.json({ error: 'Income not found' }, { status: 404 })
    return NextResponse.json({ income: toCamel(data) })
  } catch (error) {
    console.error('Get income error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const parsed = incomeUpdateSchema.parse(body)

    const updateData: Record<string, any> = {}
    if (parsed.source !== undefined) updateData.source = parsed.source
    if (parsed.amount !== undefined) updateData.amount = parsed.amount
    if (parsed.description !== undefined) updateData.description = parsed.description
    if (parsed.frequency !== undefined) updateData.frequency = parsed.frequency
    if (parsed.date !== undefined) updateData.date = parsed.date
    if (parsed.categoryId !== undefined) updateData.category_id = parsed.categoryId

    const { data, error } = await supabase.from('incomes').update(updateData).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ income: toCamel(data) })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    console.error('Update income error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { error } = await supabase.from('incomes').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete income error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}