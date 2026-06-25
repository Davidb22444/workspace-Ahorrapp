import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
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
      incomeCount,
      firstIncome,
      expenseCount,
      firstExpense,
      savingsAggregate,
      activeDebts,
      totalTransactions,
      savingsGoalCount,
      firstSavingsGoal,
      recurringExpenseCount,
      incomeSources,
      currentMonthUnexpected,
      budgetPeriods,
    ] = await Promise.all([
      // 1. first-income: any income records exist
      db.income.count({ where: { accountId } }),

      db.income.findFirst({
        where: { accountId },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),

      // 2. first-expense: any expense records exist
      db.expense.count({ where: { accountId } }),

      db.expense.findFirst({
        where: { accountId },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),

      // 3 & 4. savings-1k, savings-10k: total saved across all goals
      db.savingsGoal.aggregate({
        _sum: { savedAmount: true },
        where: { accountId },
      }),

      // 5. debt-free: any active (pending/partial) debts
      db.debt.count({
        where: { accountId, status: { in: ['pending', 'partial'] } },
      }),

      // 7. track-100: count of all Income + Expense + Unexpected
      Promise.all([
        db.income.count({ where: { accountId } }),
        db.expense.count({ where: { accountId } }),
        db.unexpected.count({ where: { accountId } }),
      ]),

      // 9. first-savings-goal: any savings goal exists
      db.savingsGoal.count({ where: { accountId } }),

      db.savingsGoal.findFirst({
        where: { accountId },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),

      // 10. recurring-tracker: count of expenses with isRecurring=true
      db.expense.count({
        where: { accountId, isRecurring: true },
      }),

      // 11. multi-income: distinct income sources
      db.income.groupBy({
        by: ['source'],
        where: { accountId },
      }),

      // 12. no-unexpected: unexpected expenses in current month
      db.unexpected.count({
        where: {
          accountId,
          date: { gte: currentMonthStart, lte: currentMonthEnd },
        },
      }),

      // 6. budget-master: last 3 budget periods
      db.budgetPeriod.findMany({
        where: { accountId },
        orderBy: { startDate: 'desc' },
        take: 3,
        select: {
          plannedNeeds: true,
          plannedWants: true,
          plannedSavings: true,
          actualNeeds: true,
          actualWants: true,
          actualSavings: true,
        },
      }),
    ])

    const totalSaved = savingsAggregate._sum.savedAmount ?? 0
    const transactionCount = (totalTransactions as number[]).reduce((a, b) => a + b, 0)
    const distinctIncomeSources = (incomeSources as { source: string }[]).length

    // 8. emergency-fund: check for savings goal with "emergency" in name
    const emergencyGoals = await db.savingsGoal.findMany({
      where: {
        accountId,
        name: { contains: 'emergency' },
      },
      select: { id: true, savedAmount: true },
    })

    let emergencyProgress = 0
    let emergencyUnlocked = false
    if (emergencyGoals.length > 0) {
      const totalEmergencySaved = emergencyGoals.reduce(
        (sum, g) => sum + g.savedAmount,
        0
      )
      // Calculate average monthly expenses from last 6 months
      let totalMonthlyExpenses = 0
      for (let i = 0; i < 6; i++) {
        const monthDate = subMonths(now, i)
        const start = startOfMonth(monthDate)
        const end = endOfMonth(monthDate)
        const monthExpenses = await db.expense.aggregate({
          _sum: { amount: true },
          where: { accountId, date: { gte: start, lte: end } },
        })
        totalMonthlyExpenses += monthExpenses._sum.amount ?? 0
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
          ? { unlockedAt: firstIncome.createdAt.toISOString() }
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
          ? { unlockedAt: firstExpense.createdAt.toISOString() }
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
        ...(totalSaved >= 1000
          ? { unlockedAt: firstSavingsGoal?.createdAt.toISOString() }
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
            (p) =>
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
          ? { unlockedAt: firstSavingsGoal.createdAt.toISOString() }
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
          ? { unlockedAt: firstIncome.createdAt.toISOString() }
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