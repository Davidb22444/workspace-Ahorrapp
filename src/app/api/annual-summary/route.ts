import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthFromCookie } from '@/lib/auth-utils'
import { rowsToCamel, keysToCamel, sumField } from '@/lib/supabase-utils'
import { startOfMonth, endOfMonth, format } from 'date-fns'

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

const CATEGORY_COLORS = [
  '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6', '#06b6d4',
  '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#84cc16',
  '#22d3ee', '#a855f7',
]

export async function GET(request: NextRequest) {
  try {
    const accountId = getAuthFromCookie(request)
    if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const yearParam = searchParams.get('year')

    const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear()

    if (isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json(
        { error: 'Invalid year parameter' },
        { status: 400 }
      )
    }

    const yearStart = new Date(year, 0, 1).toISOString()
    const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999).toISOString()

    // Fetch all records for the year in parallel
    const [
      incomeRes,
      expenseRes,
      unexpectedRes,
      savingsContributionsRes,
      debtPaymentsRes,
      savingsGoalsRes,
    ] = await Promise.all([
      supabase
        .from('incomes')
        .select('amount, date, source, category_id')
        .eq('account_id', accountId)
        .gte('date', yearStart)
        .lte('date', yearEnd),
      supabase
        .from('expenses')
        .select('amount, date, category_id')
        .eq('account_id', accountId)
        .gte('date', yearStart)
        .lte('date', yearEnd),
      supabase
        .from('unexpecteds')
        .select('amount, date')
        .eq('account_id', accountId)
        .gte('date', yearStart)
        .lte('date', yearEnd),
      supabase
        .from('savings_contributions')
        .select('amount, date')
        .eq('account_id', accountId)
        .gte('date', yearStart)
        .lte('date', yearEnd),
      supabase
        .from('debt_payments')
        .select('amount, date')
        .eq('account_id', accountId)
        .gte('date', yearStart)
        .lte('date', yearEnd),
      supabase
        .from('savings_goals')
        .select('name, saved_amount, target_amount, color')
        .eq('account_id', accountId),
    ])

    type ExpenseRow = Record<string, unknown> & { categoryId?: string; amount?: number }
    type IncomeRow = Record<string, unknown> & { categoryId?: string; amount?: number; source?: string }

    const incomes = rowsToCamel<IncomeRow>(incomeRes.data || [])
    const expenses = rowsToCamel<ExpenseRow>(expenseRes.data || [])
    const unexpecteds = rowsToCamel(unexpectedRes.data || [])
    const savingsContributions = rowsToCamel(savingsContributionsRes.data || [])
    const debtPayments = rowsToCamel(debtPaymentsRes.data || [])
    const savingsGoals = rowsToCamel(savingsGoalsRes.data || [])

    // Fetch category info for expenses
    const expCatIds = [...new Set(expenses.map((e) => e.categoryId).filter(Boolean))]
    const incCatIds = [...new Set(incomes.map((i) => i.categoryId).filter(Boolean))]
    const allCatIds = [...new Set([...expCatIds, ...incCatIds])]

    let catMap = new Map<string, any>()
    if (allCatIds.length > 0) {
      const { data: cats } = await supabase.from('categories').select('id, name, color').in('id', allCatIds)
      if (cats) catMap = new Map(cats.map((c: any) => [c.id, c]))
    }

    // Monthly breakdown
    const monthlyBreakdown = MONTH_LABELS.map((month, idx) => {
      const monthStart = startOfMonth(new Date(year, idx))
      const monthEnd = endOfMonth(new Date(year, idx))
      const msISO = monthStart.toISOString()
      const meISO = monthEnd.toISOString()

      const monthIncome = incomes
        .filter((i: any) => i.date >= msISO && i.date <= meISO)
        .reduce((s: number, i: any) => s + (i.amount || 0), 0)

      const monthExpenses = expenses
        .filter((e: any) => e.date >= msISO && e.date <= meISO)
        .reduce((s: number, e: any) => s + (e.amount || 0), 0)

      const monthUnexpected = unexpecteds
        .filter((u: any) => u.date >= msISO && u.date <= meISO)
        .reduce((s: number, u: any) => s + (u.amount || 0), 0)

      const monthSavings = savingsContributions
        .filter((c: any) => c.date >= msISO && c.date <= meISO)
        .reduce((s: number, c: any) => s + (c.amount || 0), 0)

      const monthDebt = debtPayments
        .filter((d: any) => d.date >= msISO && d.date <= meISO)
        .reduce((s: number, d: any) => s + (d.amount || 0), 0)

      const net = monthIncome - monthExpenses - monthUnexpected

      return {
        month,
        income: Number(monthIncome.toFixed(2)),
        expenses: Number(monthExpenses.toFixed(2)),
        unexpected: Number(monthUnexpected.toFixed(2)),
        savings: Number(monthSavings.toFixed(2)),
        debtPayments: Number(monthDebt.toFixed(2)),
        net: Number(net.toFixed(2)),
      }
    })

    // Totals
    const totalIncome = incomes.reduce((s: number, i: any) => s + (i.amount || 0), 0)
    const totalExpenses = expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0)
    const totalUnexpected = unexpecteds.reduce((s: number, u: any) => s + (u.amount || 0), 0)
    const totalSaved = savingsContributions.reduce((s: number, c: any) => s + (c.amount || 0), 0)
    const totalDebtPaid = debtPayments.reduce((s: number, d: any) => s + (d.amount || 0), 0)
    const netSavings = totalIncome - totalExpenses - totalUnexpected
    const savingsRate = totalIncome > 0 ? netSavings / totalIncome : 0

    // Top expense categories
    const categoryMap = new Map<string, { amount: number; color: string }>()
    for (const exp of expenses) {
      const cat = exp.categoryId ? catMap.get(exp.categoryId) ?? null : null
      const name = cat?.name || 'Uncategorized'
      const color = cat?.color || '#94a3b8'
      const existing = categoryMap.get(name) || { amount: 0, color }
      existing.amount += exp.amount || 0
      categoryMap.set(name, existing)
    }

    const topExpenseCategories = Array.from(categoryMap.entries())
      .map(([name, data], idx) => ({
        name,
        amount: Number(data.amount.toFixed(2)),
        percentage: totalExpenses > 0 ? Number((data.amount / totalExpenses).toFixed(3)) : 0,
        color: data.color || CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
      }))
      .sort((a, b) => b.amount - a.amount)

    // Income sources
    const sourceMap = new Map<string, number>()
    for (const inc of incomes) {
      const src = inc.source || 'Unknown'
      const existing = sourceMap.get(src) || 0
      sourceMap.set(src, existing + (inc.amount || 0))
    }

    const incomeSources = Array.from(sourceMap.entries())
      .map(([source, amount], idx) => ({
        source,
        amount: Number(amount.toFixed(2)),
        percentage: totalIncome > 0 ? Number((amount / totalIncome).toFixed(3)) : 0,
        color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
      }))
      .sort((a, b) => b.amount - a.amount)

    // Savings goals progress
    const savingsGoalsProgress = savingsGoals.map((goal: any) => ({
      name: goal.name,
      saved: Number((goal.savedAmount || 0).toFixed(2)),
      target: Number((goal.targetAmount || 0).toFixed(2)),
      color: goal.color || '#10b981',
    }))

    // Month over month changes (skip first month since there's no prior)
    const monthOverMonth = monthlyBreakdown.slice(1).map((m, idx) => {
      const prev = monthlyBreakdown[idx]
      const incomeChange =
        prev.income > 0
          ? Number((((m.income - prev.income) / prev.income) * 100).toFixed(1))
          : m.income > 0
            ? 100
            : 0

      const expenseChange =
        prev.expenses > 0
          ? Number((((m.expenses - prev.expenses) / prev.expenses) * 100).toFixed(1))
          : m.expenses > 0
            ? 100
            : 0

      const savingsChange =
        prev.net > 0
          ? Number((((m.net - prev.net) / prev.net) * 100).toFixed(1))
          : m.net > 0
            ? 100
            : 0

      return {
        month: m.month,
        incomeChange,
        expenseChange,
        savingsChange,
      }
    })

    // Best and worst months by net savings
    let bestMonth: { month: string; netSavings: number } | null = null
    let worstMonth: { month: string; netSavings: number } | null = null

    for (const m of monthlyBreakdown) {
      if (!bestMonth || m.net > bestMonth.netSavings) {
        bestMonth = { month: m.month, netSavings: m.net }
      }
      if (!worstMonth || m.net < worstMonth.netSavings) {
        worstMonth = { month: m.month, netSavings: m.net }
      }
    }

    return NextResponse.json({
      year,
      totalIncome: Number(totalIncome.toFixed(2)),
      totalExpenses: Number(totalExpenses.toFixed(2)),
      totalUnexpected: Number(totalUnexpected.toFixed(2)),
      totalSaved: Number(totalSaved.toFixed(2)),
      totalDebtPaid: Number(totalDebtPaid.toFixed(2)),
      netSavings: Number(netSavings.toFixed(2)),
      savingsRate: Number(savingsRate.toFixed(3)),
      monthlyBreakdown,
      topExpenseCategories,
      incomeSources,
      savingsGoalsProgress,
      monthOverMonth,
      bestMonth,
      worstMonth,
    })
  } catch (error) {
    console.error('Annual summary error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}