import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthFromCookie } from '@/lib/auth-utils'
import { rowsToCamel } from '@/lib/supabase-utils'

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
    const accountId = getAuthFromCookie(request)
    if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    // Build date filters
    const dateFilters: string[] = []
    if (from) dateFilters.push(`date.gte.${from}`)
    if (to) dateFilters.push(`date.lte.${to}`)

    let csvContent = ''

    if (type === 'income') {
      let query = supabase
        .from('incomes')
        .select('date, source, description, amount, frequency, category_id')
        .eq('account_id', accountId)
        .order('date', { ascending: false })

      if (from) query = query.gte('date', from)
      if (to) query = query.lte('date', to)

      const { data, error } = await query
      if (error) throw error

      // Fetch category names
      const catIds = [...new Set((data || []).map((r: any) => r.category_id).filter(Boolean))] as string[]
      let catMap = new Map<string, string>()
      if (catIds.length > 0) {
        const { data: cats } = await supabase.from('categories').select('id, name').in('id', catIds)
        if (cats) catMap = new Map(cats.map((c: any) => [c.id, c.name]))
      }

      csvContent = 'Date,Source,Description,Amount,Frequency\n'
      for (const inc of data || []) {
        const date = new Date(inc.date).toLocaleDateString('en-US')
        const source = escapeCSV(inc.source)
        const desc = escapeCSV(inc.description || '')
        const amount = escapeCSV(formatUSD(inc.amount))
        const freq = escapeCSV(inc.frequency || 'one-time')
        csvContent += `${date},${source},${desc},${amount},${freq}\n`
      }
    } else if (type === 'expense') {
      let query = supabase
        .from('expenses')
        .select('date, description, amount, is_recurring, frequency, category_id')
        .eq('account_id', accountId)
        .order('date', { ascending: false })

      if (from) query = query.gte('date', from)
      if (to) query = query.lte('date', to)

      const { data, error } = await query
      if (error) throw error

      // Fetch category names
      const catIds = [...new Set((data || []).map((r: any) => r.category_id).filter(Boolean))] as string[]
      let catMap = new Map<string, string>()
      if (catIds.length > 0) {
        const { data: cats } = await supabase.from('categories').select('id, name').in('id', catIds)
        if (cats) catMap = new Map(cats.map((c: any) => [c.id, c.name]))
      }

      csvContent = 'Date,Category,Description,Amount,Recurring,Frequency\n'
      for (const exp of data || []) {
        const date = new Date(exp.date).toLocaleDateString('en-US')
        const cat = escapeCSV(exp.category_id ? (catMap.get(exp.category_id) || 'uncategorized') : 'uncategorized')
        const desc = escapeCSV(exp.description || '')
        const amount = escapeCSV(formatUSD(exp.amount))
        const recurring = escapeCSV(exp.is_recurring ? 'Yes' : 'No')
        const freq = escapeCSV(exp.frequency || 'one-time')
        csvContent += `${date},${cat},${desc},${amount},${recurring},${freq}\n`
      }
    } else {
      // type === 'all'
      const [incomeQuery, expenseQuery] = await Promise.all([
        (() => {
          let q = supabase
            .from('incomes')
            .select('date, source, description, amount, category_id')
            .eq('account_id', accountId)
            .order('date', { ascending: false })
          if (from) q = q.gte('date', from)
          if (to) q = q.lte('date', to)
          return q
        })(),
        (() => {
          let q = supabase
            .from('expenses')
            .select('date, description, amount, category_id')
            .eq('account_id', accountId)
            .order('date', { ascending: false })
          if (from) q = q.gte('date', from)
          if (to) q = q.lte('date', to)
          return q
        })(),
      ])

      const [incomeData, expenseData] = await Promise.all([incomeQuery, expenseQuery])
      if (incomeData.error) throw incomeData.error
      if (expenseData.error) throw expenseData.error

      // Fetch category names
      const allCatIds = [...new Set([
        ...(incomeData.data || []).map((r: any) => r.category_id).filter(Boolean),
        ...(expenseData.data || []).map((r: any) => r.category_id).filter(Boolean),
      ])] as string[]

      let catMap = new Map<string, string>()
      if (allCatIds.length > 0) {
        const { data: cats } = await supabase.from('categories').select('id, name').in('id', allCatIds)
        if (cats) catMap = new Map(cats.map((c: any) => [c.id, c.name]))
      }

      const allRows: Array<{ date: string; type: string; category: string; description: string; amount: number }> = []

      for (const inc of incomeData.data || []) {
        allRows.push({
          date: inc.date,
          type: 'Income',
          category: inc.category_id ? (catMap.get(inc.category_id) || inc.source || 'uncategorized') : (inc.source || 'uncategorized'),
          description: inc.description || '',
          amount: inc.amount,
        })
      }

      for (const exp of expenseData.data || []) {
        allRows.push({
          date: exp.date,
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