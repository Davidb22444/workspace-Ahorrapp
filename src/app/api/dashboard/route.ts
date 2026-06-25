import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns'

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

    // Total income
    const incomeResult = await db.income.aggregate({
      _sum: { amount: true },
      where: { accountId },
    })
    const totalIncome = incomeResult._sum.amount ?? 0

    // Total expenses
    const expenseResult = await db.expense.aggregate({
      _sum: { amount: true },
      where: { accountId },
    })
    const totalExpenses = expenseResult._sum.amount ?? 0

    // Total unexpected
    const unexpectedResult = await db.unexpected.aggregate({
      _sum: { amount: true },
      where: { accountId, resolved: false },
    })

    // Total saved
    const savingsResult = await db.savingsGoal.aggregate({
      _sum: { savedAmount: true },
      where: { accountId },
    })
    const totalSaved = savingsResult._sum.savedAmount ?? 0

    // Active debts
    const activeDebts = await db.debt.aggregate({
      _sum: { paidAmount: true },
      where: { accountId, status: { in: ['pending', 'partial'] } },
    })
    const totalDebtPayments = activeDebts._sum.paidAmount ?? 0

    const activeDebtCount = await db.debt.count({
      where: { accountId, status: { in: ['pending', 'partial'] } },
    })

    // Balance = income - expenses - unexpected(unresolved)
    const balance = totalIncome - totalExpenses - (unexpectedResult._sum.amount ?? 0)

    // Recent movements (last 10)
    const recentMovements = await db.movement.findMany({
      where: { accountId },
      orderBy: { date: 'desc' },
      take: 10,
      include: { category: { select: { name: true, icon: true, color: true } } },
    })

    // Monthly data: last 6 months
    const monthlyData: { month: string; income: number; expenses: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i)
      const start = startOfMonth(monthDate)
      const end = endOfMonth(monthDate)
      const monthLabel = format(monthDate, 'MMM yyyy')

      const monthIncome = await db.income.aggregate({
        _sum: { amount: true },
        where: {
          accountId,
          date: { gte: start, lte: end },
        },
      })

      const monthExpense = await db.expense.aggregate({
        _sum: { amount: true },
        where: {
          accountId,
          date: { gte: start, lte: end },
        },
      })

      monthlyData.push({
        month: monthLabel,
        income: Number((monthIncome._sum.amount ?? 0).toFixed(2)),
        expenses: Number((monthExpense._sum.amount ?? 0).toFixed(2)),
      })
    }

    // Category breakdown: expenses grouped by category
    const categoryExpenses = await db.expense.groupBy({
      by: ['categoryId'],
      where: { accountId },
      _sum: { amount: true },
    })

    const categoryBreakdown = await Promise.all(
      categoryExpenses.map(async (ce) => {
        const cat = ce.categoryId
          ? await db.category.findUnique({
              where: { id: ce.categoryId! },
              select: { name: true, icon: true, color: true },
            })
          : null
        return {
          categoryId: ce.categoryId ?? 'uncategorized',
          name: cat?.name ?? 'Sin categoría',
          icon: cat?.icon ?? 'Circle',
          color: cat?.color ?? '#94a3b8',
          total: Number((ce._sum.amount ?? 0).toFixed(2)),
        }
      })
    )

    // Savings progress
    const savingsGoals = await db.savingsGoal.findMany({
      where: { accountId },
      select: {
        id: true,
        name: true,
        targetAmount: true,
        savedAmount: true,
        icon: true,
        color: true,
        deadline: true,
        status: true,
      },
    })

    const savingsProgress = savingsGoals.map((goal) => ({
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