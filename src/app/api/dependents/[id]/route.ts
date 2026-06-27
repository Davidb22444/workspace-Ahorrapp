import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
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
    const { data, error } = await supabase
      .from('dependents')
      .select('*')
      .eq('id', id)
      .eq('account_id', accountId)
      .single()

    if (error || !data) {
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

    const updateData: Record<string, unknown> = {}
    if (parsed.name !== undefined) updateData.name = parsed.name
    if (parsed.relationship !== undefined) updateData.relationship = parsed.relationship
    if (parsed.economicWeight !== undefined) updateData.economic_weight = parsed.economicWeight
    if (parsed.birthDate !== undefined) updateData.birth_date = parsed.birthDate
    if (parsed.notes !== undefined) updateData.notes = parsed.notes

    const { data, error } = await supabase
      .from('dependents')
      .update(updateData)
      .eq('id', id)
      .eq('account_id', accountId)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Dependent not found' }, { status: 404 })
    }

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
    const { error } = await supabase.from('dependents').delete().eq('id', id).eq('account_id', accountId)

    if (error) {
      console.error('Delete dependent error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete dependent error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
