'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts'
import { format } from 'date-fns'

const CHART_COLORS = ['#10b981', '#f59e0b', '#f43f5e', '#6366f1', '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6']

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

interface DashboardData {
  balance: number
  totalIncome: number
  totalExpenses: number
  totalDebt: number
  monthlyCashFlow: Array<{ month: string; income: number; expenses: number }>
  expenseCategories: Array<{ name: string; value: number; color: string }>
  budgetVsActual: Array<{ name: string; planned: number; actual: number }>
  recentTransactions: Array<{
    id: string
    type: string
    description: string
    amount: number
    date: string
    category?: string
    categoryColor?: string
  }>
  savingsGoals: Array<{
    id: string
    name: string
    saved: number
    target: number
    deadline?: string
  }>
}

const mockData: DashboardData = {
  balance: 12450.75,
  totalIncome: 5200.0,
  totalExpenses: 3420.5,
  totalDebt: 8500.0,
  monthlyCashFlow: [
    { month: 'Jan', income: 4800, expenses: 3200 },
    { month: 'Feb', income: 5100, expenses: 2900 },
    { month: 'Mar', income: 4900, expenses: 3500 },
    { month: 'Apr', income: 5300, expenses: 3100 },
    { month: 'May', income: 5000, expenses: 3400 },
    { month: 'Jun', income: 5200, expenses: 3420 },
  ],
  expenseCategories: [
    { name: 'Housing', value: 1200, color: '#10b981' },
    { name: 'Food', value: 680, color: '#f59e0b' },
    { name: 'Transport', value: 450, color: '#f43f5e' },
    { name: 'Entertainment', value: 320, color: '#6366f1' },
    { name: 'Utilities', value: 380, color: '#06b6d4' },
    { name: 'Other', value: 390.5, color: '#8b5cf6' },
  ],
  budgetVsActual: [
    { name: 'Needs', planned: 2600, actual: 2510 },
    { name: 'Wants', planned: 1560, actual: 1480 },
    { name: 'Savings', planned: 1040, actual: 770 },
  ],
  recentTransactions: [
    { id: '1', type: 'income', description: 'Monthly Salary', amount: 5200, date: '2025-06-01', category: 'Salary' },
    { id: '2', type: 'expense', description: 'Rent Payment', amount: -1200, date: '2025-06-02', category: 'Housing', categoryColor: '#10b981' },
    { id: '3', type: 'expense', description: 'Grocery Store', amount: -156.80, date: '2025-06-03', category: 'Food', categoryColor: '#f59e0b' },
    { id: '4', type: 'expense', description: 'Electric Bill', amount: -120, date: '2025-06-04', category: 'Utilities', categoryColor: '#06b6d4' },
    { id: '5', type: 'income', description: 'Freelance Project', amount: 800, date: '2025-06-05', category: 'Freelance' },
    { id: '6', type: 'expense', description: 'Gas Station', amount: -65, date: '2025-06-06', category: 'Transport', categoryColor: '#f43f5e' },
    { id: '7', type: 'expense', description: 'Netflix Subscription', amount: -15.99, date: '2025-06-07', category: 'Entertainment', categoryColor: '#6366f1' },
    { id: '8', type: 'expense', description: 'Restaurant Dinner', amount: -85.50, date: '2025-06-08', category: 'Food', categoryColor: '#f59e0b' },
    { id: '9', type: 'income', description: 'Investment Returns', amount: 150, date: '2025-06-09', category: 'Investment' },
    { id: '10', type: 'expense', description: 'Phone Bill', amount: -55, date: '2025-06-10', category: 'Utilities', categoryColor: '#06b6d4' },
  ],
  savingsGoals: [
    { id: '1', name: 'Emergency Fund', saved: 4500, target: 10000, deadline: '2025-12-31' },
    { id: '2', name: 'Vacation', saved: 1200, target: 3000, deadline: '2025-08-15' },
    { id: '3', name: 'New Laptop', saved: 800, target: 2000 },
    { id: '4', name: 'Down Payment', saved: 15000, target: 50000, deadline: '2027-06-01' },
  ],
}

function ChartTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium text-foreground mb-1">{label}</p>
        {payload.map((entry: any, idx: number) => (
          <p key={idx} className="text-xs" style={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const { user, dashboardData, setDashboardData } = useAppStore()

  const mapApiData = (api: any): DashboardData => ({
    balance: api.balance ?? 0,
    totalIncome: api.totalIncome ?? 0,
    totalExpenses: api.totalExpenses ?? 0,
    totalDebt: api.activeDebtPayments ?? 0,
    monthlyCashFlow: (api.monthlyData ?? []).map((m: any) => ({
      month: m.month?.split(' ')[0] || m.month,
      income: m.income ?? 0,
      expenses: m.expenses ?? 0,
    })),
    expenseCategories: (api.categoryBreakdown ?? []).map((c: any) => ({
      name: c.name,
      value: c.total ?? c.value ?? 0,
      color: c.color || '#94a3b8',
    })),
    budgetVsActual: [] as DashboardData['budgetVsActual'], // Will be populated by budget API
    recentTransactions: (api.recentMovements ?? []).map((m: any) => ({
      id: m.id,
      type: m.type || 'expense',
      description: m.description,
      amount: m.type === 'entrada' ? m.amount : -m.amount,
      date: m.date,
      category: m.category?.name,
      categoryColor: m.category?.color,
    })),
    savingsGoals: (api.savingsProgress ?? []).map((g: any) => ({
      id: g.id,
      name: g.name,
      saved: g.savedAmount ?? g.saved ?? 0,
      target: g.targetAmount ?? g.target ?? 0,
      deadline: g.deadline,
    })),
  })

  useEffect(() => {
    let cancelled = false
    const doFetch = async () => {
      try {
        if (user?.id) {
          const [dashRes, budgetRes] = await Promise.all([
            fetch(`/api/dashboard?accountId=${user.id}`),
            fetch(`/api/budget?accountId=${user.id}`),
          ])
          if (dashRes.ok && !cancelled) {
            const json = await dashRes.json()
            const mapped = mapApiData(json)

            // Try to populate budgetVsActual from budget API
            if (budgetRes.ok) {
              try {
                const budgetJson = await budgetRes.json()
                const budgets = budgetJson.budgets || []
                if (budgets.length > 0) {
                  const b = budgets[0]
                  const totalIncome = mapped.totalIncome || b.totalAmount || 5200
                  const needsPct = b.needsPercent ?? 50
                  const wantsPct = b.wantsPercent ?? 30
                  const savingsPct = b.savingsPercent ?? 20
                  mapped.budgetVsActual = [
                    { name: 'Needs', planned: Math.round(totalIncome * needsPct / 100), actual: Math.round(mapped.totalExpenses * needsPct / 100) },
                    { name: 'Wants', planned: Math.round(totalIncome * wantsPct / 100), actual: Math.round(mapped.totalExpenses * wantsPct / 100) },
                    { name: 'Savings', planned: Math.round(totalIncome * savingsPct / 100), actual: Math.round((totalIncome - mapped.totalExpenses) * savingsPct / 100) },
                  ]
                }
              } catch { /* keep mock budgetVsActual */ }
            }

            setDashboardData(mapped)
            setData(mapped)
            setLoading(false)
            return
          }
        }
      } catch { /* fallback */ }
      if (!cancelled) { setData(dashboardData || mockData); setLoading(false) }
    }
    doFetch()
    return () => { cancelled = true }
  }, [user?.id])

  const d = data || mockData

  const metrics = [
    {
      title: 'Balance Actual',
      value: formatCurrency(d.balance),
      change: '+12.5%',
      trend: 'up' as const,
      icon: DollarSign,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    },
    {
      title: 'Ingresos Totales',
      value: formatCurrency(d.totalIncome),
      change: '+4.2%',
      trend: 'up' as const,
      icon: TrendingUp,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-500/10',
    },
    {
      title: 'Gastos Totales',
      value: formatCurrency(d.totalExpenses),
      change: '-2.1%',
      trend: 'down' as const,
      icon: TrendingDown,
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-500/10',
    },
    {
      title: 'Deudas Activas',
      value: formatCurrency(d.totalDebt),
      change: '3 debts',
      trend: 'neutral' as const,
      icon: CreditCard,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-500/10',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Overview of your financial health
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setLoading(true); setData(null) }} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 stagger-children">
        {metrics.map((m) => (
          <Card key={m.title} className="card-hover">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{m.title}</p>
                  <p className={cn('text-2xl font-bold tabular-nums', d.balance >= 0 && m.title === 'Balance Actual' ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground')}>
                    {m.value}
                  </p>
                </div>
                <div className={cn('p-2.5 rounded-xl', m.bg)}>
                  <m.icon className={cn('w-5 h-5', m.color)} />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2">
                {m.trend === 'up' && <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />}
                {m.trend === 'down' && <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />}
                <span className={cn('text-xs font-medium', m.trend === 'up' ? 'text-emerald-500' : m.trend === 'down' ? 'text-rose-500' : 'text-muted-foreground')}>
                  {m.change}
                </span>
                <span className="text-xs text-muted-foreground ml-1">vs last month</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
              <CardContent><Skeleton className="h-[280px] w-full" /></CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Cash Flow Chart */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Monthly Cash Flow</CardTitle>
                <CardDescription>Income vs Expenses over the last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={d.monthlyCashFlow} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                      <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
                      <RechartsTooltip content={ChartTooltip} />
                      <Legend />
                      <Area type="monotone" dataKey="income" name="Income" stroke="#10b981" fill="url(#incomeGrad)" strokeWidth={2} />
                      <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#f43f5e" fill="url(#expenseGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Expense Distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Expense Breakdown</CardTitle>
                <CardDescription>This month by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={d.expenseCategories || []}
                        cx="50%"
                        cy="45%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {(d.expenseCategories || []).map((entry, idx) => (
                          <Cell key={idx} fill={entry.color || CHART_COLORS[idx % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                    {d.expenseCategories.slice(0, 4).map((cat) => (
                      <div key={cat.name} className="flex items-center gap-2 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cat.color }} />
                        <span className="text-muted-foreground truncate">{cat.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Budget vs Actual */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Budget vs Actual (50/30/20 Rule)</CardTitle>
              <CardDescription>Comparing your planned budget with actual spending</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={d.budgetVsActual} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                    <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
                    <RechartsTooltip content={ChartTooltip} />
                    <Legend />
                    <Bar dataKey="planned" name="Planned" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32} />
                    <Bar dataKey="actual" name="Actual" fill="#06b6d4" radius={[4, 4, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Recent Transactions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
                <CardDescription>Your latest financial movements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                  {d.recentTransactions.map((tx) => (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                          tx.type === 'income'
                            ? 'bg-emerald-50 dark:bg-emerald-500/10'
                            : 'bg-rose-50 dark:bg-rose-500/10'
                        )}>
                          {tx.type === 'income'
                            ? <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                            : <ArrowDownRight className="w-4 h-4 text-rose-500" />
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{tx.description}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{format(new Date(tx.date), 'MMM d')}</span>
                            {tx.category && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] h-4 px-1.5"
                                style={{ backgroundColor: (tx.categoryColor || '#64748b') + '20', color: tx.categoryColor || '#64748b' }}
                              >
                                {tx.category}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className={cn(
                        'text-sm font-semibold tabular-nums shrink-0',
                        tx.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      )}>
                        {tx.amount >= 0 ? '+' : ''}{formatCurrency(Math.abs(tx.amount))}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Savings Progress */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Savings Goals</CardTitle>
                <CardDescription>Track your savings progress</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                  {d.savingsGoals.map((goal) => {
                    const pct = Math.min(100, Math.round((goal.saved / goal.target) * 100))
                    return (
                      <motion.div
                        key={goal.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <PiggyBank className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium text-foreground">{goal.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {pct}%
                          </span>
                        </div>
                        <Progress value={pct} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{formatCurrency(goal.saved)} saved</span>
                          <span>Goal: {formatCurrency(goal.target)}</span>
                        </div>
                        {goal.deadline && (
                          <p className="text-[11px] text-muted-foreground">
                            Deadline: {format(new Date(goal.deadline), 'MMM d, yyyy')}
                          </p>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}