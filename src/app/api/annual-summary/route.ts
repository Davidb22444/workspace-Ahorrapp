import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
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
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const yearParam = searchParams.get('year')

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId is required' },
        { status: 400 }
      )
    }

    const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear()

    if (isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json(
        { error: 'Invalid year parameter' },
        { status: 400 }
      )
    }

    const yearStart = new Date(year, 0, 1)
    const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999)

    // Fetch all records for the year
    const [
      incomes,
      expenses,
      unexpecteds,
      savingsContributions,
      debtPayments,
      savingsGoals,
    ] = await Promise.all([
      db.income.findMany({
        where: { accountId, date: { gte: yearStart, lte: yearEnd } },
        include: { category: { select: { name: true } } },
      }),
      db.expense.findMany({
        where: { accountId, date: { gte: yearStart, lte: yearEnd } },
        include: { category: { select: { name: true, color: true } } },
      }),
      db.unexpected.findMany({
        where: { accountId, date: { gte: yearStart, lte: yearEnd } },
      }),
      db.savingsContribution.findMany({
        where: { accountId, date: { gte: yearStart, lte: yearEnd } },
      }),
      db.debtPayment.findMany({
        where: { accountId, date: { gte: yearStart, lte: yearEnd } },
      }),
      db.savingsGoal.findMany({
        where: { accountId },
        select: {
          name: true,
          savedAmount: true,
          targetAmount: true,
          color: true,
        },
      }),
    ])

    // Monthly breakdown
    const monthlyBreakdown = MONTH_LABELS.map((month, idx) => {
      const monthStart = startOfMonth(new Date(year, idx))
      const monthEnd = endOfMonth(new Date(year, idx))

      const monthIncome = incomes
        .filter((i) => i.date >= monthStart && i.date <= monthEnd)
        .reduce((s, i) => s + i.amount, 0)

      const monthExpenses = expenses
        .filter((e) => e.date >= monthStart && e.date <= monthEnd)
        .reduce((s, e) => s + e.amount, 0)

      const monthUnexpected = unexpecteds
        .filter((u) => u.date >= monthStart && u.date <= monthEnd)
        .reduce((s, u) => s + u.amount, 0)

      const monthSavings = savingsContributions
        .filter((c) => c.date >= monthStart && c.date <= monthEnd)
        .reduce((s, c) => s + c.amount, 0)

      const monthDebt = debtPayments
        .filter((d) => d.date >= monthStart && d.date <= monthEnd)
        .reduce((s, d) => s + d.amount, 0)

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
    const totalIncome = incomes.reduce((s, i) => s + i.amount, 0)
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
    const totalUnexpected = unexpecteds.reduce((s, u) => s + u.amount, 0)
    const totalSaved = savingsContributions.reduce((s, c) => s + c.amount, 0)
    const totalDebtPaid = debtPayments.reduce((s, d) => s + d.amount, 0)
    const netSavings = totalIncome - totalExpenses - totalUnexpected
    const savingsRate = totalIncome > 0 ? netSavings / totalIncome : 0

    // Top expense categories
    const categoryMap = new Map<string, { amount: number; color: string }>()
    for (const exp of expenses) {
      const name = exp.category?.name || 'Uncategorized'
      const color = exp.category?.color || '#94a3b8'
      const existing = categoryMap.get(name) || { amount: 0, color }
      existing.amount += exp.amount
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
      const existing = sourceMap.get(inc.source) || 0
      sourceMap.set(inc.source, existing + inc.amount)
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
    const savingsGoalsProgress = savingsGoals.map((goal) => ({
      name: goal.name,
      saved: Number(goal.savedAmount.toFixed(2)),
      target: Number(goal.targetAmount.toFixed(2)),
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