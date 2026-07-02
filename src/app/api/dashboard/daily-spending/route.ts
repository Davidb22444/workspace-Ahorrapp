import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthFromCookie } from '@/lib/auth-utils'
import { startOfMonth, endOfMonth, format, parse } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const accountId = getAuthFromCookie(request)
    if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const monthParam = searchParams.get('month')

    const now = new Date()
    const targetMonth = monthParam
      ? parse(monthParam, 'yyyy-MM', now)
      : now

    const start = startOfMonth(targetMonth)
    const end = endOfMonth(targetMonth)
    const daysInMonth = end.getDate()

    const [expenses, unexpecteds] = await Promise.all([
      prisma.expenses.findMany({
        where: { account_id: accountId, date: { gte: start, lte: end } },
        select: { date: true, amount: true },
      }),
      prisma.unexpecteds.findMany({
        where: { account_id: accountId, date: { gte: start, lte: end } },
        select: { date: true, amount: true },
      }),
    ])

    const dailyMap = new Map<string, number>()

    for (const e of expenses) {
      const dateKey = format(new Date(e.date), 'yyyy-MM-dd')
      dailyMap.set(dateKey, (dailyMap.get(dateKey) ?? 0) + (e.amount || 0))
    }

    for (const u of unexpecteds) {
      const dateKey = format(new Date(u.date), 'yyyy-MM-dd')
      dailyMap.set(dateKey, (dailyMap.get(dateKey) ?? 0) + (u.amount || 0))
    }

    const days: Array<{ date: string; amount: number }> = []
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = format(new Date(targetMonth.getFullYear(), targetMonth.getMonth(), d), 'yyyy-MM-dd')
      days.push({
        date: dateStr,
        amount: Number((dailyMap.get(dateStr) ?? 0).toFixed(2)),
      })
    }

    return NextResponse.json({ days })
  } catch (error) {
    console.error('Daily spending error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}