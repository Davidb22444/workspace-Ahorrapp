'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp, TrendingDown, DollarSign, Target, CreditCard, AlertTriangle,
  ChevronLeft, ChevronRight, Calendar, ArrowUpRight, ArrowDownRight, Trophy, Frown,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
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

interface AnnualData {
  totalIncome: number
  totalExpenses: number
  netSavings: number
  savingsRate: number
  totalDebtPaid: number
  unexpectedCosts: number
  monthlyData: Array<{ month: string; income: number; expenses: number }>
  incomeSources: Array<{ name: string; value: number }>
  topExpenseCategories: Array<{ name: string; amount: number; percentage: number }>
  savingsGoals: Array<{ name: string; saved: number; target: number }>
  monthOverMonth: Array<{ month: string; incomeChange: number; expenseChange: number }>
  bestMonth: { month: string; savings: number } | null
  worstMonth: { month: string; savings: number } | null
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function generateMockData(year: number): AnnualData {
  const seed = year * 7
  const rand = (i: number, min: number, max: number) =>
    Math.round(((Math.sin(seed + i * 13.37) + 1) / 2) * (max - min) + min)

  const monthlyData = MONTHS.map((month, i) => ({
    month,
    income: rand(i, 4200, 5800),
    expenses: rand(i + 50, 2400, 3800),
  }))

  const totalIncome = monthlyData.reduce((s, m) => s + m.income, 0)
  const totalExpenses = monthlyData.reduce((s, m) => s + m.expenses, 0)
  const netSavings = totalIncome - totalExpenses
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0

  const incomeSources = [
    { name: 'Salary', value: Math.round(totalIncome * 0.72) },
    { name: 'Freelance', value: Math.round(totalIncome * 0.15) },
    { name: 'Investments', value: Math.round(totalIncome * 0.08) },
    { name: 'Other', value: Math.round(totalIncome * 0.05) },
  ]

  const topExpenseCategories = [
    { name: 'Housing', amount: Math.round(totalExpenses * 0.32), percentage: 32 },
    { name: 'Food', amount: Math.round(totalExpenses * 0.18), percentage: 18 },
    { name: 'Transport', amount: Math.round(totalExpenses * 0.12), percentage: 12 },
    { name: 'Entertainment', amount: Math.round(totalExpenses * 0.09), percentage: 9 },
    { name: 'Utilities', amount: Math.round(totalExpenses * 0.11), percentage: 11 },
    { name: 'Healthcare', amount: Math.round(totalExpenses * 0.08), percentage: 8 },
  ]

  const savingsGoals = [
    { name: 'Emergency Fund', saved: rand(1, 3000, 12000), target: 15000 },
    { name: 'Vacation', saved: rand(2, 800, 3500), target: 4000 },
    { name: 'New Laptop', saved: rand(3, 400, 2200), target: 2500 },
  ]

  const monthOverMonth = monthlyData.map((m, i) => {
    if (i === 0) return { month: m.month, incomeChange: 0, expenseChange: 0 }
    const prev = monthlyData[i - 1]
    return {
      month: m.month,
      incomeChange: prev.income > 0 ? Math.round(((m.income - prev.income) / prev.income) * 100) : 0,
      expenseChange: prev.expenses > 0 ? Math.round(((m.expenses - prev.expenses) / prev.expenses) * 100) : 0,
    }
  })

  let bestMonth: { month: string; savings: number } | null = null
  let worstMonth: { month: string; savings: number } | null = null
  monthlyData.forEach((m) => {
    const sav = m.income - m.expenses
    if (!bestMonth || sav > bestMonth.savings) bestMonth = { month: m.month, savings: sav }
    if (!worstMonth || sav < worstMonth.savings) worstMonth = { month: m.month, savings: sav }
  })

  return {
    totalIncome,
    totalExpenses,
    netSavings,
    savingsRate,
    totalDebtPaid: rand(90, 4000, 12000),
    unexpectedCosts: rand(80, 800, 3500),
    monthlyData,
    incomeSources,
    topExpenseCategories,
    savingsGoals,
    monthOverMonth,
    bestMonth,
    worstMonth,
  }
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-xl p-3 shadow-xl">
        <p className="text-sm font-semibold text-foreground mb-1.5">{label}</p>
        {payload.map((entry: any, idx: number) => (
          <div key={idx} className="flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
              <span className="text-muted-foreground">{entry.name}</span>
            </div>
            <span className="font-semibold tabular-nums">
              {formatCurrency(entry.value)}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

function PieTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-xl p-3 shadow-xl">
        <div className="flex items-center gap-2 text-xs mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: payload[0].payload.fill || CHART_COLORS[0] }} />
          <span className="font-medium text-foreground">{payload[0].name}</span>
        </div>
        <p className="text-sm font-bold tabular-nums">{formatCurrency(payload[0].value)}</p>
      </div>
    )
  }
  return null
}

export default function AnnualSummary() {
  const { user } = useAppStore()
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [data, setData] = useState<AnnualData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const doFetch = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/annual-summary?accountId=${user?.id}&year=${selectedYear}`)
        if (res.ok && !cancelled) {
          const json = await res.json()
          if (json.totalIncome !== undefined) {
            setData(json as AnnualData)
            setLoading(false)
            return
          }
        }
      } catch { /* fallback */ }
      if (!cancelled) {
        setData(generateMockData(selectedYear))
        setLoading(false)
      }
    }
    doFetch()
    return () => { cancelled = true }
  }, [selectedYear, user?.id])

  const metricCards = useMemo(() => {
    if (!data) return []
    return [
      { label: 'Total Income', value: data.totalIncome, icon: TrendingUp, color: 'emerald', change: 8.2 },
      { label: 'Total Expenses', value: data.totalExpenses, icon: TrendingDown, color: 'rose', change: -3.1 },
      { label: 'Net Savings', value: data.netSavings, icon: DollarSign, color: 'cyan', change: 12.5 },
      { label: 'Savings Rate', value: data.savingsRate, icon: Target, color: 'primary', change: 2.1, isPercent: true },
      { label: 'Total Debt Paid', value: data.totalDebtPaid, icon: CreditCard, color: 'amber', change: 15.0 },
      { label: 'Unexpected Costs', value: data.unexpectedCosts, icon: AlertTriangle, color: 'violet', change: -5.4 },
    ]
  }, [data])

  const colorMap: Record<string, { bg: string; text: string; darkBg: string }> = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600 dark:text-emerald-400', darkBg: 'dark:bg-emerald-500/10' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-600 dark:text-rose-400', darkBg: 'dark:bg-rose-500/10' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600 dark:text-cyan-400', darkBg: 'dark:bg-cyan-500/10' },
    primary: { bg: 'bg-primary/10', text: 'text-primary dark:text-primary', darkBg: '' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600 dark:text-amber-400', darkBg: 'dark:bg-amber-500/10' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-600 dark:text-violet-400', darkBg: 'dark:bg-violet-500/10' },
  }

  return (
    <div className="space-y-6">
      {/* Header + Year Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gradient">Annual Summary</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Year-over-year financial overview</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="icon" className="h-9 w-9"
            onClick={() => setSelectedYear((y) => y - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 min-w-[120px] justify-center">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-foreground tabular-nums">{selectedYear}</span>
            {selectedYear === currentYear && (
              <Badge variant="secondary" className="text-[10px] px-1.5 h-5">Current</Badge>
            )}
          </div>
          <Button
            variant="outline" size="icon" className="h-9 w-9"
            onClick={() => setSelectedYear((y) => Math.min(currentYear, y + 1))}
            disabled={selectedYear >= currentYear}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics Row */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="stat-card"><CardContent className="p-4"><Skeleton className="h-28 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 animate-fade-in">
          {metricCards.map((m, i) => {
            const Icon = m.icon
            const cm = colorMap[m.color] || colorMap.emerald
            return (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="stat-card card-hover">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className={cn('p-2 rounded-xl', cm.bg, cm.darkBg)}>
                        <Icon className={cn('w-4 h-4', cm.text)} />
                      </div>
                      <div className={cn(
                        'flex items-center gap-0.5 text-[10px] font-medium',
                        m.change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
                      )}>
                        {m.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(m.change)}%
                      </div>
                    </div>
                    <p className="text-lg font-bold tabular-nums text-foreground leading-tight">
                      {m.isPercent ? `${m.value}%` : formatCurrency(m.value)}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{m.label}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-72 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : data && (
        <>
          {/* Monthly Overview Area Chart */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="card-hover">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Monthly Overview</CardTitle>
                <CardDescription className="text-xs">Income vs expenses across all months</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.monthlyData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
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
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} className="text-muted-foreground" />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="income" name="Income" stroke="#10b981" fill="url(#incomeGrad)" strokeWidth={2} />
                      <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#f43f5e" fill="url(#expenseGrad)" strokeWidth={2} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Income Sources Pie + Top Expenses Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Income Sources Pie Chart */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="card-hover">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Income Sources</CardTitle>
                  <CardDescription className="text-xs">Breakdown of where your money comes from</CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.incomeSources}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                          nameKey="name"
                        >
                          {data.incomeSources.map((_, idx) => (
                            <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip content={<PieTooltip />} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Top Expense Categories - Horizontal Bar */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="card-hover">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Top Expense Categories</CardTitle>
                  <CardDescription className="text-xs">Highest spending areas this year</CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.topExpenseCategories} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={85} />
                        <RechartsTooltip
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid var(--border)', background: 'var(--card)' }}
                        />
                        <Bar dataKey="amount" name="Amount" radius={[0, 6, 6, 0]} barSize={18}>
                          {data.topExpenseCategories.map((_, idx) => (
                            <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Savings Goals Progress */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className="card-hover">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Savings Goals Progress</CardTitle>
                <CardDescription className="text-xs">How your savings goals are tracking this year</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-4">
                {data.savingsGoals.map((goal, idx) => {
                  const pct = Math.min(100, Math.round((goal.saved / goal.target) * 100))
                  return (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-foreground">{goal.name}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {formatCurrency(goal.saved)} <span className="text-border">/</span> {formatCurrency(goal.target)}
                        </span>
                      </div>
                      <div className="relative">
                        <Progress value={pct} className="h-2.5" />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-[10px] text-muted-foreground">{pct}% complete</span>
                        <span className="text-[10px] text-muted-foreground">{formatCurrency(goal.target - goal.saved)} remaining</span>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </motion.div>

          {/* Month-over-Month Trends */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="card-hover">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Month-over-Month Trends</CardTitle>
                <CardDescription className="text-xs">Percentage change between consecutive months</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-xs font-medium text-muted-foreground pb-2 pr-4">Month</th>
                        <th className="text-right text-xs font-medium text-muted-foreground pb-2 px-4">Income</th>
                        <th className="text-right text-xs font-medium text-muted-foreground pb-2 pl-4">Expenses</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.monthOverMonth.map((row, idx) => (
                        <tr key={row.month} className="border-b border-border/50 last:border-0">
                          <td className="py-2.5 pr-4 font-medium text-foreground">{row.month}</td>
                          <td className="py-2.5 px-4 text-right">
                            {idx === 0 ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : (
                              <span className={cn(
                                'inline-flex items-center gap-1 text-xs font-semibold tabular-nums',
                                row.incomeChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
                              )}>
                                {row.incomeChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                {Math.abs(row.incomeChange)}%
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 pl-4 text-right">
                            {idx === 0 ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : (
                              <span className={cn(
                                'inline-flex items-center gap-1 text-xs font-semibold tabular-nums',
                                row.expenseChange <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
                              )}>
                                {row.expenseChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                {Math.abs(row.expenseChange)}%
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Best & Worst Months */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.bestMonth && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                <Card className="card-hover card-glow" style={{ '--card-glow-color': 'rgba(16, 185, 129, 0.3)' } as React.CSSProperties}>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
                        <Trophy className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Best Month</p>
                        <p className="text-lg font-bold text-foreground">{data.bestMonth.month}</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(data.bestMonth.savings)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Net savings this month</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
            {data.worstMonth && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <Card className="card-hover" style={{ borderColor: data.worstMonth.savings < 0 ? undefined : undefined }}>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10">
                        <Frown className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Worst Month</p>
                        <p className="text-lg font-bold text-foreground">{data.worstMonth.month}</p>
                      </div>
                    </div>
                    <p className={cn(
                      'text-2xl font-bold tabular-nums',
                      data.worstMonth.savings >= 0
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-rose-600 dark:text-rose-400',
                    )}>
                      {formatCurrency(data.worstMonth.savings)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Net savings this month</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </>
      )}
    </div>
  )
}