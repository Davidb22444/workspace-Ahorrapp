import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthFromCookie } from '@/lib/auth-utils'

function escapeCSV(value: string): string {
  const cleaned = value.startsWith('=') || value.startsWith('+') || value.startsWith('-') || value.startsWith('@')
    ? `'${value}`
    : value
  if (cleaned.includes(',') || cleaned.includes('"') || cleaned.includes('\n')) {
    return `"${cleaned.replace(/"/g, '""')}"`
  }
  return cleaned
}

function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export async function GET(request: NextRequest) {
  try {
    const accountId = getAuthFromCookie(request)
    if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const dateFilter: Record<string, Date> = {}
    if (from) { const d = new Date(from); if (!isNaN(d.getTime())) dateFilter.gte = d }
    if (to) { const d = new Date(to); if (!isNaN(d.getTime())) dateFilter.lte = d }
    const hasDateFilter = from || to

    let csvContent = ''

    if (type === 'income') {
      const incomeWhere: any = { account_id: accountId }
      if (hasDateFilter) incomeWhere.date = dateFilter

      const data = await prisma.incomes.findMany({
        where: incomeWhere,
        select: { date: true, source: true, description: true, amount: true, frequency: true, category_id: true },
        orderBy: { date: 'desc' },
      })

      const catIds = [...new Set(data.map((r: any) => r.category_id).filter(Boolean))] as string[]
      let catMap = new Map<string, string>()
      if (catIds.length > 0) {
        const cats = await prisma.categories.findMany({ where: { id: { in: catIds } }, select: { id: true, name: true } })
        if (cats) catMap = new Map(cats.map((c: any) => [c.id, c.name]))
      }

      csvContent = 'Date,Source,Description,Amount,Frequency\n'
      for (const inc of data) {
        const date = new Date(inc.date).toLocaleDateString('en-US')
        const source = escapeCSV(inc.source)
        const desc = escapeCSV(inc.description || '')
        const amount = escapeCSV(formatUSD(inc.amount))
        const freq = escapeCSV(inc.frequency || 'one-time')
        csvContent += `${date},${source},${desc},${amount},${freq}\n`
      }
    } else if (type === 'expense') {
      const expenseWhere: any = { account_id: accountId }
      if (hasDateFilter) expenseWhere.date = dateFilter

      const data = await prisma.expenses.findMany({
        where: expenseWhere,
        select: { date: true, description: true, amount: true, is_recurring: true, frequency: true, category_id: true },
        orderBy: { date: 'desc' },
      })

      const catIds = [...new Set(data.map((r: any) => r.category_id).filter(Boolean))] as string[]
      let catMap = new Map<string, string>()
      if (catIds.length > 0) {
        const cats = await prisma.categories.findMany({ where: { id: { in: catIds } }, select: { id: true, name: true } })
        if (cats) catMap = new Map(cats.map((c: any) => [c.id, c.name]))
      }

      csvContent = 'Date,Category,Description,Amount,Recurring,Frequency\n'
      for (const exp of data) {
        const date = new Date(exp.date).toLocaleDateString('en-US')
        const cat = escapeCSV(exp.category_id ? (catMap.get(exp.category_id) || 'uncategorized') : 'uncategorized')
        const desc = escapeCSV(exp.description || '')
        const amount = escapeCSV(formatUSD(exp.amount))
        const recurring = escapeCSV(exp.is_recurring ? 'Yes' : 'No')
        const freq = escapeCSV(exp.frequency || 'one-time')
        csvContent += `${date},${cat},${desc},${amount},${recurring},${freq}\n`
      }
    } else {
      const incomeWhere: any = { account_id: accountId }
      const expenseWhere: any = { account_id: accountId }
      if (hasDateFilter) {
        incomeWhere.date = dateFilter
        expenseWhere.date = dateFilter
      }

      const [incomeData, expenseData] = await Promise.all([
        prisma.incomes.findMany({
          where: incomeWhere,
          select: { date: true, source: true, description: true, amount: true, category_id: true },
          orderBy: { date: 'desc' },
        }),
        prisma.expenses.findMany({
          where: expenseWhere,
          select: { date: true, description: true, amount: true, category_id: true },
          orderBy: { date: 'desc' },
        }),
      ])

      const allCatIds = [...new Set([
        ...incomeData.map((r: any) => r.category_id).filter(Boolean),
        ...expenseData.map((r: any) => r.category_id).filter(Boolean),
      ])] as string[]

      let catMap = new Map<string, string>()
      if (allCatIds.length > 0) {
        const cats = await prisma.categories.findMany({ where: { id: { in: allCatIds } }, select: { id: true, name: true } })
        if (cats) catMap = new Map(cats.map((c: any) => [c.id, c.name]))
      }

      const allRows: Array<{ date: string; type: string; category: string; description: string; amount: number }> = []

      for (const inc of incomeData) {
        allRows.push({
          date: inc.date.toISOString(),
          type: 'Income',
          category: inc.category_id ? (catMap.get(inc.category_id) || inc.source || 'uncategorized') : (inc.source || 'uncategorized'),
          description: inc.description || '',
          amount: inc.amount,
        })
      }

      for (const exp of expenseData) {
        allRows.push({
          date: exp.date.toISOString(),
          type: 'Expense',
          category: exp.category_id ? (catMap.get(exp.category_id) || 'uncategorized') : 'uncategorized',
          description: exp.description || '',
          amount: exp.amount,
        })
      }

      allRows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      csvContent = 'Date,Type,Category,Description,Amount\n'
      for (const row of allRows) {
        const date = new Date(row.date).toLocaleDateString('en-US')
        const t = escapeCSV(row.type)
        const cat = escapeCSV(row.category)
        const desc = escapeCSV(row.description)
        const amount = escapeCSV(formatUSD(row.amount))
        csvContent += `${date},${t},${cat},${desc},${amount}\n`
      }
    }

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="ahorrapp-export.csv"',
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}