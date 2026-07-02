import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireRole } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    const auth = requireRole(request, ['admin'])
    if (auth instanceof NextResponse) return auth

    let totalIncomes = 0, totalExpenses = 0, totalDebts = 0, totalSavingsGoals = 0, totalNotifications = 0
    try { totalIncomes = await prisma.incomes.count() } catch (e) { console.error('incomes count error:', e) }
    try { totalExpenses = await prisma.expenses.count() } catch (e) { console.error('expenses count error:', e) }
    try { totalDebts = await prisma.debts.count() } catch (e) { console.error('debts count error:', e) }
    try { totalSavingsGoals = await prisma.savings_goals.count() } catch (e) { console.error('savings_goals count error:', e) }
    try { totalNotifications = await prisma.notifications.count() } catch (e) { console.error('notifications count error:', e) }

    const [totalUsers, activeUsers, suspendedUsers, adminUsers, recentUsers] = await Promise.all([
      prisma.accounts.count(),
      prisma.accounts.count({ where: { status: 'active' } }),
      prisma.accounts.count({ where: { status: 'suspended' } }),
      prisma.accounts.count({ where: { role: 'admin' } }),
      prisma.accounts.findMany({
        where: { status: 'active' },
        orderBy: { created_at: 'desc' },
        take: 5,
        select: { id: true, name: true, email: true, role: true, created_at: true },
      }),
    ])

    return NextResponse.json({
      stats: {
        totalUsers, activeUsers, suspendedUsers, adminUsers,
        totalIncomes, totalExpenses, totalDebts, totalSavingsGoals, totalNotifications,
      },
      recentUsers,
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json({ error: 'Internal server error', detail: String(error) }, { status: 500 })
  }
}
