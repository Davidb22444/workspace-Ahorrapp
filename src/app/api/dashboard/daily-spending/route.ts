import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { startOfMonth, endOfMonth, format, parse } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const monthParam = searchParams.get('month')

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId is required' },
        { status: 400 }
      )
    }

    const now = new Date()
    const targetMonth = monthParam
      ? parse(monthParam, 'yyyy-MM', now)
      : now

    const start = startOfMonth(targetMonth)
    const end = endOfMonth(targetMonth)
    const daysInMonth = end.getDate()

    // Fetch all expenses for the month
    const expenses = await db.expense.findMany({
      where: {
        accountId,
        date: { gte: start, lte: end },
      },
      select: { date: true, amount: true },
    })

    // Fetch all unexpected expenses for the month
    const unexpecteds = await db.unexpected.findMany({
      where: {
        accountId,
        date: { gte: start, lte: end },
      },
      select: { date: true, amount: true },
    })

    // Group by date
    const dailyMap = new Map<string, number>()

    for (const e of expenses) {
      const dateKey = format(new Date(e.date), 'yyyy-MM-dd')
      dailyMap.set(dateKey, (dailyMap.get(dateKey) ?? 0) + e.amount)
    }

    for (const u of unexpecteds) {
      const dateKey = format(new Date(u.date), 'yyyy-MM-dd')
      dailyMap.set(dateKey, (dailyMap.get(dateKey) ?? 0) + u.amount)
    }

    // Build array with all days of the month
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