import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthFromCookie } from '@/lib/auth-utils'
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
    const accountId = getAuthFromCookie(request)
    if (!accountId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const now = new Date()
    const currentMonthStart = startOfMonth(now)
    const currentMonthEnd = endOfMonth(now)

    const [
      incomeCount,
      firstIncome,
      expenseCount,
      firstExpense,
      savingsGoals,
      activeDebts,
      savingsGoalCount,
      firstSavingsGoal,
      recurringExpenseCount,
      currentMonthUnexpected,
      budgetPeriods,
    ] = await Promise.all([
      prisma.incomes.count({ where: { account_id: accountId } }),
      prisma.incomes.findFirst({ where: { account_id: accountId }, orderBy: { created_at: 'asc' }, select: { created_at: true } }),
      prisma.expenses.count({ where: { account_id: accountId } }),
      prisma.expenses.findFirst({ where: { account_id: accountId }, orderBy: { created_at: 'asc' }, select: { created_at: true } }),
      prisma.savings_goals.findMany({ where: { account_id: accountId }, select: { saved_amount: true } }),
      prisma.debts.count({ where: { account_id: accountId, status: { in: ['pending', 'partial', 'active'] } } }),
      prisma.savings_goals.count({ where: { account_id: accountId } }),
      prisma.savings_goals.findFirst({ where: { account_id: accountId }, orderBy: { created_at: 'asc' }, select: { created_at: true } }),
      prisma.expenses.count({ where: { account_id: accountId, is_recurring: true } }),
      prisma.unexpecteds.count({ where: { account_id: accountId, date: { gte: currentMonthStart, lte: currentMonthEnd } } }),
      prisma.budget_periods.findMany({ where: { account_id: accountId }, orderBy: { start_date: 'desc' }, take: 3, select: { planned_needs: true, planned_wants: true, planned_savings: true, actual_needs: true, actual_wants: true, actual_savings: true } }),
    ])

    const [incCount, expCount, unexpCount] = await Promise.all([
      prisma.incomes.count({ where: { account_id: accountId } }),
      prisma.expenses.count({ where: { account_id: accountId } }),
      prisma.unexpecteds.count({ where: { account_id: accountId } }),
    ])

    const incomeSourceRows = await prisma.incomes.findMany({
      where: { account_id: accountId },
      select: { source: true },
    })

    const totalSaved = sumField(savingsGoals, 'saved_amount')
    const transactionCount = incCount + expCount + unexpCount
    const distinctIncomeSources = new Set(incomeSourceRows.map((r: any) => r.source)).size
    const budgetPeriodsCamel = rowsToCamel(budgetPeriods)

    const emergencyGoals = await prisma.savings_goals.findMany({
      where: { account_id: accountId, name: { contains: 'emergency', mode: 'insensitive' } },
      select: { id: true, saved_amount: true },
    })

    let emergencyProgress = 0
    let emergencyUnlocked = false
    if (emergencyGoals && emergencyGoals.length > 0) {
      const totalEmergencySaved = emergencyGoals.reduce(
        (sum, g) => sum + (g.saved_amount || 0),
        0
      )
      let totalMonthlyExpenses = 0
      for (let i = 0; i < 6; i++) {
        const monthDate = subMonths(now, i)
        const start = startOfMonth(monthDate)
        const end = endOfMonth(monthDate)
        const monthExpenses = await prisma.expenses.findMany({
          where: { account_id: accountId, date: { gte: start, lte: end } },
          select: { amount: true },
        })
        totalMonthlyExpenses += sumField(monthExpenses, 'amount')
      }
      const avgMonthlyExpenses = totalMonthlyExpenses / 6
      const target = 3 * avgMonthlyExpenses

      if (target > 0) {
        emergencyProgress = Math.min(1, totalEmergencySaved / target)
        emergencyUnlocked = totalEmergencySaved >= target
      }
    }

    const achievements: Achievement[] = [
      {
        id: 'first-income',
        title: 'Primer Ingreso',
        description: 'Registraste tu primer ingreso',
        icon: 'DollarSign',
        color: '#10b981',
        unlocked: incomeCount > 0,
        ...(incomeCount > 0 && firstIncome
          ? { unlockedAt: new Date(firstIncome.created_at).toISOString() }
          : {}),
      },

      {
        id: 'first-expense',
        title: 'Primer Gasto',
        description: 'Registraste tu primer gasto',
        icon: 'ShoppingCart',
        color: '#f43f5e',
        unlocked: expenseCount > 0,
        ...(expenseCount > 0 && firstExpense
          ? { unlockedAt: new Date(firstExpense.created_at).toISOString() }
          : {}),
      },

      {
        id: 'savings-1k',
        title: 'Ahorrador Inicial',
        description: 'Ahorra $1,000 en total',
        icon: 'PiggyBank',
        color: '#f59e0b',
        unlocked: totalSaved >= 1000,
        progress: Math.min(1, totalSaved / 1000),
        ...(totalSaved >= 1000 && firstSavingsGoal
          ? { unlockedAt: new Date(firstSavingsGoal.created_at).toISOString() }
          : {}),
      },

      {
        id: 'savings-10k',
        title: 'Gran Ahorrador',
        description: 'Ahorra $10,000 en total',
        icon: 'Trophy',
        color: '#8b5cf6',
        unlocked: totalSaved >= 10000,
        progress: Number((totalSaved / 10000).toFixed(2)),
      },

      {
        id: 'debt-free',
        title: 'Libre de Deudas',
        description: 'Paga todas tus deudas',
        icon: 'PartyPopper',
        color: '#ec4899',
        unlocked: activeDebts === 0,
      },

      {
        id: 'budget-master',
        title: 'Maestro del Presupuesto',
        description: 'Mantente dentro del presupuesto por 3 meses',
        icon: 'Target',
        color: '#06b6d4',
        unlocked:
          budgetPeriodsCamel.length >= 3 &&
          budgetPeriodsCamel.every(
            (p: any) =>
              p.actualNeeds <= p.plannedNeeds &&
              p.actualWants <= p.plannedWants &&
              p.actualSavings <= p.plannedSavings
          ),
      },

      {
        id: 'track-100',
        title: 'Seguimiento Profesional',
        description: 'Registra 100 transacciones',
        icon: 'BarChart3',
        color: '#6366f1',
        unlocked: transactionCount >= 100,
        progress: Number((transactionCount / 100).toFixed(2)),
      },

      {
        id: 'emergency-fund',
        title: 'Red de Seguridad',
        description: 'Construye un fondo de emergencia de 3 meses',
        icon: 'Shield',
        color: '#14b8a6',
        unlocked: emergencyUnlocked,
        progress: emergencyProgress > 0 ? Number(emergencyProgress.toFixed(2)) : undefined,
      },

      {
        id: 'first-savings-goal',
        title: 'Metas Claras',
        description: 'Crea tu primera meta de ahorro',
        icon: 'Flag',
        color: '#f97316',
        unlocked: savingsGoalCount > 0,
        ...(savingsGoalCount > 0 && firstSavingsGoal
          ? { unlockedAt: new Date(firstSavingsGoal.created_at).toISOString() }
          : {}),
      },

      {
        id: 'recurring-tracker',
        title: 'Planificador Recurrente',
        description: 'Registra 5+ gastos recurrentes',
        icon: 'Repeat',
        color: '#84cc16',
        unlocked: recurringExpenseCount >= 5,
        progress: Number((recurringExpenseCount / 5).toFixed(2)),
      },

      {
        id: 'multi-income',
        title: 'Diversificador de Ingresos',
        description: 'Ten 3+ fuentes de ingreso',
        icon: 'TrendingUp',
        color: '#10b981',
        unlocked: distinctIncomeSources >= 3,
        ...(distinctIncomeSources >= 3 && firstIncome
          ? { unlockedAt: new Date(firstIncome.created_at).toISOString() }
          : {}),
      },

      {
        id: 'no-unexpected',
        title: 'Planificador Preparado',
        description: 'Sin gastos imprevistos por un mes',
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