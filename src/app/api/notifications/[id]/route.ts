import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { keysToCamel } from '@/lib/supabase-utils'
import { getAuthFromCookie } from '@/lib/auth-utils'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accountId = getAuthFromCookie(request)
    if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const { id } = await params

    // Check existence first
    const { data: existing, error: fetchError } = await supabase
      .from('notifications')
      .select('id')
      .eq('id', id)
      .eq('account_id', accountId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('account_id', accountId)
      .select()
      .single()

    if (error) {
      console.error('Mark notification read error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    const notification = keysToCamel(data)

    return NextResponse.json({ notification })
  } catch (error) {
    console.error('Mark notification read error:', error)
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
    const { error } = await supabase.from('notifications').delete().eq('id', id).eq('account_id', accountId)

    if (error) {
      console.error('Delete notification error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete notification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
