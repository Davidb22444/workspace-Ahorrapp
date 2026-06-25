import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { sumField } from '@/lib/supabase-utils'
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

    const startISO = start.toISOString()
    const endISO = end.toISOString()

    // Fetch all expenses for the month
    const { data: expenses } = await supabase
      .from('expenses')
      .select('date, amount')
      .eq('account_id', accountId)
      .gte('date', startISO)
      .lte('date', endISO)

    // Fetch all unexpected expenses for the month
    const { data: unexpecteds } = await supabase
      .from('unexpecteds')
      .select('date, amount')
      .eq('account_id', accountId)
      .gte('date', startISO)
      .lte('date', endISO)

    // Group by date
    const dailyMap = new Map<string, number>()

    for (const e of expenses || []) {
      const dateKey = format(new Date(e.date), 'yyyy-MM-dd')
      dailyMap.set(dateKey, (dailyMap.get(dateKey) ?? 0) + (e.amount || 0))
    }

    for (const u of unexpecteds || []) {
      const dateKey = format(new Date(u.date), 'yyyy-MM-dd')
      dailyMap.set(dateKey, (dailyMap.get(dateKey) ?? 0) + (u.amount || 0))
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