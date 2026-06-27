import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromCookie } from '@/lib/auth-utils'
import { supabase } from '@/lib/supabase'
import { rowsToCamel, keysToCamel } from '@/lib/supabase-utils'
import { z } from 'zod'

const notificationCreateSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  type: z.string().default('info'),
  link: z.string().optional(),
})

const markAllReadSchema = z.object({})

export async function GET(request: NextRequest) {
  try {
    const accountId = getAuthFromCookie(request)
    const { searchParams } = new URL(request.url)
    const isRead = searchParams.get('isRead')
    const type = searchParams.get('type')
    const limit = searchParams.get('limit')

    if (!accountId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })

    if (isRead !== null) {
      query = query.eq('is_read', isRead === 'true')
    }
    if (type) {
      query = query.eq('type', type)
    }
    if (limit) {
      query = query.limit(parseInt(limit, 10))
    }

    const { data, error } = await query

    if (error) {
      console.error('List notifications error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    const notifications = rowsToCamel(data || [])

    // Count unread
    const { count: unreadCount, error: countError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .eq('is_read', false)

    if (countError) {
      console.error('Count unread error:', countError)
    }

    return NextResponse.json({ notifications, unreadCount: unreadCount || 0 })
  } catch (error) {
    console.error('List notifications error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const accountId = getAuthFromCookie(request)
    if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('account_id', accountId)
      .eq('is_read', false)
      .select()

    if (error) {
      console.error('Mark all read error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    return NextResponse.json({ updated: data?.length || 0 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('Mark all read error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const accountId = getAuthFromCookie(request)
    if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = await request.json()
    const parsed = notificationCreateSchema.parse(body)

    const insertData: Record<string, unknown> = {
      title: parsed.title,
      message: parsed.message,
      type: parsed.type,
      account_id: accountId,
    }
    if (parsed.link) insertData.link = parsed.link

    const { data, error } = await supabase
      .from('notifications')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Create notification error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    const notification = keysToCamel(data)

    return NextResponse.json({ notification }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('Create notification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
