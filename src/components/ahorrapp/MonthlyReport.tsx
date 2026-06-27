'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Image from 'next/image'
import {
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
  Printer, PiggyBank, CreditCard, ArrowUpRight,
  ArrowDownRight, Target, BarChart3,
  CircleAlert,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loading } from '@/components/ui/loading'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import {
  format, startOfMonth, endOfMonth, subMonths,
  parseISO, isWithinInterval, getYear, getMonth,
} from 'date-fns'
import { useFormatCurrency } from '@/lib/format-currency'

// --- Types ---

interface Category {
  id: string
  name: string
  icon: string
  color: string
  type: string
}

interface IncomeRecord {
  id: string
  source: string
  amount: number
  description: string | null
  date: string
  frequency: string
  category: Category | null
}

interface ExpenseRecord {
  id: string
  amount: number
  description: string
  date: string
  category: Category | null
  isRecurring: boolean
}

interface UnexpectedRecord {
  id: string
  amount: number
  description: string
  date: string
  category: Category | null
  resolved: boolean
}

interface SavingsGoal {
  id: string
  name: string
  targetAmount: number
  savedAmount: number
  icon: string
  color: string
  contributions: { id: string; amount: number; date: string; note: string | null }[]
}

interface Debt {
  id: string
  name: string
  totalAmount: number
  paidAmount: number
  payments: { id: string; amount: number; date: string; note: string | null }[]
}

interface MonthData {
  totalIncome: number
  totalExpenses: number
  netSavings: number
  savingsRate: number
  incomes: IncomeRecord[]
  expenses: (ExpenseRecord | UnexpectedRecord)[]
  savingsContributions: { goalName: string; goalColor: string; goalIcon: string; amount: number; date: string }[]
  debtPayments: { debtName: string; amount: number; date: string }[]
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function getGoalEmoji(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('travel') || n.includes('vacation') || n.includes('viaje')) return '✈️'
  if (n.includes('emergency') || n.includes('emergencia')) return '🛡️'
  if (n.includes('laptop') || n.includes('computer') || n.includes('tech')) return '💻'
  if (n.includes('car') || n.includes('auto') || n.includes('coche')) return '🚗'
  if (n.includes('house') || n.includes('home') || n.includes('casa')) return '🏠'
  if (n.includes('wedding') || n.includes('boda')) return '💍'
  if (n.includes('education') || n.includes('study') || n.includes('estudio')) return '🎓'
  return '💰'
}

// --- Component ---

const Delta = ({ current, previous }: { current: number; previous: number }) => {
  const diff = current - previous
  const pct = previous !== 0 ? ((diff / Math.abs(previous)) * 100) : (current > 0 ? 100 : 0)
  const isPositive = diff > 0
  const isZero = diff === 0

  if (isZero) return <span className="text-xs text-muted-foreground ml-2">— sin cambio</span>

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium ml-2',
        isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
      )}
    >
      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

