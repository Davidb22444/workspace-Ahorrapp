import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { rowsToCamel, keysToCamel } from '@/lib/supabase-utils'
import { z } from 'zod'

const unexpectedCreateSchema = z.object({
  amount: z.number().positive(),
  description: z.string().min(1),
  date: z.string().optional(),
  categoryId: z.string().optional(),
  dependentId: z.string().optional(),
  resolved: z.boolean().default(false),
  accountId: z.string().min(1),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const resolved = searchParams.get('resolved')
    const categoryId = searchParams.get('categoryId')

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
    }

    let query = supabase
      .from('unexpecteds')
      .select('*')
      .eq('account_id', accountId)
      .order('date', { ascending: false })

    if (resolved !== null) {
      query = query.eq('resolved', resolved === 'true')
    }
    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    const { data: rawUnexpecteds, error } = await query

    if (error) {
      console.error('List unexpected error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    const unexpecteds = rowsToCamel(rawUnexpecteds || [])

    // Fetch related categories and dependents for enrichment
    const categoryIds = [...new Set(unexpecteds.map((u: any) => u.categoryId).filter(Boolean))] as string[]
    const dependentIds = [...new Set(unexpecteds.map((u: any) => u.dependentId).filter(Boolean))] as string[]

    const [catRes, depRes] = await Promise.all([
      categoryIds.length > 0
        ? supabase.from('categories').select('id, name, icon, color').in('id', categoryIds)
        : { data: [] },
      dependentIds.length > 0
        ? supabase.from('dependents').select('id, name, relationship').in('id', dependentIds)
        : { data: [] },
    ])

    const catMap = new Map((catRes.data || []).map((c: any) => [c.id, c]))
    const depMap = new Map((depRes.data || []).map((d: any) => [d.id, d]))

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
    const body = await request.json()
    const parsed = unexpectedCreateSchema.parse(body)

    const insertData: Record<string, unknown> = {
      amount: parsed.amount,
      description: parsed.description,
      date: parsed.date || new Date().toISOString(),
      resolved: parsed.resolved,
      account_id: parsed.accountId,
    }
    if (parsed.categoryId) insertData.category_id = parsed.categoryId
    if (parsed.dependentId) insertData.dependent_id = parsed.dependentId

    const { data, error } = await supabase
      .from('unexpecteds')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Create unexpected error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    // Create movement record
    await supabase.from('movements').insert({
      type: 'unexpected',
      amount: data.amount,
      description: `Imprevisto: ${data.description}`,
      date: data.date,
      category_id: data.category_id,
      account_id: data.account_id,
    })

    const unexpected = keysToCamel(data)

    return NextResponse.json({ unexpected }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    console.error('Create unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}