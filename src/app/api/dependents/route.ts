import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { rowsToCamel, keysToCamel } from '@/lib/supabase-utils'
import { z } from 'zod'

const dependentCreateSchema = z.object({
  name: z.string().min(1),
  relationship: z.string().default('other'),
  economicWeight: z.number().min(0).default(1.0),
  birthDate: z.string().optional(),
  notes: z.string().optional(),
  accountId: z.string().min(1),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('dependents')
      .select('*')
      .eq('account_id', accountId)
      .order('name', { ascending: true })

    if (error) {
      console.error('List dependents error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    const dependents = rowsToCamel(data || [])

    return NextResponse.json({ dependents })
  } catch (error) {
    console.error('List dependents error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = dependentCreateSchema.parse(body)

    const insertData: Record<string, unknown> = {
      name: parsed.name,
      relationship: parsed.relationship,
      economic_weight: parsed.economicWeight,
      birth_date: parsed.birthDate || null,
      notes: parsed.notes || null,
      account_id: parsed.accountId,
    }

    const { data, error } = await supabase
      .from('dependents')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Create dependent error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    const dependent = keysToCamel(data)

    return NextResponse.json({ dependent }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    console.error('Create dependent error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}