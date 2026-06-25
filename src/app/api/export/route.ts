import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const type = searchParams.get('type') || 'all'
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
    }

    const dateFilter: Record<string, unknown> = {}
    if (from) dateFilter.gte = new Date(from)
    if (to) dateFilter.lte = new Date(to)

    const baseWhere = { accountId, ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}) }

    let csvContent = ''

    if (type === 'income') {
      const incomes = await db.income.findMany({
        where: baseWhere,
        orderBy: { date: 'desc' },
        include: { category: { select: { name: true } } },
      })
      csvContent = 'Date,Source,Description,Amount,Frequency\n'
      for (const inc of incomes) {
        const date = new Date(inc.date).toLocaleDateString('en-US')
        const source = escapeCSV(inc.source)
        const desc = escapeCSV(inc.description || '')
        const amount = escapeCSV(formatUSD(inc.amount))
        const freq = escapeCSV(inc.frequency || 'one-time')
        csvContent += `${date},${source},${desc},${amount},${freq}\n`
      }
    } else if (type === 'expense') {
      const expenses = await db.expense.findMany({
        where: baseWhere,
        orderBy: { date: 'desc' },
        include: { category: { select: { name: true } } },
      })
      csvContent = 'Date,Category,Description,Amount,Recurring,Frequency\n'
      for (const exp of expenses) {
        const date = new Date(exp.date).toLocaleDateString('en-US')
        const cat = escapeCSV(exp.category?.name || exp.categoryId || 'uncategorized')
        const desc = escapeCSV(exp.description || '')
        const amount = escapeCSV(formatUSD(exp.amount))
        const recurring = escapeCSV(exp.isRecurring ? 'Yes' : 'No')
        const freq = escapeCSV(exp.frequency || 'one-time')
        csvContent += `${date},${cat},${desc},${amount},${recurring},${freq}\n`
      }
    } else {
      // type === 'all'
      const [incomes, expenses] = await Promise.all([
        db.income.findMany({
          where: baseWhere,
          orderBy: { date: 'desc' },
          include: { category: { select: { name: true } } },
        }),
        db.expense.findMany({
          where: baseWhere,
          orderBy: { date: 'desc' },
          include: { category: { select: { name: true } } },
        }),
      ])

      const allRows: Array<{ date: Date; type: string; category: string; description: string; amount: number }> = []

      for (const inc of incomes) {
        allRows.push({
          date: new Date(inc.date),
          type: 'Income',
          category: inc.category?.name || inc.source || 'uncategorized',
          description: inc.description || '',
          amount: inc.amount,
        })
      }

      for (const exp of expenses) {
        allRows.push({
          date: new Date(exp.date),
          type: 'Expense',
          category: exp.category?.name || 'uncategorized',
          description: exp.description || '',
          amount: exp.amount,
        })
      }

      allRows.sort((a, b) => b.date.getTime() - a.date.getTime())

      csvContent = 'Date,Type,Category,Description,Amount\n'
      for (const row of allRows) {
        const date = row.date.toLocaleDateString('en-US')
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