import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthFromCookie } from '@/lib/auth-utils'
import { rowsToCamel, keysToCamel } from '@/lib/supabase-utils'
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

    const yearStart = new Date(year, 0, 1)
    const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999)

    const [
      incomes,
      expenses,
      unexpecteds,
      savingsContributions,
      debtPayments,
      savingsGoals,
    ] = await Promise.all([
      prisma.incomes.findMany({
        where: { account_id: accountId, date: { gte: yearStart, lte: yearEnd } },
        select: { amount: true, date: true, source: true, category_id: true },
      }),
      prisma.expenses.findMany({
        where: { account_id: accountId, date: { gte: yearStart, lte: yearEnd } },
        select: { amount: true, date: true, category_id: true },
      }),
      prisma.unexpecteds.findMany({
        where: { account_id: accountId, date: { gte: yearStart, lte: yearEnd } },
        select: { amount: true, date: true },
      }),
      prisma.savings_contributions.findMany({
        where: { account_id: accountId, date: { gte: yearStart, lte: yearEnd } },
        select: { amount: true, date: true },
      }),
      prisma.debt_payments.findMany({
        where: { account_id: accountId, date: { gte: yearStart, lte: yearEnd } },
        select: { amount: true, date: true },
      }),
      prisma.savings_goals.findMany({
        where: { account_id: accountId },
        select: { name: true, saved_amount: true, target_amount: true, color: true },
      }),
    ])

    type ExpenseRow = Record<string, unknown> & { categoryId?: string; amount?: number }
    type IncomeRow = Record<string, unknown> & { categoryId?: string; amount?: number; source?: string }

    const incomesCamel = rowsToCamel<IncomeRow>(incomes)
    const expensesCamel = rowsToCamel<ExpenseRow>(expenses)
    const unexpectedsCamel = rowsToCamel(unexpecteds)
    const savingsContributionsCamel = rowsToCamel(savingsContributions)
    const debtPaymentsCamel = rowsToCamel(debtPayments)
    const savingsGoalsCamel = rowsToCamel(savingsGoals)

    const expCatIds = [...new Set(expensesCamel.map((e: any) => e.categoryId).filter(Boolean))] as string[]
    const incCatIds = [...new Set(incomesCamel.map((i: any) => i.categoryId).filter(Boolean))] as string[]
    const allCatIds = [...new Set([...expCatIds, ...incCatIds])]

    let catMap = new Map<string, any>()
    if (allCatIds.length > 0) {
      const cats = await prisma.categories.findMany({ where: { id: { in: allCatIds } }, select: { id: true, name: true, color: true } })
      if (cats) catMap = new Map(cats.map((c: any) => [c.id, c]))
    }

    const monthlyBreakdown = MONTH_LABELS.map((month, idx) => {
      const monthStart = startOfMonth(new Date(year, idx))
      const monthEnd = endOfMonth(new Date(year, idx))

      const monthIncome = incomesCamel
        .filter((i: any) => new Date(i.date) >= monthStart && new Date(i.date) <= monthEnd)
        .reduce((s: number, i: any) => s + (i.amount || 0), 0)

      const monthExpenses = expensesCamel
        .filter((e: any) => new Date(e.date) >= monthStart && new Date(e.date) <= monthEnd)
        .reduce((s: number, e: any) => s + (e.amount || 0), 0)

      const monthUnexpected = unexpectedsCamel
        .filter((u: any) => new Date(u.date) >= monthStart && new Date(u.date) <= monthEnd)
        .reduce((s: number, u: any) => s + (u.amount || 0), 0)

      const monthSavings = savingsContributionsCamel
        .filter((c: any) => new Date(c.date) >= monthStart && new Date(c.date) <= monthEnd)
        .reduce((s: number, c: any) => s + (c.amount || 0), 0)

      const monthDebt = debtPaymentsCamel
        .filter((d: any) => new Date(d.date) >= monthStart && new Date(d.date) <= monthEnd)
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

    const totalIncome = incomesCamel.reduce((s: number, i: any) => s + (i.amount || 0), 0)
    const totalExpenses = expensesCamel.reduce((s: number, e: any) => s + (e.amount || 0), 0)
    const totalUnexpected = unexpectedsCamel.reduce((s: number, u: any) => s + (u.amount || 0), 0)
    const totalSaved = savingsContributionsCamel.reduce((s: number, c: any) => s + (c.amount || 0), 0)
    const totalDebtPaid = debtPaymentsCamel.reduce((s: number, d: any) => s + (d.amount || 0), 0)
    const netSavings = totalIncome - totalExpenses - totalUnexpected
    const savingsRate = totalIncome > 0 ? netSavings / totalIncome : 0

    const categoryMap = new Map<string, { amount: number; color: string }>()
    for (const exp of expensesCamel) {
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

    const sourceMap = new Map<string, number>()
    for (const inc of incomesCamel) {
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

    const savingsGoalsProgress = savingsGoalsCamel.map((goal: any) => ({
      name: goal.name,
      saved: Number((goal.savedAmount || 0).toFixed(2)),
      target: Number((goal.targetAmount || 0).toFixed(2)),
      color: goal.color || '#10b981',
    }))

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