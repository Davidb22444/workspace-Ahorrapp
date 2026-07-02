import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromCookie } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { rowsToCamel, keysToCamel } from '@/lib/supabase-utils'
import { z } from 'zod'

const notificationCreateSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  type: z.string().default('info'),
  link: z.string().optional(),
})

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

    const where: any = { account_id: accountId }
    if (isRead !== null) {
      where.is_read = isRead === 'true'
    }
    if (type) {
      where.type = type
    }

    const data = await prisma.notifications.findMany({
      where,
      orderBy: { created_at: 'desc' },
      ...(limit ? { take: parseInt(limit, 10) } : {}),
    })

    const notifications = rowsToCamel(data)

    const unreadCount = await prisma.notifications.count({
      where: { account_id: accountId, is_read: false },
    })

    return NextResponse.json({ notifications, unreadCount })
  } catch (error) {
    console.error('List notifications error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const accountId = getAuthFromCookie(request)
    if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const result = await prisma.notifications.updateMany({
      where: { account_id: accountId, is_read: false },
      data: { is_read: true },
    })

    return NextResponse.json({ updated: result.count })
  } catch (error) {
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

    const data = await prisma.notifications.create({
      data: {
        title: parsed.title,
        message: parsed.message,
        type: parsed.type,
        ...(parsed.link && { link: parsed.link }),
        account_id: accountId,
      },
    })

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
