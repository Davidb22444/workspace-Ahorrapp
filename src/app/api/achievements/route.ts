import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { rowsToCamel, sumField } from '@/lib/supabase-utils'
import { startOfMonth, endOfMonth, subMonths } from 'date-fns'

interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  color: string
  unlocked: boolean
  unlockedAt?: string
  progress?: number
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId is required' },
        { status: 400 }
      )
    }

    const now = new Date()
    const currentMonthStart = startOfMonth(now)
    const currentMonthEnd = endOfMonth(now)

    // Run all independent queries in parallel
    const [
      incomeRes,
      firstIncomeRes,
      expenseRes,
      firstExpenseRes,
      savingsGoalsRes,
      activeDebtsRes,
      savingsGoalCountRes,
      firstSavingsGoalRes,
      recurringExpenseRes,
      currentMonthUnexpectedRes,
      budgetPeriodsRes,
    ] = await Promise.all([
      // 1. first-income: count income records
      supabase.from('incomes').select('id', { count: 'exact', head: true }).eq('account_id', accountId),

      // First income by created_at
      supabase.from('incomes').select('created_at').eq('account_id', accountId).order('created_at', { ascending: true }).limit(1),

      // 2. first-expense: count expense records
      supabase.from('expenses').select('id', { count: 'exact', head: true }).eq('account_id', accountId),

      // First expense by created_at
      supabase.from('expenses').select('created_at').eq('account_id', accountId).order('created_at', { ascending: true }).limit(1),

      // 3 & 4. savings-1k, savings-10k: total saved across all goals
      supabase.from('savings_goals').select('saved_amount').eq('account_id', accountId),

      // 5. debt-free: any active (pending/partial) debts
      supabase.from('debts').select('id', { count: 'exact', head: true }).eq('account_id', accountId).in('status', ['pending', 'partial', 'active']),

      // 9. first-savings-goal: count savings goals
      supabase.from('savings_goals').select('id', { count: 'exact', head: true }).eq('account_id', accountId),

      // First savings goal by created_at
      supabase.from('savings_goals').select('created_at').eq('account_id', accountId).order('created_at', { ascending: true }).limit(1),

      // 10. recurring-tracker: count of expenses with is_recurring=true
      supabase.from('expenses').select('id', { count: 'exact', head: true }).eq('account_id', accountId).eq('is_recurring', true),

      // 12. no-unexpected: unexpected expenses in current month
      supabase.from('unexpecteds').select('id', { count: 'exact', head: true }).eq('account_id', accountId).gte('date', currentMonthStart.toISOString()).lte('date', currentMonthEnd.toISOString()),

      // 6. budget-master: last 3 budget periods
      supabase.from('budget_periods').select('planned_needs, planned_wants, planned_savings, actual_needs, actual_wants, actual_savings').eq('account_id', accountId).order('start_date', { ascending: false }).limit(3),
    ])

    // 7. track-100: count of all Income + Expense + Unexpected
    const [incCount, expCount, unexpCount] = await Promise.all([
      supabase.from('incomes').select('id', { count: 'exact', head: true }).eq('account_id', accountId),
      supabase.from('expenses').select('id', { count: 'exact', head: true }).eq('account_id', accountId),
      supabase.from('unexpecteds').select('id', { count: 'exact', head: true }).eq('account_id', accountId),
    ])

    // 11. multi-income: distinct income sources (need actual data)
    const { data: incomeSourceRows } = await supabase
      .from('incomes')
      .select('source')
      .eq('account_id', accountId)

    const incomeCount = incomeRes.count || 0
    const expenseCount = expenseRes.count || 0
    const totalSaved = sumField(savingsGoalsRes.data || [], 'saved_amount')
    const activeDebts = activeDebtsRes.count || 0
    const savingsGoalCount = savingsGoalCountRes.count || 0
    const recurringExpenseCount = recurringExpenseRes.count || 0
    const currentMonthUnexpected = currentMonthUnexpectedRes.count || 0
    const transactionCount = (incCount.count || 0) + (expCount.count || 0) + (unexpCount.count || 0)
    const distinctIncomeSources = new Set((incomeSourceRows || []).map((r: any) => r.source)).size
    const firstIncome = firstIncomeRes.data?.[0] || null
    const firstExpense = firstExpenseRes.data?.[0] || null
    const firstSavingsGoal = firstSavingsGoalRes.data?.[0] || null
    const budgetPeriods = rowsToCamel(budgetPeriodsRes.data || [])

    // 8. emergency-fund: check for savings goal with "emergency" in name
    const { data: emergencyGoals } = await supabase
      .from('savings_goals')
      .select('id, saved_amount')
      .eq('account_id', accountId)
      .ilike('name', '%emergency%')

    let emergencyProgress = 0
    let emergencyUnlocked = false
    if (emergencyGoals && emergencyGoals.length > 0) {
      const totalEmergencySaved = emergencyGoals.reduce(
        (sum, g) => sum + (g.saved_amount || 0),
        0
      )
      // Calculate average monthly expenses from last 6 months
      let totalMonthlyExpenses = 0
      for (let i = 0; i < 6; i++) {
        const monthDate = subMonths(now, i)
        const start = startOfMonth(monthDate)
        const end = endOfMonth(monthDate)
        const { data: monthExpenses } = await supabase
          .from('expenses')
          .select('amount')
          .eq('account_id', accountId)
          .gte('date', start.toISOString())
          .lte('date', end.toISOString())
        totalMonthlyExpenses += sumField(monthExpenses || [], 'amount')
      }
      const avgMonthlyExpenses = totalMonthlyExpenses / 6
      const target = 3 * avgMonthlyExpenses

      if (target > 0) {
        emergencyProgress = Math.min(1, totalEmergencySaved / target)
        emergencyUnlocked = totalEmergencySaved >= target
      }
    }

    // Build achievements array
    const achievements: Achievement[] = [
      // 1. first-income
      {
        id: 'first-income',
        title: 'First Income',
        description: 'Recorded your first income',
        icon: 'DollarSign',
        color: '#10b981',
        unlocked: incomeCount > 0,
        ...(incomeCount > 0 && firstIncome
          ? { unlockedAt: new Date(firstIncome.created_at).toISOString() }
          : {}),
      },

      // 2. first-expense
      {
        id: 'first-expense',
        title: 'First Expense',
        description: 'Logged your first expense',
        icon: 'ShoppingCart',
        color: '#f43f5e',
        unlocked: expenseCount > 0,
        ...(expenseCount > 0 && firstExpense
          ? { unlockedAt: new Date(firstExpense.created_at).toISOString() }
          : {}),
      },

      // 3. savings-1k
      {
        id: 'savings-1k',
        title: 'Saver Starter',
        description: 'Save $1,000 total',
        icon: 'PiggyBank',
        color: '#f59e0b',
        unlocked: totalSaved >= 1000,
        progress: Math.min(1, totalSaved / 1000),
        ...(totalSaved >= 1000 && firstSavingsGoal
          ? { unlockedAt: new Date(firstSavingsGoal.created_at).toISOString() }
          : {}),
      },

      // 4. savings-10k
      {
        id: 'savings-10k',
        title: 'Big Saver',
        description: 'Save $10,000 total',
        icon: 'Trophy',
        color: '#8b5cf6',
        unlocked: totalSaved >= 10000,
        progress: Number((totalSaved / 10000).toFixed(2)),
      },

      // 5. debt-free
      {
        id: 'debt-free',
        title: 'Debt Free',
        description: 'Pay off all debts',
        icon: 'PartyPopper',
        color: '#ec4899',
        unlocked: activeDebts === 0,
      },

      // 6. budget-master
      {
        id: 'budget-master',
        title: 'Budget Master',
        description: 'Stay under budget for 3 months',
        icon: 'Target',
        color: '#06b6d4',
        unlocked:
          budgetPeriods.length >= 3 &&
          budgetPeriods.every(
            (p: any) =>
              p.actualNeeds <= p.plannedNeeds &&
              p.actualWants <= p.plannedWants &&
              p.actualSavings <= p.plannedSavings
          ),
      },

      // 7. track-100
      {
        id: 'track-100',
        title: 'Tracker Pro',
        description: 'Record 100 transactions',
        icon: 'BarChart3',
        color: '#6366f1',
        unlocked: transactionCount >= 100,
        progress: Number((transactionCount / 100).toFixed(2)),
      },

      // 8. emergency-fund
      {
        id: 'emergency-fund',
        title: 'Safety Net',
        description: 'Build 3 months emergency fund',
        icon: 'Shield',
        color: '#14b8a6',
        unlocked: emergencyUnlocked,
        progress: emergencyProgress > 0 ? Number(emergencyProgress.toFixed(2)) : undefined,
      },

      // 9. first-savings-goal
      {
        id: 'first-savings-goal',
        title: 'Goal Setter',
        description: 'Create your first savings goal',
        icon: 'Flag',
        color: '#f97316',
        unlocked: savingsGoalCount > 0,
        ...(savingsGoalCount > 0 && firstSavingsGoal
          ? { unlockedAt: new Date(firstSavingsGoal.created_at).toISOString() }
          : {}),
      },

      // 10. recurring-tracker
      {
        id: 'recurring-tracker',
        title: 'Recurring Planner',
        description: 'Track 5+ recurring expenses',
        icon: 'Repeat',
        color: '#84cc16',
        unlocked: recurringExpenseCount >= 5,
        progress: Number((recurringExpenseCount / 5).toFixed(2)),
      },

      // 11. multi-income
      {
        id: 'multi-income',
        title: 'Income Diversifier',
        description: 'Have 3+ income sources',
        icon: 'TrendingUp',
        color: '#10b981',
        unlocked: distinctIncomeSources >= 3,
        ...(distinctIncomeSources >= 3 && firstIncome
          ? { unlockedAt: new Date(firstIncome.created_at).toISOString() }
          : {}),
      },

      // 12. no-unexpected
      {
        id: 'no-unexpected',
        title: 'Prepared Planner',
        description: 'No unexpected expenses for a month',
        icon: 'CheckCircle',
        color: '#22d3ee',
        unlocked: currentMonthUnexpected === 0,
      },
    ]

    return NextResponse.json({ achievements })
  } catch (error) {
    console.error('Achievements error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}