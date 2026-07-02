import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthFromCookie } from '@/lib/auth-utils'
import { keysToCamel, rowsToCamel, sumField } from '@/lib/supabase-utils'
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const accountId = getAuthFromCookie(request)
    if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const now = new Date()
    const sixMonthsAgo = subMonths(now, 5)
    const monthStart = startOfMonth(sixMonthsAgo)
    const monthEnd = endOfMonth(now)

    const [
      incomes,
      expenses,
      unexpecteds,
      savingsGoals,
      debts,
      movements,
      monthlyIncomes,
      monthlyExpenses,
    ] = await Promise.all([
      prisma.incomes.findMany({ where: { account_id: accountId }, select: { amount: true } }),
      prisma.expenses.findMany({ where: { account_id: accountId }, select: { amount: true, category_id: true } }),
      prisma.unexpecteds.findMany({ where: { account_id: accountId, resolved: false }, select: { amount: true } }),
      prisma.savings_goals.findMany({ where: { account_id: accountId }, select: { id: true, name: true, target_amount: true, saved_amount: true, icon: true, color: true, deadline: true, status: true } }),
      prisma.debts.findMany({ where: { account_id: accountId, status: { in: ['pending', 'partial', 'active'] } }, select: { id: true, status: true, total_amount: true, paid_amount: true } }),
      prisma.movements.findMany({ where: { account_id: accountId }, orderBy: { date: 'desc' }, take: 10 }),
      prisma.incomes.findMany({ where: { account_id: accountId, date: { gte: monthStart, lte: monthEnd } }, select: { date: true, amount: true } }),
      prisma.expenses.findMany({ where: { account_id: accountId, date: { gte: monthStart, lte: monthEnd } }, select: { date: true, amount: true } }),
    ])

    const totalIncome = sumField(incomes, 'amount')
    const totalExpenses = sumField(expenses, 'amount')
    const totalUnexpected = sumField(unexpecteds, 'amount')
    const totalSaved = sumField(savingsGoals, 'saved_amount')
    const totalDebtRemaining = debts.reduce((sum: number, d: any) => sum + Math.max(0, (Number(d.total_amount) || 0) - (Number(d.paid_amount) || 0)), 0)
    const totalDebtPayments = debts.reduce((sum: number, d: any) => sum + (Number(d.paid_amount) || 0), 0)
    const activeDebtCount = debts.length

    const balance = totalIncome - totalExpenses - totalUnexpected

    const catIds = [...new Set(movements.map((m: any) => m.category_id).filter(Boolean))] as string[]
    let catMap = new Map<string, any>()
    if (catIds.length > 0) {
      const cats = await prisma.categories.findMany({ where: { id: { in: catIds } }, select: { id: true, name: true, icon: true, color: true } })
      if (cats) catMap = new Map(cats.map((c: any) => [c.id, c]))
    }

    const recentMovements = rowsToCamel(movements).map((m: any) => ({
      ...m,
      category: m.categoryId ? keysToCamel(catMap.get(m.categoryId) || {}) : null,
    }))

    const monthlyData: { month: string; income: number; expenses: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i)
      const start = startOfMonth(monthDate)
      const end = endOfMonth(monthDate)
      const monthLabel = format(monthDate, 'MMM yyyy')

      monthlyData.push({
        month: monthLabel,
        income: Number(sumField(
          monthlyIncomes.filter((r: any) => {
            const d = new Date(r.date)
            return d >= start && d <= end
          }),
          'amount'
        ).toFixed(2)),
        expenses: Number(sumField(
          monthlyExpenses.filter((r: any) => {
            const d = new Date(r.date)
            return d >= start && d <= end
          }),
          'amount'
        ).toFixed(2)),
      })
    }

    const catAmountMap = new Map<string, number>()
    for (const e of expenses) {
      const catId = e.category_id || 'uncategorized'
      catAmountMap.set(catId, (catAmountMap.get(catId) || 0) + (e.amount || 0))
    }

    const uniqueCatIds = [...new Set(expenses.map((e: any) => e.category_id).filter(Boolean))] as string[]
    let allCats = new Map<string, any>()
    if (uniqueCatIds.length > 0) {
      const cats = await prisma.categories.findMany({ where: { id: { in: uniqueCatIds } }, select: { id: true, name: true, icon: true, color: true } })
      if (cats) allCats = new Map(cats.map((c: any) => [c.id, c]))
    }

    const categoryBreakdown = Array.from(catAmountMap.entries()).map(([catId, total]) => {
      const cat = catId !== 'uncategorized' ? allCats.get(catId) : null
      return {
        categoryId: catId,
        name: cat?.name || 'Sin categoría',
        icon: cat?.icon || 'Circle',
        color: cat?.color || '#94a3b8',
        total: Number(total.toFixed(2)),
      }
    })

    const savingsProgress = rowsToCamel(savingsGoals).map((goal: any) => ({
      ...goal,
      progress: goal.targetAmount > 0
        ? Number(((goal.savedAmount / goal.targetAmount) * 100).toFixed(1))
        : 0,
      remaining: Number(Math.max(0, goal.targetAmount - goal.savedAmount).toFixed(2)),
    }))

    return NextResponse.json({
      balance: Number(balance.toFixed(2)),
      totalIncome: Number(totalIncome.toFixed(2)),
      totalExpenses: Number(totalExpenses.toFixed(2)),
      totalSaved: Number(totalSaved.toFixed(2)),
      activeDebts: activeDebtCount,
      activeDebtRemaining: Number(totalDebtRemaining.toFixed(2)),
      activeDebtPayments: Number(totalDebtPayments.toFixed(2)),
      recentMovements,
      monthlyData,
      categoryBreakdown,
      savingsProgress,
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}