import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
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

    // Fetch all necessary data in parallel
    const [
      incomeRes,
      expenseRes,
      unexpectedRes,
      savingsRes,
      debtsRes,
      movementsRes,
      monthlyIncomeRes,
      monthlyExpenseRes,
    ] = await Promise.all([
      // Total income (all time)
      supabase.from('incomes').select('amount').eq('account_id', accountId),
      // Total expenses (all time) — includes category_id for breakdown
      supabase.from('expenses').select('amount, category_id').eq('account_id', accountId),
      // Unresolved unexpecteds (all time)
      supabase.from('unexpecteds').select('amount').eq('account_id', accountId).eq('resolved', false),
      // Savings goals
      supabase.from('savings_goals').select('id, name, target_amount, saved_amount, icon, color, deadline, status').eq('account_id', accountId),
      // Active debts
      supabase.from('debts').select('id, status, total_amount, paid_amount').eq('account_id', accountId).in('status', ['pending', 'partial', 'active']),
      // Recent movements (last 10)
      supabase.from('movements').select('*').eq('account_id', accountId).order('date', { ascending: false }).limit(10),
      // Monthly incomes for last 6 months (single query)
      supabase.from('incomes').select('date, amount').eq('account_id', accountId).gte('date', monthStart.toISOString()).lte('date', monthEnd.toISOString()),
      // Monthly expenses for last 6 months (single query)
      supabase.from('expenses').select('date, amount').eq('account_id', accountId).gte('date', monthStart.toISOString()).lte('date', monthEnd.toISOString()),
    ])

    const totalIncome = sumField(incomeRes.data || [], 'amount')
    const totalExpenses = sumField(expenseRes.data || [], 'amount')
    const totalUnexpected = sumField(unexpectedRes.data || [], 'amount')
    const totalSaved = sumField(savingsRes.data || [], 'saved_amount')
    const totalDebtRemaining = (debtsRes.data || []).reduce((sum: number, d: any) => sum + Math.max(0, (Number(d.total_amount) || 0) - (Number(d.paid_amount) || 0)), 0)
    const totalDebtPayments = (debtsRes.data || []).reduce((sum: number, d: any) => sum + (Number(d.paid_amount) || 0), 0)
    const activeDebtCount = (debtsRes.data || []).length

    const balance = totalIncome - totalExpenses - totalUnexpected

    // Enrich movements with category data
    const movementsRaw = movementsRes.data || []
    const catIds = [...new Set(movementsRaw.map((m: any) => m.category_id).filter(Boolean))] as string[]
    let catMap = new Map<string, any>()
    if (catIds.length > 0) {
      const { data: cats } = await supabase.from('categories').select('id, name, icon, color').in('id', catIds)
      if (cats) catMap = new Map(cats.map((c: any) => [c.id, c]))
    }

    const recentMovements = rowsToCamel(movementsRaw).map((m: any) => ({
      ...m,
      category: m.categoryId ? keysToCamel(catMap.get(m.categoryId) || {}) : null,
    }))

    // Monthly data: last 6 months — computed client-side from fetched data
    const monthlyData: { month: string; income: number; expenses: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i)
      const start = startOfMonth(monthDate)
      const end = endOfMonth(monthDate)
      const monthLabel = format(monthDate, 'MMM yyyy')

      monthlyData.push({
        month: monthLabel,
        income: Number(sumField(
          (monthlyIncomeRes.data || []).filter((r: any) => {
            const d = new Date(r.date)
            return d >= start && d <= end
          }),
          'amount'
        ).toFixed(2)),
        expenses: Number(sumField(
          (monthlyExpenseRes.data || []).filter((r: any) => {
            const d = new Date(r.date)
            return d >= start && d <= end
          }),
          'amount'
        ).toFixed(2)),
      })
    }

    // Category breakdown: expenses grouped by category
    const catAmountMap = new Map<string, number>()
    for (const e of expenseRes.data || []) {
      const catId = e.category_id || 'uncategorized'
      catAmountMap.set(catId, (catAmountMap.get(catId) || 0) + (e.amount || 0))
    }

    const uniqueCatIds = [...new Set(expenseRes.data?.map((e: any) => e.category_id).filter(Boolean) || [])] as string[]
    let allCats = new Map<string, any>()
    if (uniqueCatIds.length > 0) {
      const { data: cats } = await supabase.from('categories').select('id, name, icon, color').in('id', uniqueCatIds)
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

    // Savings progress
    const savingsGoals = rowsToCamel(savingsRes.data || []).map((goal: any) => ({
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
      savingsProgress: savingsGoals,
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}