export default function MonthlyReport() {
  const formatCurrency = useFormatCurrency()
  const { user } = useAppStore()
  const [loading, setLoading] = useState(true)

  // All data (we filter client-side per month)
  const [allIncomes, setAllIncomes] = useState<IncomeRecord[]>([])
  const [allExpenses, setAllExpenses] = useState<ExpenseRecord[]>([])
  const [allUnexpected, setAllUnexpected] = useState<UnexpectedRecord[]>([])
  const [allSavings, setAllSavings] = useState<SavingsGoal[]>([])
  const [allDebts, setAllDebts] = useState<Debt[]>([])

  // Selected month (0-indexed)
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(getYear(now))
  const [selectedMonth, setSelectedMonth] = useState(getMonth(now))

  const fetchData = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const [incomeRes, expenseRes, unexpectedRes, savingsRes, debtsRes] = await Promise.all([
        fetch(`/api/income?accountId=${user.id}`),
        fetch(`/api/expenses?accountId=${user.id}`),
        fetch(`/api/unexpected?accountId=${user.id}`),
        fetch(`/api/savings?accountId=${user.id}`),
        fetch(`/api/debts?accountId=${user.id}`),
      ])

      const incomeData = await incomeRes.json()
      const expenseData = await expenseRes.json()
      const unexpectedData = await unexpectedRes.json()
      const savingsData = await savingsRes.json()
      const debtsData = await debtsRes.json()

      const incomeList = Array.isArray(incomeData) ? incomeData : (incomeData.incomes || [])
      const expenseList = expenseData.expenses || []
      const unexpectedList = unexpectedData.unexpecteds || []
      const savingsGoals = savingsData.savingsGoals || []
      const debts = debtsData.debts || []

      setAllIncomes(incomeList as IncomeRecord[])
      setAllExpenses(expenseList as ExpenseRecord[])
      setAllUnexpected(unexpectedList as UnexpectedRecord[])
      setAllSavings(savingsGoals as SavingsGoal[])
      setAllDebts(debts as Debt[])
    } catch (err) {
      console.error('MonthlyReport fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => { fetchData() }, [fetchData])

  // Compute data for selected month
  const currentMonthData: MonthData = useMemo(() => {
    const monthStart = startOfMonth(new Date(selectedYear, selectedMonth))
    const monthEnd = endOfMonth(new Date(selectedYear, selectedMonth))

    const inRange = (dateStr: string) =>
      isWithinInterval(parseISO(dateStr), { start: monthStart, end: monthEnd })

    const monthIncomes = allIncomes.filter((i) => inRange(i.date))
    const monthExpenses = allExpenses.filter((e) => inRange(e.date))
    const monthUnexpected = allUnexpected.filter((u) => inRange(u.date))
    const allMonthOutflows = [...monthExpenses, ...monthUnexpected]

    const totalIncome = monthIncomes.reduce((s, i) => s + i.amount, 0)
    const totalExpenses = allMonthOutflows.reduce((s, e) => s + e.amount, 0)
    const netSavings = totalIncome - totalExpenses
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0

    // Savings contributions this month
    const savingsContributions: MonthData['savingsContributions'] = []
    for (const goal of allSavings) {
      for (const c of goal.contributions) {
        if (inRange(c.date)) {
          savingsContributions.push({
            goalName: goal.name,
            goalColor: goal.color,
            goalIcon: goal.icon,
            amount: c.amount,
            date: c.date,
          })
        }
      }
    }

    // Debt payments this month
    const debtPayments: MonthData['debtPayments'] = []
    for (const debt of allDebts) {
      for (const p of debt.payments) {
        if (inRange(p.date)) {
          debtPayments.push({
            debtName: debt.name,
            amount: p.amount,
            date: p.date,
          })
        }
      }
    }

    return {
      totalIncome,
      totalExpenses,
      netSavings,
      savingsRate,
      incomes: monthIncomes,
      expenses: allMonthOutflows,
      savingsContributions,
      debtPayments,
    }
  }, [allIncomes, allExpenses, allUnexpected, allSavings, allDebts, selectedYear, selectedMonth])

  // Previous month data for comparison
  const prevMonthData: MonthData = useMemo(() => {
    const pm = selectedMonth === 0 ? 11 : selectedMonth - 1
    const py = selectedMonth === 0 ? selectedYear - 1 : selectedYear
    const monthStart = startOfMonth(new Date(py, pm))
    const monthEnd = endOfMonth(new Date(py, pm))

    const inRange = (dateStr: string) =>
      isWithinInterval(parseISO(dateStr), { start: monthStart, end: monthEnd })

    const incomes = allIncomes.filter((i) => inRange(i.date))
    const expenses = allExpenses.filter((e) => inRange(e.date))
    const unexpected = allUnexpected.filter((u) => inRange(u.date))
    const allOutflows = [...expenses, ...unexpected]

    const totalIncome = incomes.reduce((s, i) => s + i.amount, 0)
    const totalExpenses = allOutflows.reduce((s, e) => s + e.amount, 0)
    const netSavings = totalIncome - totalExpenses
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0

    return { totalIncome, totalExpenses, netSavings, savingsRate, incomes, expenses: allOutflows, savingsContributions: [], debtPayments: [] }
  }, [allIncomes, allExpenses, allUnexpected, selectedYear, selectedMonth])

  // Expense breakdown by category
  const expenseByCategory = useMemo(() => {
    const map = new Map<string, { name: string; color: string; items: MonthData['expenses']; total: number }>()
    for (const e of currentMonthData.expenses) {
      const catName = e.category?.name || 'Sin categoría'
      const catColor = e.category?.color || '#94a3b8'
      if (!map.has(catName)) {
        map.set(catName, { name: catName, color: catColor, items: [], total: 0 })
      }
      const entry = map.get(catName)!
      entry.items.push(e)
      entry.total += e.amount
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [currentMonthData.expenses])

  // Top 5 expenses
  const top5Expenses = useMemo(() => {
    return [...currentMonthData.expenses]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
  }, [currentMonthData.expenses])

  // Navigation
  const goToPrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11)
      setSelectedYear((y) => y - 1)
    } else {
      setSelectedMonth((m) => m - 1)
    }
  }

  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0)
      setSelectedYear((y) => y + 1)
    } else {
      setSelectedMonth((m) => m + 1)
    }
  }

  const isCurrentMonth = selectedYear === getYear(now) && selectedMonth === getMonth(now)

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return <Loading />
  }

  return (
    <div className="space-y-6 monthly-report">
      {/* Header with Month Navigator */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div className="module-header">
          <h2 className="text-2xl font-bold text-foreground">Reporte Mensual</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Resumen financiero completo de un mes seleccionado
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 print:hidden">
          <Printer className="w-4 h-4" />
          Imprimir / Exportar
        </Button>
      </motion.div>

      {/* Month Navigator */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex items-center justify-center gap-4"
      >
        <Button variant="outline" size="icon" className="h-9 w-9 print:hidden" onClick={goToPrevMonth}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="text-center min-w-[200px]">
          <h3 className="text-xl font-bold text-foreground">
            {MONTH_NAMES[selectedMonth]} {selectedYear}
          </h3>
          {isCurrentMonth && (
            <Badge variant="secondary" className="mt-1 text-[10px]">Mes Actual</Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 print:hidden"
          onClick={goToNextMonth}
          disabled={isCurrentMonth}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </motion.div>

      {/* Key Metrics Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
      >
        <Card className="card-accent border-l-[3px] border-l-emerald-500" style={{ '--card-accent-from': '#10b981', '--card-accent-to': '#06b6d4' } as React.CSSProperties}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Ingresos Totales</span>
            </div>
            <p className="text-xl font-bold text-foreground">{formatCurrency(currentMonthData.totalIncome)}</p>
            <Delta current={currentMonthData.totalIncome} previous={prevMonthData.totalIncome} />
          </CardContent>
        </Card>

        <Card className="card-accent border-l-[3px] border-l-rose-500" style={{ '--card-accent-from': '#f43f5e', '--card-accent-to': '#fb7185' } as React.CSSProperties}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-500/15 flex items-center justify-center">
                <ArrowDownRight className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Gastos Totales</span>
            </div>
            <p className="text-xl font-bold text-foreground">{formatCurrency(currentMonthData.totalExpenses)}</p>
            <Delta current={currentMonthData.totalExpenses} previous={prevMonthData.totalExpenses} />
          </CardContent>
        </Card>

        <Card className="card-accent border-l-[3px] border-l-cyan-500" style={{ '--card-accent-from': '#06b6d4', '--card-accent-to': '#22d3ee' } as React.CSSProperties}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-500/15 flex items-center justify-center">
                <PiggyBank className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Ahorro Neto</span>
            </div>
            <p className={cn(
              'text-xl font-bold',
              currentMonthData.netSavings >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            )}>
              {formatCurrency(currentMonthData.netSavings)}
            </p>
            <Delta current={currentMonthData.netSavings} previous={prevMonthData.netSavings} />
          </CardContent>
        </Card>

        <Card className="card-accent border-l-[3px] border-l-violet-500" style={{ '--card-accent-from': '#8b5cf6', '--card-accent-to': '#a78bfa' } as React.CSSProperties}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center">
                <Target className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Tasa de Ahorro</span>
            </div>
            <p className="text-xl font-bold text-foreground">{currentMonthData.savingsRate.toFixed(1)}%</p>
            <Delta current={currentMonthData.savingsRate} previous={prevMonthData.savingsRate} />
          </CardContent>
        </Card>
      </motion.div>

      {/* Two-column layout: Income + Expense Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Income Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                Desglose de Ingresos
              </CardTitle>
              <CardDescription>
                {currentMonthData.incomes.length} registro{currentMonthData.incomes.length !== 1 ? 's' : ''} de ingreso este mes
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {currentMonthData.incomes.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="py-6 text-center"
                >
                  <Image src="/images/empty-state.png" alt="Sin ingresos" width={96} height={96} className="h-24 w-24 object-contain rounded-2xl mx-auto mb-3 opacity-80" />
                  <p className="text-sm text-muted-foreground">Sin ingresos este mes</p>
                </motion.div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fuente</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead className="text-right w-16">% del Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentMonthData.incomes.map((inc) => {
                      const pct = currentMonthData.totalIncome > 0
                        ? (inc.amount / currentMonthData.totalIncome) * 100
                        : 0
                      return (
                        <TableRow key={inc.id} className="table-row-interactive">
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium text-foreground capitalize">{inc.source}</p>
                              {inc.description && inc.description !== inc.source && (
                                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                  {inc.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(inc.amount)}
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {pct.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Expense Breakdown by Category */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-rose-100 dark:bg-rose-500/15 flex items-center justify-center">
                  <BarChart3 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                </div>
                Desglose de Gastos
              </CardTitle>
              <CardDescription>
                {expenseByCategory.length} categor{expenseByCategory.length !== 1 ? 'ías' : 'ía'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {expenseByCategory.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="py-6 text-center"
                >
                  <Image src="/images/empty-state.png" alt="Sin gastos" width={96} height={96} className="h-24 w-24 object-contain rounded-2xl mx-auto mb-3 opacity-80" />
                  <p className="text-sm text-muted-foreground">Sin gastos este mes</p>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  {expenseByCategory.map((cat) => {
                    const pct = currentMonthData.totalExpenses > 0
                      ? (cat.total / currentMonthData.totalExpenses) * 100
                      : 0
                    return (
                      <div key={cat.name}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: cat.color }}
                            />
                            <span className="text-sm font-medium text-foreground truncate">{cat.name}</span>
                            <Badge variant="secondary" className="text-[10px] shrink-0">
                              {cat.items.length} elemento{cat.items.length !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                              {formatCurrency(cat.total)}
                            </span>
                            <span className="text-xs text-muted-foreground w-12 text-right">
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        {/* Horizontal bar */}
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(pct, 100)}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                        </div>
                        {/* Individual items */}
                        <div className="mt-1.5 ml-5 space-y-0.5">
                          {cat.items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between text-xs text-muted-foreground"
                            >
                              <span className="truncate max-w-[200px]">{item.description}</span>
                              <span className="shrink-0 ml-2">{formatCurrency(item.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bottom Row: Savings + Debts + Top 5 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Savings Progress */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
                  <PiggyBank className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                Ahorros de Este Mes
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {currentMonthData.savingsContributions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Sin contribuciones de ahorro</p>
              ) : (
                <div className="space-y-3">
                  {(() => {
                    // Group by goal
                    const goalMap = new Map<string, { name: string; color: string; icon: string; total: number; count: number }>()
                    for (const c of currentMonthData.savingsContributions) {
                      if (!goalMap.has(c.goalName)) {
                        goalMap.set(c.goalName, {
                          name: c.goalName,
                          color: c.goalColor,
                          icon: c.goalIcon,
                          total: 0,
                          count: 0,
                        })
                      }
                      const g = goalMap.get(c.goalName)!
                      g.total += c.amount
                      g.count++
                    }
                    return Array.from(goalMap.values()).map((g) => (
                      <div
                        key={g.name}
                        className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30"
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                          style={{ backgroundColor: `${g.color}20` }}
                        >
                          {getGoalEmoji(g.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{g.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {g.count} contribución{g.count !== 1 ? 'es' : ''}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                          +{formatCurrency(g.total)}
                        </span>
                      </div>
                    ))
                  })()}
                  <div className="pt-2 border-t mt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total ahorrado</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(currentMonthData.savingsContributions.reduce((s, c) => s + c.amount, 0))}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Debt Payments */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center">
                  <CreditCard className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                </div>
                Pagos de Deudas
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {currentMonthData.debtPayments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Sin pagos de deudas</p>
              ) : (
                <div className="space-y-3">
                  {(() => {
                    const debtMap = new Map<string, { name: string; total: number; count: number }>()
                    for (const p of currentMonthData.debtPayments) {
                      if (!debtMap.has(p.debtName)) {
                        debtMap.set(p.debtName, { name: p.debtName, total: 0, count: 0 })
                      }
                      const d = debtMap.get(p.debtName)!
                      d.total += p.amount
                      d.count++
                    }
                    return Array.from(debtMap.values()).map((d) => (
                      <div
                        key={d.name}
                        className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30"
                      >
                        <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center shrink-0">
                          <CreditCard className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{d.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {d.count} pago{d.count !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-amber-600 dark:text-amber-400 shrink-0">
                          {formatCurrency(d.total)}
                        </span>
                      </div>
                    ))
                  })()}
                  <div className="pt-2 border-t mt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total pagado</span>
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        {formatCurrency(currentMonthData.debtPayments.reduce((s, p) => s + p.amount, 0))}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Top 5 Expenses */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-rose-100 dark:bg-rose-500/15 flex items-center justify-center">
                  <CircleAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                </div>
                Top 5 Gastos
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {top5Expenses.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Sin gastos este mes</p>
              ) : (
                <div className="space-y-2">
                  {top5Expenses.map((exp, idx) => (
                    <div
                      key={exp.id}
                      className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30"
                    >
                      <div className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                        idx < 3
                          ? 'bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400'
                          : 'bg-muted text-muted-foreground'
                      )}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{exp.description}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {exp.category && (
                            <>
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: exp.category.color }}
                              />
                              <span className="text-xs text-muted-foreground truncate">{exp.category.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-rose-600 dark:text-rose-400 shrink-0">
                        -{formatCurrency(exp.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}