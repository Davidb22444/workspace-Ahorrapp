import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const notificationCreateSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  type: z.string().default('info'),
  link: z.string().optional(),
  accountId: z.string().min(1),
})

const markAllReadSchema = z.object({
  accountId: z.string().min(1),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const isRead = searchParams.get('isRead')
    const type = searchParams.get('type')
    const limit = searchParams.get('limit')

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
    }

    const where: Record<string, unknown> = { accountId }
    if (isRead !== null) where.isRead = isRead === 'true'
    if (type) where.type = type

    const notifications = await db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit, 10) : undefined,
    })

    const unreadCount = await db.notification.count({
      where: { accountId, isRead: false },
    })

    return NextResponse.json({ notifications, unreadCount })
  } catch (error) {
    console.error('List notifications error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = markAllReadSchema.parse(body)

    // Mark all as read for this account
    const result = await db.notification.updateMany({
      where: { accountId: parsed.accountId, isRead: false },
      data: { isRead: true },
    })

    return NextResponse.json({ updated: result.count })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    console.error('Mark all read error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = notificationCreateSchema.parse(body)

    const notification = await db.notification.create({
      data: {
        title: parsed.title,
        message: parsed.message,
        type: parsed.type,
        link: parsed.link,
        accountId: parsed.accountId,
      },
    })

    return NextResponse.json({ notification }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    console.error('Create notification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}